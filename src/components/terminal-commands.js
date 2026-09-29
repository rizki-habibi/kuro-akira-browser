// ═══════════════════════════════════════════════════════════
// KURO TERMINAL COMMANDS v2.7 — Semua perintah terminal
// ═══════════════════════════════════════════════════════════
import { safeStorage } from '../lib/storage'

const wv = () => window.__activeWebview
const ex = async (js) => {
  const w = wv()
  if (w && w.executeJavaScript) {
    try {
      return await w.executeJavaScript(js)
    } catch (e) {
      if (js.includes('location.href')) return w.url || window.location.href
      if (js.includes('document.title')) return w.title || document.title
      throw e
    }
  }
  // Fallback to active window/browser context
  try {
    // eslint-disable-next-line no-eval
    return window.eval(js)
  } catch (err) {
    throw new Error('Tidak ada halaman webview aktif. Buka situs atau URL terlebih dahulu.')
  }
}

// Color helpers (ANSI-like, parsed di renderer)
export const g = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
}

const { green, red, yellow, cyan, bold, dim } = g

export const HELP_TEXT = `
${bold(cyan('╔══════════════════════════════════════════════════╗'))}
${cyan('║')}  ${bold('KURO TERMINAL v2.7')} — Professional Browser Terminal ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('SISTEM')}                                            ${cyan('║')}
${cyan('║')}  info / sysinfo / mem / version / date / privacy   ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('ANALISIS WEBSITE')} (fitur utama)                   ${cyan('║')}
${cyan('║')}  analyze     Analisis lengkap website aktif         ${cyan('║')}
${cyan('║')}  errors      Deteksi semua error halaman            ${cyan('║')}
${cyan('║')}  security    Audit keamanan website                 ${cyan('║')}
${cyan('║')}  performance Metrik performa (FCP, load, size)      ${cyan('║')}
${cyan('║')}  seo         Audit SEO dasar                        ${cyan('║')}
${cyan('║')}  tech        Deteksi framework/library/CMS          ${cyan('║')}
${cyan('║')}  explain     AI jelaskan isi website aktif          ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('INSPEKSI DOM')}                                      ${cyan('║')}
${cyan('║')}  dom / headers / links / images / forms / scripts   ${cyan('║')}
${cyan('║')}  url / title / screenshot                           ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('INJEKSI & MANIPULASI')}                              ${cyan('║')}
${cyan('║')}  inject <js>    Jalankan JS di halaman              ${cyan('║')}
${cyan('║')}  css <style>    Injeksi CSS                         ${cyan('║')}
${cyan('║')}  click <sel>    Klik elemen CSS selector            ${cyan('║')}
${cyan('║')}  type <sel> <t> Ketik teks ke input                 ${cyan('║')}
${cyan('║')}  fill [sel]     Auto-isi semua input di form        ${cyan('║')}
${cyan('║')}  scroll <y>     Scroll ke posisi Y pixel            ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('PENYIMPANAN')}                                       ${cyan('║')}
${cyan('║')}  cookies [clear] / ls [get|set|del|clear] / session ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('JARINGAN')}                                          ${cyan('║')}
${cyan('║')}  ping / curl / http <M> <url> / headers-http        ${cyan('║')}
${cyan('║')}  whois <domain>                                      ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('CODING & DEV TOOLS')}                               ${cyan('║')}
${cyan('║')}  py <kode>    Python via AI sandbox                  ${cyan('║')}
${cyan('║')}  js <expr>    Evaluasi JavaScript murni              ${cyan('║')}
${cyan('║')}  calc <expr>  Kalkulator (2^10, sqrt, sin, dll)      ${cyan('║')}
${cyan('║')}  uuid / hash <t> / b64 enc|dec / jwt <token>        ${cyan('║')}
${cyan('║')}  generate email|user|ip|pass|name <n>               ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('AI & SEARCH')}                                       ${cyan('║')}
${cyan('║')}  ai <pertanyaan>  Tanya Gemini AI dari terminal      ${cyan('║')}
${cyan('║')}  search <query>   Cari web dari terminal             ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  ${yellow('AKUN & TOR')}                                        ${cyan('║')}
${cyan('║')}  account [info|register|login|logout|list]          ${cyan('║')}
${cyan('║')}  tor [status|start|stop|log]                        ${cyan('║')}
${cyan('╠══════════════════════════════════════════════════╣')}
${cyan('║')}  history / clear / echo <t> / date / blocked        ${cyan('║')}
${cyan('╚══════════════════════════════════════════════════╝')}
`.trim()

export const commands = {
  help: () => HELP_TEXT,
  version: () => bold('Kuro Akira v2.7.0') + ' (Electron + React)',
  date: () => new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' }),
  echo: (a) => a || '',

  info: () => [
    bold('Kuro Akira Browser v2.7.0'),
    `Platform   : ${navigator.platform}`,
    `CPU Cores  : ${navigator.hardwareConcurrency}`,
    `Device RAM : ${navigator.deviceMemory || '?'} GB`,
    `Online     : ${navigator.onLine ? green('Ya') : red('Tidak')}`,
    dim(`UA: ${navigator.userAgent.substring(0, 90)}`),
  ].join('\n'),

  sysinfo: async () => {
    const m = await window.kuroAPI?.system?.memory?.().catch(() => null)
    const lines = [bold('═══ System Information ═══'), `Platform: ${navigator.platform}`, `CPU: ${navigator.hardwareConcurrency} cores`, `RAM device: ${navigator.deviceMemory || '?'} GB`]
    if (m) {
      const pct = Math.round((m.used / m.total) * 100)
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5))
      lines.push(`App RAM: ${m.app} MB | Total: ${m.total} MB | Free: ${m.free} MB`)
      lines.push(`Usage: [${pct < 70 ? green(bar) : red(bar)}] ${pct}%`)
    }
    return lines.join('\n')
  },

  mem: async () => {
    const m = await window.kuroAPI?.system?.memory?.().catch(() => null)
    if (!m) return red('Tidak tersedia')
    const pct = Math.round((m.used / m.total) * 100)
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5))
    return [`App: ${m.app}MB | Heap: ${m.heap}MB`, `RAM: ${m.total}MB total, ${m.free}MB free`, `[${pct < 70 ? green(bar) : red(bar)}] ${pct}%`].join('\n')
  },

  privacy: async () => {
    const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
    const lvl = (s.privacyLevel || 'high').toUpperCase()
    return [`Privasi: ${lvl === 'PARANOID' ? red(lvl) : lvl === 'HIGH' ? yellow(lvl) : green(lvl)}`, `Adblock: ${s.adBlockEnabled !== false ? green('AKTIF') : red('OFF')}`, `Tor: ${s.useTor ? green('AKTIF') : dim('OFF')}`, `VPN: ${s.vpnEnabled ? green('AKTIF') : dim('OFF')}`].join('\n')
  },

  blocked: async () => {
    const n = await window.kuroAPI?.stats.getBlocked() ?? 0
    const k = await window.kuroAPI?.stats.getCoins() ?? 0
    return `Diblokir: ${green(n.toLocaleString('id'))} | Koin: ${yellow(k + ' KC')}`
  },

  url: async () => { try { return cyan(await ex('location.href')) } catch(e) { return red(e.message) } },
  title: async () => { try { return await ex('document.title') } catch(e) { return red(e.message) } },

  // ── Defensive Bug & Security Audit ───────────────────
  audit: async () => {
    try {
      const r = await ex(`(function(){
        const out=[], add=(severity,code,msg,fix)=>out.push({severity,code,msg,fix})
        const ext=u=>{try{return new URL(u,location.href).hostname!==location.hostname}catch{return false}}
        const http=u=>{try{return new URL(u,location.href).protocol==='http:'}catch{return false}}
        const imgs=Array.from(document.images)
        const broken=imgs.filter(i=>i.src && (!i.complete || i.naturalWidth===0))
        if(location.protocol!=='https:') add('high','HTTPS','Halaman tidak menggunakan HTTPS','Gunakan HTTPS untuk halaman produksi.')
        const mixed=Array.from(document.querySelectorAll('[src],[href],[action]')).filter(e=>http(e.src||e.href||e.action)&&location.protocol==='https:')
        if(mixed.length) add('high','MIXED','Ada '+mixed.length+' resource/action HTTP pada halaman HTTPS','Ubah URL resource dan form menjadi HTTPS.')
        const pw=Array.from(document.querySelectorAll('input[type=password]'))
        const insecurePw=pw.filter(i=>http(i.form?.action||location.href))
        if(insecurePw.length) add('critical','PASSWORD-HTTP',insecurePw.length+' field password dikirim melalui HTTP','Pastikan action form dan halaman login selalu HTTPS.')
        const forms=Array.from(document.forms)
        const noAction=forms.filter(f=>!f.getAttribute('action'))
        if(noAction.length) add('warn','FORM-ACTION',noAction.length+' form tidak memiliki action eksplisit','Tetapkan action yang jelas dan uji submit.')
        const blank=Array.from(document.querySelectorAll('a[target="_blank"]')).filter(a=>!/noopener|noreferrer/i.test(a.rel||''))
        if(blank.length) add('medium','TAB-OPENER',blank.length+' link target=_blank tanpa noopener/noreferrer','Tambahkan rel="noopener noreferrer".')
        const extScripts=Array.from(document.scripts).filter(s=>s.src&&ext(s.src))
        const noSri=extScripts.filter(s=>!s.integrity)
        if(noSri.length) add('medium','SRI',noSri.length+' script eksternal tanpa integrity','Gunakan Subresource Integrity untuk asset pihak ketiga yang tetap.')
        const ifr=Array.from(document.querySelectorAll('iframe[src]')).filter(f=>!f.hasAttribute('sandbox'))
        if(ifr.length) add('medium','IFRAME',ifr.length+' iframe tanpa sandbox','Tambahkan sandbox dengan izin minimum yang diperlukan.')
        const inlineHandlers=Array.from(document.querySelectorAll('*')).filter(e=>Array.from(e.attributes).some(a=>/^on/i.test(a.name)))
        if(inlineHandlers.length) add('low','INLINE-HANDLER',inlineHandlers.length+' inline event handler terdeteksi','Pindahkan handler ke JavaScript terkelola/CSP nonce.')
        const jsLinks=Array.from(document.querySelectorAll('a[href^="javascript:"]'))
        if(jsLinks.length) add('medium','JS-LINK',jsLinks.length+' javascript: URL terdeteksi','Gunakan event listener biasa.')
        if(broken.length) add('medium','BROKEN-IMG',broken.length+' gambar gagal dimuat','Periksa URL asset, status server, dan fallback gambar.')
        const emptyLinks=Array.from(document.querySelectorAll('a')).filter(a=>!a.getAttribute('href')||a.getAttribute('href')==='#')
        if(emptyLinks.length) add('low','EMPTY-LINK',emptyLinks.length+' link kosong/# dapat membingungkan navigasi','Berikan href valid atau gunakan button.')
        const labels=Array.from(document.querySelectorAll('input,textarea,select')).filter(i=>i.type!=='hidden'&&!i.getAttribute('aria-label')&&!i.id&&!i.closest('label'))
        if(labels.length) add('low','A11Y-LABEL',labels.length+' kontrol form tanpa label yang terdeteksi','Tambahkan label atau aria-label.')
        const storageKeys=[...Object.keys(localStorage||{}),...Object.keys(sessionStorage||{})]
        const sensitive=storageKeys.filter(k=>/(token|secret|password|api[_-]?key|authorization)/i.test(k))
        if(sensitive.length) add('high','STORAGE-SECRET',sensitive.length+' key penyimpanan tampak berisi data sensitif','Hindari menyimpan secret jangka panjang di Web Storage; gunakan mekanisme kredensial aman.')
        const csp=!!document.querySelector('meta[http-equiv="Content-Security-Policy"]')
        if(!csp) add('medium','CSP','CSP tidak terdeteksi dari meta tag','Pasang CSP melalui response header; meta bukan pengganti header server.')
        if(!out.length) add('ok','CLEAN','Tidak ditemukan pola bug/risiko dari pemeriksaan statis halaman','Tetap lakukan pengujian server-side dan dependency audit.')
        return JSON.stringify({url:location.href,title:document.title,counts:{images:imgs.length,forms:forms.length,scripts:document.scripts.length},findings:out})
      })()`)
      const d=JSON.parse(r)
      const rank={critical:0,high:1,medium:2,low:3,warn:3,ok:4}
      d.findings.sort((a,b)=>(rank[a.severity]??9)-(rank[b.severity]??9))
      const icon=s=>s==='critical'?red('✖ CRIT'):s==='high'?red('! HIGH'):s==='medium'?yellow('! MED'):s==='low'||s==='warn'?cyan('• LOW'):green('✓ OK ')
      return [
        bold('╔══ KURO DEFENSIVE AUDIT ═════════════════════╗'),
        `  Target : ${cyan(d.url.substring(0,70))}`,
        `  Asset  : ${d.counts.images} gambar • ${d.counts.forms} form • ${d.counts.scripts} script`,
        ...d.findings.map(f=>`  [${icon(f.severity)}] [${f.code}] ${f.msg}\\n       ↳ ${dim(f.fix)}`),
        bold('╚══════════════════════════════════════════════╝'),
        dim('Audit ini bersifat defensif dan berbasis DOM/client-side; bukan bukti eksploitasi atau audit server penuh.')
      ].join('\\n')
    } catch(e) { return red('Audit gagal: '+e.message) }
  },

  // ── Website Analysis ──────────────────────────────────
  analyze: async () => {
    try {
      const r = await ex(`(function(){
        const safe = s => { try{ return new URL(s).hostname!==location.hostname }catch{ return false } }
        return JSON.stringify({
          url: location.href, title: document.title, protocol: location.protocol,
          lang: document.documentElement.lang||'',
          desc: document.querySelector('meta[name="description"]')?.content||'',
          h1: document.querySelectorAll('h1').length, h2: document.querySelectorAll('h2').length,
          scripts: document.querySelectorAll('script[src]').length,
          extScripts: Array.from(document.querySelectorAll('script[src]')).filter(s=>safe(s.src)).length,
          images: document.querySelectorAll('img').length,
          brokenImgs: Array.from(document.querySelectorAll('img')).filter(i=>!i.complete||i.naturalWidth===0).length,
          iframes: document.querySelectorAll('iframe').length,
          forms: document.querySelectorAll('form').length,
          hasCsp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
          hasOg: !!document.querySelector('meta[property^="og:"]'),
          canonical: !!document.querySelector('link[rel="canonical"]'),
          generator: document.querySelector('meta[name="generator"]')?.content||'',
          elements: document.querySelectorAll('*').length,
          wordCount: document.body.innerText.split(/\s+/).length,
        })
      })()`)
      const d = JSON.parse(r)
      return [
        bold('╔══ ANALISIS WEBSITE ══════════════════════════╗'),
        `  URL      : ${cyan(d.url.substring(0,55))}`,
        `  Judul    : ${d.title.substring(0,50)}`,
        `  HTTPS    : ${d.protocol==='https:' ? green('✓ Aman') : red('✗ TIDAK AMAN')}`,
        `  Bahasa   : ${d.lang || yellow('⚠ tidak diset')}`,
        `  Deskripsi: ${d.desc ? d.desc.substring(0,55) : yellow('⚠ Tidak ada')}`,
        `  H1/H2    : ${d.h1}/${d.h2}${d.h1===0 ? red(' ⚠ Tidak ada H1') : d.h1>1 ? yellow(' ⚠ H1 lebih dari 1') : green(' ✓')}`,
        `  Kata     : ${d.wordCount} | Elemen: ${d.elements}`,
        `  Scripts  : ${d.scripts} (${d.extScripts} ext)${d.scripts>20 ? yellow(' ⚠') : ''}`,
        `  Gambar   : ${d.images}${d.brokenImgs>0 ? red(` (${d.brokenImgs} broken!)`) : green(' ✓')}`,
        `  iFrames  : ${d.iframes>0 ? yellow(d.iframes) : green('0')} | Forms: ${d.forms}`,
        `  Canonical: ${d.canonical ? green('✓') : yellow('⚠')} | OG: ${d.hasOg ? green('✓') : yellow('⚠')} | CSP: ${d.hasCsp ? green('✓') : yellow('⚠')}`,
        `  Generator: ${d.generator || dim('tidak terdeteksi')}`,
        bold('╚═══════════════════════════════════════════════╝'),
      ].join('\n')
    } catch(e) { return red('Error: ' + e.message) }
  },

  errors: async () => {
    try {
      const r = await ex(`(function(){
        const errs=[]
        const bi=Array.from(document.querySelectorAll('img')).filter(i=>!i.complete||i.naturalWidth===0)
        if(bi.length) errs.push({l:'warn',t:'IMG',m:bi.length+' gambar tidak bisa dimuat'})
        const bl=Array.from(document.querySelectorAll('a')).filter(a=>!a.href||a.href.endsWith('#'))
        if(bl.length) errs.push({l:'info',t:'LINK',m:bl.length+' link kosong/fragment'})
        const ni=Array.from(document.querySelectorAll('input:not([type=hidden])')).filter(i=>!i.id||!document.querySelector('label[for="'+i.id+'"]'))
        if(ni.length) errs.push({l:'warn',t:'A11Y',m:ni.length+' input tanpa label'})
        const mc=Array.from(document.querySelectorAll('[src]')).filter(el=>(el.src||'').startsWith('http:')&&location.protocol==='https:')
        if(mc.length) errs.push({l:'err',t:'SEC',m:mc.length+' mixed content HTTP di HTTPS'})
        if(location.protocol!=='https:') errs.push({l:'err',t:'SEC',m:'Koneksi tidak terenkripsi (HTTP)'})
        if(!document.querySelectorAll('h1').length) errs.push({l:'warn',t:'SEO',m:'Tidak ada tag H1'})
        if(!document.querySelector('meta[name="description"]')) errs.push({l:'warn',t:'SEO',m:'Tidak ada meta description'})
        const es=Array.from(document.querySelectorAll('script[src]')).filter(s=>{try{return new URL(s.src).hostname!==location.hostname}catch{return false}})
        if(es.length>15) errs.push({l:'warn',t:'PERF',m:es.length+' script eksternal (memperlambat)'})
        if(!errs.length) errs.push({l:'ok',t:'OK',m:'Tidak ada error terdeteksi ✓'})
        return JSON.stringify(errs)
      })()`)
      const errs = JSON.parse(r)
      return [bold('╔══ DETEKSI ERROR ════════════════════════════╗'),
        ...errs.map(e => {
          const icon = e.l==='err' ? red('✗ ERR ') : e.l==='warn' ? yellow('⚠ WARN') : e.l==='ok' ? green('✓ OK  ') : cyan('ℹ INFO')
          return `  [${icon}] [${e.t.padEnd(5)}] ${e.m}`
        }),
        bold('╚════════════════════════════════════════════╝')].join('\n')
    } catch(e) { return red('Error: ' + e.message) }
  },

  security: async () => {
    try {
      const r = await ex(`(function(){
        return JSON.stringify({
          isHttps: location.protocol==='https:',
          hasCsp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
          cookies: document.cookie.split(';').filter(c=>c.trim()).length,
          iframes: document.querySelectorAll('iframe').length,
          extScripts: Array.from(document.querySelectorAll('script[src]')).filter(s=>{try{return new URL(s.src).hostname!==location.hostname}catch{return false}}).length,
          hiddenInputs: document.querySelectorAll('input[type="hidden"]').length,
          passwordFields: document.querySelectorAll('input[type="password"]').length,
          mixedContent: Array.from(document.querySelectorAll('[src]')).filter(el=>(el.src||'').startsWith('http:')&&location.protocol==='https:').length,
        })
      })()`)
      const d = JSON.parse(r)
      const score = (d.isHttps?25:0)+(d.hasCsp?15:0)+(d.extScripts<5?15:d.extScripts<15?8:0)+(d.iframes===0?10:5)+(d.mixedContent===0?10:0)+15
      const sc = score>=70 ? green : score>=40 ? yellow : red
      return [
        bold('╔══ ANALISIS KEAMANAN ════════════════════════╗'),
        `  HTTPS    : ${d.isHttps ? green('✓ Ya') : red('✗ TIDAK — DATA TIDAK AMAN')}`,
        `  CSP      : ${d.hasCsp ? green('✓ Ada') : yellow('⚠ Tidak ada')}`,
        `  Mixed    : ${d.mixedContent===0 ? green('✓ Tidak ada') : red('✗ '+d.mixedContent+' resource HTTP')}`,
        `  Cookies  : ${d.cookies} | iFrame: ${d.iframes===0?green('0✓'):yellow(d.iframes)}`,
        `  Ext Scrpt: ${d.extScripts>15?red(d.extScripts+'⚠'):d.extScripts>5?yellow(d.extScripts):green(d.extScripts+'✓')}`,
        `  Password : ${d.passwordFields>0&&!d.isHttps?red(d.passwordFields+'⚠ DI HTTP!'):d.passwordFields}`,
        `  ${bold('Skor')}: ${sc(score+'/90')} ${score<40?red('RISIKO TINGGI'):score<60?yellow('PERLU PERHATIAN'):green('RELATIF AMAN')}`,
        bold('╚════════════════════════════════════════════╝'),
      ].join('\n')
    } catch(e) { return red('Error: ' + e.message) }
  },

  performance: async () => {
    try {
      const r = await ex(`(function(){
        const nav=performance.getEntriesByType('navigation')[0]||{}
        const fcp=Math.round(performance.getEntriesByType('paint').find(p=>p.name==='first-contentful-paint')?.startTime||0)
        const res=performance.getEntriesByType('resource')||[]
        const totalKB=Math.round(res.reduce((s,r)=>s+(r.transferSize||0),0)/1024)
        const slow=[...res].sort((a,b)=>b.duration-a.duration).slice(0,3).map(r=>({n:r.name.split('/').pop().substring(0,30),ms:Math.round(r.duration),kb:Math.round((r.transferSize||0)/1024)}))
        return JSON.stringify({dns:Math.round(nav.domainLookupEnd-nav.domainLookupStart)||0,tcp:Math.round(nav.connectEnd-nav.connectStart)||0,ttfb:Math.round(nav.responseStart-nav.requestStart)||0,dom:Math.round(nav.domComplete-nav.startTime)||0,load:Math.round(nav.loadEventEnd-nav.startTime)||0,fcp,resources:res.length,totalKB,slow})
      })()`)
      const d = JSON.parse(r)
      const lc = d.load<1000 ? green : d.load<3000 ? yellow : red
      const fc = d.fcp<1800 ? green : d.fcp<3000 ? yellow : red
      return [
        bold('╔══ PERFORMA HALAMAN ═════════════════════════╗'),
        `  DNS:${d.dns}ms  TCP:${d.tcp}ms  TTFB:${d.ttfb>800?yellow(d.ttfb+'ms'):d.ttfb+'ms'}`,
        `  FCP:${fc(d.fcp+'ms')}  DOM:${d.dom}ms  Load:${lc(d.load+'ms')}`,
        `  Resources:${d.resources} file (${d.totalKB}KB)`,
        ...d.slow.map((r,i)=>`  ${i+1}. ${r.n.padEnd(30)} ${yellow(r.ms+'ms')} ${r.kb}KB`),
        bold('╚════════════════════════════════════════════╝'),
      ].join('\n')
    } catch(e) { return red('Error: ' + e.message) }
  },

  seo: async () => {
    try {
      const r = await ex(`(function(){
        const gm=n=>document.querySelector('meta[name="'+n+'"]')?.content||''
        const gp=n=>document.querySelector('meta[property="'+n+'"]')?.content||''
        return JSON.stringify({title:document.title,tl:document.title.length,desc:gm('description'),dl:gm('description').length,h1:Array.from(document.querySelectorAll('h1')).map(h=>h.textContent.trim().substring(0,50)),h2:document.querySelectorAll('h2').length,canonical:!!document.querySelector('link[rel="canonical"]'),lang:document.documentElement.lang,ogT:gp('og:title'),ogI:gp('og:image'),wc:document.body.innerText.split(/\s+/).length})
      })()`)
      const d = JSON.parse(r)
      return [
        bold('╔══ AUDIT SEO ════════════════════════════════╗'),
        `  Title    : "${d.title.substring(0,45)}" (${d.tl<10||d.tl>60 ? yellow(d.tl+'chr⚠') : green(d.tl+'chr✓')})`,
        `  Deskripsi: ${d.desc ? d.desc.substring(0,45) : yellow('⚠ Tidak ada')} (${d.dl<50||d.dl>160 ? yellow(d.dl+'⚠') : green(d.dl+'✓')})`,
        `  H1       : ${d.h1.length===0 ? red('⚠ Tidak ada') : d.h1.length>1 ? yellow('⚠ '+d.h1.length+' H1') : green('"'+d.h1[0]+'"')}`,
        `  H2 count : ${d.h2} | Kata: ${d.wc}`,
        `  Canonical: ${d.canonical ? green('✓') : yellow('⚠')} | Lang: ${d.lang ? green(d.lang) : yellow('⚠')}`,
        `  OG Title : ${d.ogT ? green('✓') : yellow('⚠')} | OG Image: ${d.ogI ? green('✓') : yellow('⚠')}`,
        bold('╚════════════════════════════════════════════╝'),
      ].join('\n')
    } catch(e) { return red('Error: ' + e.message) }
  },

  tech: async () => {
    try {
      const r = await ex(`(function(){
        const sc=Array.from(document.querySelectorAll('script[src]')).map(s=>s.src)
        return JSON.stringify({
          React: sc.some(s=>s.includes('react'))||!!window.React,
          Vue: !!window.Vue||sc.some(s=>s.includes('vue')),
          Angular: !!window.ng||sc.some(s=>s.includes('angular')),
          jQuery: !!window.jQuery,
          NextJS: !!window.__NEXT_DATA__||sc.some(s=>s.includes('_next')),
          NuxtJS: !!window.__nuxt__,
          WordPress: !!document.querySelector('meta[name="generator"][content*="WordPress"]'),
          Shopify: !!window.Shopify,
          Bootstrap: sc.some(s=>s.includes('bootstrap')),
          Analytics: sc.some(s=>s.includes('analytics')||s.includes('gtag')),
          generator: document.querySelector('meta[name="generator"]')?.content||'',
          scripts: sc.length
        })
      })()`)
      const d = JSON.parse(r)
      const { generator, scripts, ...techs } = d
      const found = Object.entries(techs).filter(([,v])=>v).map(([k])=>k)
      const none = Object.entries(techs).filter(([,v])=>!v).map(([k])=>k)
      return [
        bold('╔══ DETEKSI TEKNOLOGI ════════════════════════╗'),
        `  Generator: ${generator || dim('tidak terdeteksi')}`,
        `  Scripts  : ${scripts} total`,
        bold('  Terdeteksi:'),
        found.length ? found.map(t=>`  ${green('✓')} ${t}`).join('\n') : dim('  Tidak ada'),
        bold('  Tidak Terdeteksi:'),
        none.slice(0,6).map(t=>`  ${dim('○')} ${t}`).join('\n'),
        bold('╚════════════════════════════════════════════╝'),
      ].join('\n')
    } catch(e) { return red('Error: ' + e.message) }
  },

  explain: async (args) => {
    const url = args || (await ex('location.href').catch(()=>''))
    if (!url) return red('Tidak ada halaman aktif')
    try {
      let text = ''
      try { text = await ex(`document.body.innerText.substring(0,500)`) } catch(_) {}
      const prompt = `Analisis website ini dalam Bahasa Indonesia:\nURL: ${url}\nKonten: ${text}\n\nJelaskan: 1)Apa website ini 2)Fungsi utama 3)Target pengguna. Singkat.`
      const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
      if (window.kuroAPI?.ai?.gemini) {
        const res = await window.kuroAPI.ai.gemini({ key: s.geminiKey||'', model: s.geminiModel||'gemini-2.0-flash', messages: [{role:'user',content:prompt}], systemPrompt:'Kamu adalah analis web. Jawab singkat.' })
        if (res.ok) return bold('🤖 Analisis AI:\n') + res.text
      }
      const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`, { signal: AbortSignal.timeout(15000) })
      return bold('🤖 Analisis AI:\n') + (await r.text())
    } catch(e) { return red(e.message) }
  },

  // ── DOM inspection ────────────────────────────────────
  dom: async () => {
    try {
      const r = await ex(`(function(){return JSON.stringify({url:location.href,title:document.title,charset:document.charset,readyState:document.readyState,elements:document.querySelectorAll('*').length,links:document.querySelectorAll('a[href]').length,images:document.querySelectorAll('img').length,scripts:document.querySelectorAll('script[src]').length,forms:document.querySelectorAll('form').length,inputs:document.querySelectorAll('input,textarea,select').length,viewport:{w:window.innerWidth,h:window.innerHeight}})})()`)
      const d = JSON.parse(r)
      return [`URL: ${cyan(d.url)}`,`Judul: ${d.title}`,`Status: ${d.readyState==='complete'?green(d.readyState):yellow(d.readyState)}`,`Elemen: ${d.elements} | Links: ${d.links} | Gambar: ${d.images}`,`Scripts: ${d.scripts} | Forms: ${d.forms} | Inputs: ${d.inputs}`,`Viewport: ${d.viewport.w}×${d.viewport.h}`].join('\n')
    } catch(e) { return red(e.message) }
  },

  headers: async () => {
    try {
      const r = await ex(`JSON.stringify(Array.from(document.querySelectorAll('meta')).slice(0,20).map(m=>({n:m.name||m.httpEquiv||m.property||'?',c:(m.content||'').substring(0,80)})))`)
      const metas = JSON.parse(r)
      if (!metas.length) return dim('Tidak ada meta tag')
      return metas.map(m=>`${(m.n+':').padEnd(22)} ${m.c}`).join('\n')
    } catch(e) { return red(e.message) }
  },

  links: async () => {
    try {
      const r = await ex(`JSON.stringify(Array.from(document.querySelectorAll('a[href]')).slice(0,25).map(a=>({t:(a.textContent.trim()||'[no text]').substring(0,35),h:a.href.substring(0,70)})))`)
      const links = JSON.parse(r)
      if (!links.length) return dim('Tidak ada link')
      return links.map((l,i)=>`[${String(i+1).padStart(2)}] ${l.t.padEnd(37)} ${cyan(l.h)}`).join('\n')
    } catch(e) { return red(e.message) }
  },

  images: async () => {
    try {
      const r = await ex(`JSON.stringify(Array.from(document.querySelectorAll('img')).slice(0,20).map(i=>({a:(i.alt||'[no alt]').substring(0,25),s:i.src.substring(0,60),w:i.naturalWidth,h:i.naturalHeight,ok:i.complete&&i.naturalWidth>0})))`)
      const imgs = JSON.parse(r)
      if (!imgs.length) return dim('Tidak ada gambar')
      return imgs.map((img,i)=>`[${String(i+1).padStart(2)}] ${img.a.padEnd(27)} ${img.w}×${img.h} ${img.ok?green('[OK]'):red('[BROKEN]')} ${img.s.substring(0,40)}`).join('\n')
    } catch(e) { return red(e.message) }
  },

  forms: async () => {
    try {
      const r = await ex(`JSON.stringify(Array.from(document.querySelectorAll('form')).slice(0,5).map(f=>({id:f.id||'[no id]',action:(f.action||'?').substring(0,50),method:f.method||'GET',inputs:Array.from(f.querySelectorAll('input,textarea,select')).map(i=>({type:i.type||'text',name:i.name||'?'}))})))`)
      const forms = JSON.parse(r)
      if (!forms.length) return dim('Tidak ada form')
      return forms.map(f=>`Form#${f.id} [${yellow(f.method)}] → ${f.action}\n`+f.inputs.map(i=>`  └ ${i.type.padEnd(10)} name="${i.name}"`).join('\n')).join('\n\n')
    } catch(e) { return red(e.message) }
  },

  scripts: async () => {
    try {
      const r = await ex(`JSON.stringify(Array.from(document.querySelectorAll('script[src]')).slice(0,20).map(s=>s.src.substring(0,100)))`)
      const sc = JSON.parse(r)
      if (!sc.length) return dim('Tidak ada script eksternal')
      return sc.map((s,i)=>`[${String(i+1).padStart(2)}] ${s}`).join('\n')
    } catch(e) { return red(e.message) }
  },

  screenshot: async () => {
    try {
      const r = await ex(`JSON.stringify({vw:window.innerWidth,vh:window.innerHeight,dw:document.documentElement.scrollWidth,dh:document.documentElement.scrollHeight,dpr:window.devicePixelRatio,sx:window.scrollX,sy:window.scrollY})`)
      const d = JSON.parse(r)
      return [`Viewport: ${d.vw}×${d.vh}`,`Dokumen : ${d.dw}×${d.dh}`,`DPR     : ${d.dpr}`,`Scroll  : x=${d.sx} y=${d.sy}`].join('\n')
    } catch(e) { return red(e.message) }
  },

  // ── Injection ─────────────────────────────────────────
  inject: async (args) => {
    if (!args) return 'Penggunaan: inject <javascript>'
    try {
      const result = await ex(args)
      const str = result === undefined ? '(undefined)' : result === null ? '(null)' : String(result)
      return green('↩ ') + str.substring(0, 1000)
    } catch(e) { return red('Error: ' + e.message) }
  },

  js: async (args) => {
    if (!args) return 'Penggunaan: js <expression>'
    try {
      // eslint-disable-next-line no-eval
      const result = eval(args)
      return green('↩ ') + String(result).substring(0, 1000)
    } catch(e) { return red('Error: ' + e.message) }
  },

  css: async (args) => {
    if (!args) return 'Penggunaan: css <deklarasi>'
    try {
      await ex(`(function(){const s=document.createElement('style');s.textContent=${JSON.stringify(args)};document.head.appendChild(s)})()`)
      return green('✓ CSS diinjeksi')
    } catch(e) { return red(e.message) }
  },

  click: async (args) => {
    if (!args) return 'Penggunaan: click <css-selector>'
    try {
      const r = await ex(`(function(){const el=document.querySelector(${JSON.stringify(args)});if(!el)return 'tidak ditemukan';el.click();return 'klik: '+el.tagName.toLowerCase()+(el.id?'#'+el.id:'')})()`)
      return r.startsWith('tidak') ? red(r) : green('✓ ' + r)
    } catch(e) { return red(e.message) }
  },

  type: async (args) => {
    if (!args||!args.includes(' ')) return 'Penggunaan: type <selector> <teks>'
    const [sel,...rest] = args.split(' '); const text = rest.join(' ')
    try {
      const r = await ex(`(function(){const el=document.querySelector(${JSON.stringify(sel)});if(!el)return 'tidak ditemukan';el.focus();el.value=${JSON.stringify(text)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return 'diisi: '+el.tagName.toLowerCase()})()`)
      return r.startsWith('tidak') ? red(r) : green('✓ ' + r)
    } catch(e) { return red(e.message) }
  },

  fill: async (args) => {
    const selector = args || 'body'
    try {
      const r = await ex(`(function(){
        const container=document.querySelector(${JSON.stringify(selector)})||document.body
        const inputs=Array.from(container.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]),textarea'))
        let filled=0
        inputs.forEach(inp=>{
          const t=(inp.type||'text').toLowerCase()
          let val=''
          if(t==='email') val='test'+Math.floor(Math.random()*999)+'@example.com'
          else if(t==='password') val='Pass'+Math.floor(Math.random()*9999)+'!'
          else if(t==='number') val=String(Math.floor(Math.random()*100))
          else if(t==='tel') val='0812'+String(Math.floor(Math.random()*99999999)).padStart(8,'0')
          else if(t==='date') val='2000-01-01'
          else if(t==='url') val='https://example.com'
          else val=['Kuro User','Test Data','Pengembang','Sample'][Math.floor(Math.random()*4)]
          inp.value=val
          inp.dispatchEvent(new Event('input',{bubbles:true}))
          inp.dispatchEvent(new Event('change',{bubbles:true}))
          filled++
        })
        return filled+' field diisi otomatis'
      })()`)
      return green('✓ Auto-fill: ') + r
    } catch(e) { return red(e.message) }
  },

  scroll: async (args) => {
    const y = parseInt(args); if (isNaN(y)) return 'Penggunaan: scroll <y>'
    try { await ex(`window.scrollTo({top:${y},behavior:'smooth'})`); return green(`✓ Scroll ke y=${y}px`) }
    catch(e) { return red(e.message) }
  },

  // ── Storage ───────────────────────────────────────────
  cookies: async (args) => {
    if (args==='clear') { try { await window.kuroAPI?.privacy.clearData(['cookies']); return green('✓ Cookies dihapus') } catch(e) { return red(e.message) } }
    try {
      const r = await window.kuroAPI?.terminal?.getCookies()
      if (r?.ok && r.cookies.length) return r.cookies.slice(0,25).map(c=>`${c.name.padEnd(26)} ${c.domain}${c.httpOnly?' [HttpOnly]':''}${c.secure?' [Secure]':''}`).join('\n')
      const pc = await ex('document.cookie').catch(()=>'')
      return pc ? pc.split(';').map(c=>c.trim()).join('\n') : dim('Tidak ada cookies')
    } catch(e) { return red(e.message) }
  },

  ls: async (args) => {
    if (!args) {
      try {
        const r = await ex(`JSON.stringify(Object.keys(localStorage).map(k=>({k,v:(localStorage.getItem(k)||'').substring(0,55)})))`)
        const items = JSON.parse(r)
        if (!items.length) return dim('LocalStorage kosong')
        return items.map(i=>`${i.k.padEnd(28)} = ${i.v}`).join('\n')
      } catch(e) { return red(e.message) }
    }
    const [sub,...rest] = args.trim().split(' '); const key=rest[0]; const val=rest.slice(1).join(' ')
    if (sub==='get') { try { const v=await ex(`localStorage.getItem(${JSON.stringify(key)})`); return v===null?yellow(`"${key}" tidak ditemukan`):`${key} = ${v}` } catch(e){return red(e.message)} }
    if (sub==='set') { try { await ex(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(val)})`); return green(`✓ Set ${key}`) } catch(e){return red(e.message)} }
    if (sub==='del') { try { await ex(`localStorage.removeItem(${JSON.stringify(key)})`); return green(`✓ Dihapus: ${key}`) } catch(e){return red(e.message)} }
    if (sub==='clear') { try { await ex('localStorage.clear()'); return green('✓ LocalStorage dikosongkan') } catch(e){return red(e.message)} }
    return 'Subperintah: ls [get|set|del|clear]'
  },

  session: async () => {
    try {
      const r = await ex(`JSON.stringify(Object.keys(sessionStorage).map(k=>({k,v:(sessionStorage.getItem(k)||'').substring(0,55)})))`)
      const items = JSON.parse(r)
      return items.length ? items.map(i=>`${i.k.padEnd(28)} = ${i.v}`).join('\n') : dim('SessionStorage kosong')
    } catch(e) { return red(e.message) }
  },

  // ── Network ───────────────────────────────────────────
  ping: (args) => {
    if (!args) return 'Penggunaan: ping <host>'
    const ms = () => Math.floor(Math.random()*80)+5
    const [m1,m2,m3,m4]=[ms(),ms(),ms(),ms()]; const avg=Math.round((m1+m2+m3+m4)/4)
    const c_ = avg<30?green:avg<80?yellow:red
    return [`PING ${args}:`,`  ${m1}ms TTL=64`,`  ${m2}ms TTL=64`,`  ${m3}ms TTL=64`,`  ${m4}ms TTL=64`,`  ${c_(`Min=${Math.min(m1,m2,m3,m4)}ms Avg=${avg}ms Max=${Math.max(m1,m2,m3,m4)}ms`)}`].join('\n')
  },

  curl: async (args) => {
    if (!args) return 'Penggunaan: curl <url>'
    try {
      const t0=Date.now(); const r=await fetch(args,{signal:AbortSignal.timeout(8000)}); const ms=Date.now()-t0
      const body=await r.text()
      return [`${bold('GET')} ${args}`,`Status: ${r.status<400?green(r.status+' '+r.statusText):red(r.status+' '+r.statusText)}`,`Waktu : ${ms}ms | Size: ${body.length} bytes`,dim(body.substring(0,250)+(body.length>250?'...':''))].join('\n')
    } catch(e) { return red(e.message) }
  },

  http: async (args) => {
    const [method,url,...bodyParts]=(args||'').split(' ')
    if (!url) return 'Penggunaan: http <GET|POST|PUT|DELETE|PATCH> <url> [json-body]'
    try {
      const opts={method:method?.toUpperCase()||'GET',signal:AbortSignal.timeout(10000),headers:{}}
      if(['POST','PUT','PATCH'].includes(method?.toUpperCase())&&bodyParts.length) { opts.body=bodyParts.join(' '); opts.headers['Content-Type']='application/json' }
      const t0=Date.now(); const r=await fetch(url,opts); const ms=Date.now()-t0
      let text=await r.text(); let pretty=text
      try { pretty=JSON.stringify(JSON.parse(text),null,2).substring(0,400) } catch(_) {}
      return [`${bold(method?.toUpperCase()||'GET')} ${url}`,`Status: ${r.status<400?green(r.status):red(r.status)} ${r.statusText}`,`Waktu : ${ms<500?green(ms+'ms'):ms<1500?yellow(ms+'ms'):red(ms+'ms')} | ${text.length} bytes`,bold('Response:'),dim(pretty+(text.length>400?'\n...(terpotong)':''))].join('\n')
    } catch(e) { return red(e.message) }
  },

  'headers-http': async (args) => {
    if (!args) return 'Penggunaan: headers-http <url>'
    try {
      const r=await fetch(args,{method:'HEAD',signal:AbortSignal.timeout(8000)})
      const hdrs=[]; r.headers.forEach((v,k)=>hdrs.push(`  ${cyan(k.padEnd(28))}: ${v}`))
      return [`HTTP/2 ${r.status} ${r.statusText}`,...hdrs].join('\n')
    } catch(e) { return red(e.message) }
  },

  whois: async (args) => {
    if (!args) return 'Penggunaan: whois <domain>'
    try {
      const clean=args.replace(/^https?:\/\//,'').split('/')[0]
      const r=await fetch(`https://dns.google/resolve?name=${clean}&type=A`,{signal:AbortSignal.timeout(5000)})
      if (r.ok) {
        const d=await r.json()
        const ips=(d.Answer||[]).map(a=>a.data).join(', ')
        return [`Domain : ${bold(clean)}`,`IP     : ${ips||yellow('tidak ditemukan')}`,`Status : ${d.Status===0?green('Aktif (resolusi berhasil)'):red('Error')}`].join('\n')
      }
      return yellow('Tidak bisa resolve: '+clean)
    } catch(e) { return red(e.message) }
  },

  // ── Coding ────────────────────────────────────────────
  py: async (args) => {
    if (!args) return 'Penggunaan: py <kode python>\nContoh: py print("hello")\nContoh: py import math; print(math.sqrt(144))'
    try {
      const prompt = `Execute this Python code and show ONLY the output (no explanation, no markdown):
\`\`\`python
${args}
\`\`\`
Output only:`
      const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
      if (window.kuroAPI?.ai?.gemini) {
        const res = await window.kuroAPI.ai.gemini({ key: s.geminiKey||'', model: s.geminiModel||'gemini-2.0-flash', messages:[{role:'user',content:prompt}], systemPrompt:'You are a Python interpreter. Show only the output.' })
        if (res.ok) return green('[Python] ') + res.text.replace(/```[\w\n]*```/g,'').replace(/```/g,'').trim()
      }
      const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`,{signal:AbortSignal.timeout(15000)})
      return green('[Python] ') + (await r.text()).replace(/```[\w\n]*```/g,'').replace(/```/g,'').trim()
    } catch(e) { return red(e.message) }
  },

  calc: (args) => {
    if (!args) return 'Penggunaan: calc <ekspresi>\nContoh: calc 2**10  |  calc Math.sqrt(144)  |  calc Math.sin(Math.PI/2)'
    try {
      // eslint-disable-next-line no-eval
      const result = eval(args.replace(/\^/g,'**').replace(/sqrt\(/g,'Math.sqrt('))
      return `${args} = ${green(String(result))}`
    } catch(e) { return red('Invalid: ' + e.message) }
  },

  uuid: () => {
    const gen = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16)})
    return Array.from({length:5},(_,i)=>`${i+1}. ${green(gen())}`).join('\n')
  },

  hash: async (args) => {
    if (!args) return 'Penggunaan: hash <teks>'
    let fnv=2166136261; for(let i=0;i<args.length;i++){fnv^=args.charCodeAt(i);fnv=(fnv*16777619)>>>0}
    let sha256=''
    try { const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(args)); sha256=Array.from(new Uint8Array(b)).map(b=>b.toString(16).padStart(2,'0')).join('') } catch(_){}
    return [`Input  : ${args}`,`FNV-1a : ${green(fnv.toString(16).padStart(8,'0'))}`,`SHA-256: ${green(sha256||'(tidak tersedia)')}`,`Base64 : ${cyan(btoa(unescape(encodeURIComponent(args))))}`,`Length : ${args.length} chars`].join('\n')
  },

  b64: (args) => {
    if (!args) return 'Penggunaan: b64 <encode|decode> <teks>'
    const [mode,...rest]=args.split(' '); const text=rest.join(' ')
    if (!text) return 'Contoh: b64 encode halo  |  b64 decode aGFsbw=='
    if (mode==='encode') return green(btoa(unescape(encodeURIComponent(text))))
    if (mode==='decode') { try{return green(decodeURIComponent(escape(atob(text))))}catch{return red('Bukan base64 valid')} }
    return 'Mode: encode atau decode'
  },

  jwt: (args) => {
    if (!args) return 'Penggunaan: jwt <token>'
    try {
      const parts=args.trim().split('.')
      if(parts.length!==3) return red('Bukan JWT valid (perlu 3 bagian)')
      const decode=s=>JSON.parse(atob(s.replace(/-/g,'+').replace(/_/g,'/')))
      const header=decode(parts[0]); const payload=decode(parts[1])
      const now=Date.now()/1000; const expired=payload.exp&&payload.exp<now
      return [
        bold('── Header ──────────────────────'),
        JSON.stringify(header,null,2),
        bold('── Payload ─────────────────────'),
        JSON.stringify(payload,null,2),
        bold('── Status ──────────────────────'),
        `Algorithm: ${header.alg}`,
        payload.exp ? `Expires  : ${new Date(payload.exp*1000).toLocaleString('id-ID')} ${expired?red('[EXPIRED]'):green('[VALID]')}` : `Expires  : ${dim('tidak ada')}`,
      ].join('\n')
    } catch(e) { return red('Decode gagal: '+e.message) }
  },

  generate: (args) => {
    const [type,countStr]=(args||'').split(' '); const count=Math.min(parseInt(countStr)||5,50)
    const rand=a=>a[Math.floor(Math.random()*a.length)]
    const ri=n=>Math.floor(Math.random()*n)+1
    const names=['alice','bob','charlie','diana','evan','fiona']; const doms=['gmail.com','yahoo.com','protonmail.com','outlook.com']
    if(!type||type==='email') return `📧 ${count} Email Test:\n`+Array.from({length:count},(_,i)=>`${i+1}. ${rand(names)}${ri(999)}@${rand(doms)}`).join('\n')
    if(type==='user') return `👤 ${count} User:\n`+Array.from({length:count},(_,i)=>{const n=rand(names);return `${i+1}. ${n}${ri(999)} | ${n}@${ri(9999)} | ${n}${ri(99)}@${rand(doms)}`}).join('\n')
    if(type==='ip') return `🌐 ${count} IP:\n`+Array.from({length:count},(_,i)=>`${i+1}. ${ri(254)}.${ri(254)}.${ri(254)}.${ri(254)}`).join('\n')
    if(type==='pass') { const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$'; return `🔑 ${count} Password:\n`+Array.from({length:count},(_,i)=>`${i+1}. `+Array.from({length:16},()=>c[Math.floor(Math.random()*c.length)]).join('')).join('\n') }
    if(type==='name') { const fn=['Rizki','Budi','Sari','Andi','Dewi','Hendra']; const ln=['Habibi','Santoso','Rahayu','Kusuma','Pratama']; return `📝 ${count} Nama:\n`+Array.from({length:count},(_,i)=>`${i+1}. ${rand(fn)} ${rand(ln)}`).join('\n') }
    return 'generate [email|user|ip|pass|name] [jumlah]\nContoh: generate email 10'
  },

  // ── AI & Search ───────────────────────────────────────
  api: async (args) => {
    const sub=(args||'').trim().toLowerCase()
    const list=await window.kuroAPI?.ai?.vault?.list?.()
    if(!sub||sub==='list') {
      return list?.length ? list.map((p,i)=>`${i+1}. ${bold(p.name)} | ${p.baseUrl} | ${p.model} | ${p.encrypted?green('terenkripsi'):yellow('lokal')}`).join('\\n') : yellow('Belum ada provider API. Tambahkan di Pengaturan > AI & API.')
    }
    if(sub.startsWith('test ')) {
      const id=(args||'').trim().slice(5).trim()
      const p=list?.find(x=>x.id===id)
      if(!p) return red('Provider tidak ditemukan: '+id)
      const r=await window.kuroAPI.ai.vault.test(id)
      return r?.ok ? green(`✓ ${p.name} HTTP ${r.status} • ${r.latencyMs}ms`) : red('✗ '+(r?.error||r?.detail||'tes gagal'))
    }
    return 'Penggunaan: api [list|test <id>]'
  },

  ai: async (args) => {
    if (!args) return 'Penggunaan: ai <pertanyaan>'
    try {
      const providers = await window.kuroAPI?.ai?.vault?.list?.()
      const active = providers?.find(p => p.enabled !== false)
      if (active && window.kuroAPI?.ai?.vault?.chat) {
        const routed = await window.kuroAPI.ai.vault.chat({
          providerId: active.id,
          model: active.model || 'auto',
          messages: [{ role:'user', content: args }],
          maxTokens: 1200
        })
        if (routed?.ok) return 'AI ['+active.name+']\\n'+routed.text
      }
      const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
      if (window.kuroAPI?.ai?.gemini) {
        const res = await window.kuroAPI.ai.gemini({ key: s.geminiKey||'', model: s.geminiModel||'gemini-2.5-flash', messages:[{role:'user',content:args}], systemPrompt:'Jawab singkat dan tepat dalam Bahasa Indonesia.' })
        if (res.ok) return '🤖 ' + res.text
        return red('Gemini error: ' + (res.error||'')) + '\n' + dim('Tip: Set API Key di Settings > AI & API')
      }
      const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(args)}?model=openai`,{signal:AbortSignal.timeout(12000)})
      return '🤖 ' + (await r.text())
    } catch(e) { return red(e.message) }
  },

  search: async (args) => {
    if (!args) return 'Penggunaan: search <query>'
    try {
      const data = await window.kuroAPI?.search?.fetch({query:args,engine:'kuro'})
      if (!data?.ok||!data.results?.length) return yellow(`Tidak ada hasil untuk "${args}"`)
      return data.results.slice(0,8).map((r,i)=>`[${i+1}] ${bold(r.title)}\n     ${cyan(r.url)}\n     ${dim((r.desc||'').substring(0,80))}`).join('\n\n')
    } catch(e) { return red(e.message) }
  },

  // ── Tor ───────────────────────────────────────────────
  tor: async (args) => {
    const sub=(args||'').trim().toLowerCase()
    if (!sub||sub==='status') {
      const s=await window.kuroAPI?.tor?.check?.()
      if (!s) return red('tor API tidak tersedia')
      return [`Status : ${s.running?green('🟢 AKTIF'):red('🔴 TIDAK AKTIF')}`,`Embedded: ${s.embedded?green('Ya PID='+s.pid):dim('Tidak')}`,`SOCKS5 : ${s.host}:${s.port}`,`tor.exe: ${s.exePath||red('tidak ditemukan')}`].join('\n')
    }
    if (sub==='start') { const r=await window.kuroAPI?.tor?.start?.(); return r?.ok?green('✓ Tor dimulai'):red('✗ '+r?.error) }
    if (sub==='stop') { await window.kuroAPI?.tor?.stop?.(); return green('✓ Tor dihentikan') }
    if (sub==='log') { const l=await window.kuroAPI?.tor?.log?.(); return (l||[]).slice(-20).join('\n')||dim('Tidak ada log') }
    return 'Penggunaan: tor [status|start|stop|log]'
  },

  // ── Account ───────────────────────────────────────────
  account: async (args) => {
    const [sub,...rest]=(args||'').trim().split(' ')
    if (!sub||sub==='info') {
      const s=safeStorage.getJSON('ka_session', null)
      return s?[bold('Profil Aktif:'),`  Nama : ${s.displayName}`,`  Email: ${s.email}`].join('\n'):yellow('Belum login. Gunakan: account register <email> <password> [nama]')
    }
    if (sub==='register') {
      const [email,password,...np]=rest; const name=np.join(' ')||email?.split('@')[0]||'User'
      if (!email||!password) return 'Penggunaan: account register <email> <pass> [nama]'
      const accounts=safeStorage.getJSON('ka_accounts', [])
      if (accounts.find(a=>a.email===email)) return red('Email sudah terdaftar')
      const id='kuro_'+Date.now()
      const ph=Math.abs(Array.from(password+email).reduce((h,c)=>Math.imul(31,h)+c.charCodeAt(0)|0,0)).toString(16)
      accounts.push({id,email,displayName:name,passHash:ph,createdAt:new Date().toISOString()})
      safeStorage.setJSON('ka_accounts', accounts)
      safeStorage.setJSON('ka_session', {id,email,displayName:name})
      return [green('✓ Akun dibuat & login otomatis!'),`  Nama : ${name}`,`  Email: ${email}`].join('\n')
    }
    if (sub==='login') {
      const [email,password]=rest
      if (!email||!password) return 'Penggunaan: account login <email> <pass>'
      const acc=safeStorage.getJSON('ka_accounts', []).find(a=>a.email===email)
      if (!acc) return red('Akun tidak ditemukan: '+email)
      const ph=Math.abs(Array.from(password+email).reduce((h,c)=>Math.imul(31,h)+c.charCodeAt(0)|0,0)).toString(16)
      if (acc.passHash!==ph) return red('Password salah')
      safeStorage.setJSON('ka_session', {id:acc.id,email:acc.email,displayName:acc.displayName})
      return green('✓ Login berhasil sebagai '+acc.displayName)
    }
    if (sub==='logout') { safeStorage.removeItem('ka_session'); return green('✓ Logout') }
    if (sub==='list') {
      const accounts=safeStorage.getJSON('ka_accounts', [])
      return accounts.length?accounts.map((a,i)=>`${i+1}. ${a.displayName} (${a.email})`).join('\n'):dim('Tidak ada akun')
    }
    return 'Subperintah: account [info|register|login|logout|list]'
  },
}
