/**
 * Zidly Backend — Phase 0 Minimal
 * الهدف: استقبال webhook سلة + خدمة صفحة الـ iframe من نفس السيرفر
 */

import Fastify from 'fastify'
import formbody from '@fastify/formbody'

const app = Fastify({ logger: true })

await app.register(formbody)

// ── المتجر في الـ memory (مؤقت لـ Phase 0) ───────────────────────
const merchants = new Map()


// ── صفحة الـ Dashboard — تُخدم داخل iframe سلة ──────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zidly Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; min-height: 100vh; }
    h1 { font-size: 1.4rem; color: #38bdf8; margin-bottom: 4px; }
    .sub { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .card h2 { font-size: 0.95rem; color: #94a3b8; margin-bottom: 10px; }
    .status { font-size: 1.1rem; font-weight: bold; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 14px; }
    .ready  { background:#14532d; border:1px solid #22c55e; color:#86efac; }
    .wait   { background:#1e3a5f; border:1px solid #3b82f6; color:#93c5fd; }
    .error  { background:#450a0a; border:1px solid #ef4444; color:#fca5a5; }
    .row { display:flex; gap:10px; padding:6px 0; border-bottom:1px solid #0f172a; font-size:.88rem; }
    .row:last-child { border-bottom:none; }
    .icon { min-width:22px; text-align:center; }
    .val  { color:#94a3b8; font-family:monospace; font-size:.8rem; margin-left:auto; }
    #log { background:#020617; border:1px solid #1e293b; border-radius:8px; padding:10px; font-family:monospace; font-size:.78rem; color:#64748b; max-height:160px; overflow-y:auto; }
    .lg{color:#4ade80} .lw{color:#facc15} .le{color:#f87171}
  </style>
</head>
<body>
  <h1>🧪 Zidly — TEST C</h1>
  <p class="sub">اختبار Embedded SDK من Railway Backend</p>
  <div id="sdk-status" class="status wait">⏳ جاري تهيئة SDK...</div>
  <div class="card">
    <h2>نتائج الفحوصات</h2>
    <div class="row"><span class="icon" id="r-env">⏳</span><span>البيئة</span><span class="val" id="v-env">—</span></div>
    <div class="row"><span class="icon" id="r-sdk">⏳</span><span>تحميل SDK</span><span class="val" id="v-sdk">—</span></div>
    <div class="row"><span class="icon" id="r-init">⏳</span><span>init() handshake</span><span class="val" id="v-init">—</span></div>
    <div class="row"><span class="icon" id="r-token">⏳</span><span>Access Token</span><span class="val" id="v-token">—</span></div>
    <div class="row"><span class="icon" id="r-merchant">⏳</span><span>Merchant Info</span><span class="val" id="v-merchant">—</span></div>
    <div class="row"><span class="icon" id="r-latency">⏳</span><span>CDN Latency</span><span class="val" id="v-latency">—</span></div>
  </div>
  <div class="card"><h2>Log</h2><div id="log"></div></div>

  <script>
    const $ = id => document.getElementById(id)
    const t0 = Date.now()
    function log(msg, cls='') {
      const el=$('log'), d=document.createElement('div')
      d.className=cls; d.textContent='['+( Date.now()-t0)+'ms] '+msg; el.prepend(d)
    }
    function set(id, icon, val, cls) {
      const colors={pass:'#4ade80',fail:'#f87171',wait:'#facc15'}
      $('r-'+id).textContent=icon; $('r-'+id).style.color=colors[cls]||'#94a3b8'
      if($('v-'+id)) $('v-'+id).textContent=val
    }
    function setStatus(txt,cls){ const el=$('sdk-status'); el.textContent=txt; el.className='status '+cls }

    const inIframe = window !== window.parent
    set('env', inIframe?'✅':'⚠️', inIframe?'داخل iframe سلة':'browser مباشر', inIframe?'pass':'wait')
    log('البيئة: '+(inIframe?'iframe':'browser مباشر'))

    window.addEventListener('message', e => {
      log('postMessage ← '+e.origin+' | '+(e.data?.event||JSON.stringify(e.data||{}).slice(0,30)), 'lg')
    })

    const t1=Date.now()
    log('جاري تحميل SDK من CDN...')
    const s=document.createElement('script')
    s.src='https://cdn.jsdelivr.net/npm/@salla.sa/embedded-sdk'
    s.onload=async()=>{
      const lat=Date.now()-t1
      set('latency','✅',lat+'ms',lat<500?'pass':'wait')
      log('SDK تحمّل في '+lat+'ms','lg')
      const sdk=window.SallaEmbeddedSDK
      if(!sdk){ set('sdk','❌','غير موجود في window','fail'); setStatus('❌ SDK غير موجود','error'); return }
      set('sdk','✅','v'+(sdk.version||'?'),'pass')
      log('SDK جاهز — استدعاء init()...','lg')
      setStatus('⏳ جاري handshake مع سلة...','wait')
      try {
        const result = await sdk.init({ debug: true })
        log('✅ init() نجح: '+JSON.stringify(result||{}),'lg')
        set('init','✅','handshake ناجح ✅','pass')
        setStatus('✅ TEST C نجح — الاتصال مع سلة مؤكد!','ready')
        try {
          const tok=sdk.getToken?.()
          tok ? set('token','✅',String(tok).slice(0,25)+'…','pass')
              : set('token','⚠️','Easy Mode (webhook)','wait')
        } catch(e){ set('token','⚠️',e.message,'wait') }
        try {
          const m=sdk.getMerchant?.()
          m ? set('merchant','✅',JSON.stringify(m).slice(0,40),'pass')
            : set('merchant','⚠️','غير متاح مباشرة','wait')
        } catch(e){ set('merchant','⚠️',e.message,'wait') }
      } catch(err){
        set('init','❌',err.message||'timeout','fail')
        setStatus('❌ init() فشل: '+err.message,'error')
        log('init() error: '+(err.message||err),'le')
        set('token','—','N/A',''); set('merchant','—','N/A','')
      }
    }
    s.onerror=()=>{ set('sdk','❌','فشل CDN','fail'); setStatus('❌ فشل تحميل SDK','error') }
    document.head.appendChild(s)
  </script>
</body>
</html>`

// ── Dashboard Route — يُخدم داخل iframe سلة ──────────────────────
app.get('/dashboard', async (request, reply) => {
  reply
    .header('Content-Type', 'text/html; charset=utf-8')
    .header('X-Frame-Options', 'ALLOWALL')
    .header('Content-Security-Policy', "frame-ancestors 'self' https://s.salla.sa https://*.salla.sa https://*.salla.group")
  return reply.send(DASHBOARD_HTML)
})

// ── Health Check ──────────────────────────────────────────────────
app.get('/', async (request, reply) => {
  return { status:'ok', app:'Zidly', phase:'0', merchants_count:merchants.size, timestamp:new Date().toISOString() }
})

app.get('/health', async (request, reply) => {
  return { status: 'ok' }
})


// ── Webhook من سلة ───────────────────────────────────────────────
app.post('/webhook', async (request, reply) => {
  const body = request.body
  // سلة ترسل event في body.event (وليس في header)
  const eventName = request.headers['x-salla-event'] || body?.event

  app.log.info({ eventName, body }, '📨 Webhook received')

  if (eventName === 'app.store.authorize') {
    // البنية الحقيقية: body.merchant + body.data.access_token
    const merchantId   = body.merchant
    const accessToken  = body.data?.access_token
    const refreshToken = body.data?.refresh_token

    if (!merchantId || !accessToken) {
      app.log.warn({ body }, '⚠️ Missing merchant or token')
      return reply.status(200).send({ received: true })
    }

    merchants.set(String(merchantId), {
      access_token:  accessToken,
      refresh_token: refreshToken,
      installed_at:  new Date().toISOString()
    })

    app.log.info(`✅ Merchant saved: ${merchantId}`)
    return reply.status(200).send({ success: true })
  }

  app.log.info({ eventName }, '📋 Unhandled event')
  return reply.status(200).send({ received: true })
})


// ── قائمة المتاجر (للاختبار) ─────────────────────────────────────
app.get('/merchants', async (request, reply) => {
  const list = []
  for (const [id, data] of merchants.entries()) {
    list.push({ merchant_id: id, installed_at: data.installed_at, has_token: !!data.access_token })
  }
  return { count: list.length, merchants: list }
})


// ── تشغيل السيرفر ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
try {
  await app.listen({ port: Number(PORT), host: '0.0.0.0' })
  console.log(`🚀 Zidly backend on port ${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
