/**
 * Zidly Backend — Phase 0 Minimal
 * الهدف: استقبال webhook سلة وتأكيد التثبيت
 * لا DB، لا Redis — فقط memory لإثبات الجدوى
 */

import Fastify from 'fastify'
import formbody from '@fastify/formbody'

const app = Fastify({
  logger: true  // يطبع كل request في Railway logs
})

// دعم application/x-www-form-urlencoded (سلة ترسل بهذا الشكل أحياناً)
await app.register(formbody)

// ── المتجر في الـ memory (مؤقت لـ Phase 0 فقط) ──────────────────
// في Phase 1 سيتحول لـ Postgres + Prisma
const merchants = new Map()
// merchants = { merchant_id: { access_token, store_id, installed_at } }


// ── Health Check ─────────────────────────────────────────────────
app.get('/', async (request, reply) => {
  return {
    status: 'ok',
    app: 'Zidly',
    phase: '0 - Minimal Backend',
    merchants_count: merchants.size,
    timestamp: new Date().toISOString()
  }
})

app.get('/health', async (request, reply) => {
  return { status: 'ok' }
})


// ── Webhook من سلة ───────────────────────────────────────────────
// سلة ترسل POST لهذا الـ endpoint عند:
// - تثبيت التطبيق (app.store.authorize)
// - تحديث التوكن (app.store.authorize مجدداً)
app.post('/webhook', async (request, reply) => {
  const event  = request.headers['x-salla-event']
  const body   = request.body

  app.log.info({ event, body }, '📨 Webhook received')

  // ── الحدث الأهم: تثبيت التطبيق ──────────────────────────────
  if (event === 'app.store.authorize') {
    const { merchant_id, access_token, store } = body

    if (!merchant_id || !access_token) {
      app.log.warn('Missing merchant_id or access_token')
      return reply.status(400).send({ error: 'Missing required fields' })
    }

    // احفظ بيانات المتجر في الـ memory
    merchants.set(String(merchant_id), {
      access_token,
      store_id:    store?.id || merchant_id,
      store_name:  store?.name || 'Unknown',
      installed_at: new Date().toISOString()
    })

    app.log.info(
      { merchant_id, store_name: store?.name },
      `✅ Merchant authorized: ${merchant_id}`
    )

    // سلة تتوقع 200 OK — أي رد آخر = retry
    return reply.status(200).send({ success: true })
  }

  // ── باقي الأحداث: نستقبلها ونسجلها بدون معالجة الآن ──────────
  app.log.info({ event }, '📋 Unhandled event (logged only)')
  return reply.status(200).send({ received: true })
})


// ── مسار للتحقق من merchants المثبتين (للاختبار فقط) ────────────
app.get('/merchants', async (request, reply) => {
  const list = []
  for (const [id, data] of merchants.entries()) {
    list.push({
      merchant_id: id,
      store_name:  data.store_name,
      installed_at: data.installed_at,
      // لا نعرض الـ token لأسباب أمنية حتى في الاختبار
      has_token:   !!data.access_token
    })
  }
  return { count: list.length, merchants: list }
})


// ── تشغيل السيرفر ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
const HOST = '0.0.0.0'  // مهم على Railway — لا تستخدم localhost

try {
  await app.listen({ port: Number(PORT), host: HOST })
  console.log(`🚀 Zidly backend running on port ${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
