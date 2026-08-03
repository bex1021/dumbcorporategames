import puppeteer from 'puppeteer'
const b = await puppeteer.launch({ headless: true, args: ['--mute-audio'] })
const p = await b.newPage()
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) })
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 400)))
await p.goto(process.argv[2] ?? 'http://localhost:5173/play/performance-review?photomode=priya', { waitUntil: 'domcontentloaded', timeout: 60000 })
await new Promise((r) => setTimeout(r, 8000))
const state = await p.evaluate(() => ({ fight: !!window.__fight, started: window.__fight?.fight?.started ?? null, sandbag: !!globalThis.__sandbag }))
console.log(JSON.stringify({ state, errs: errs.slice(0, 6) }, null, 1))
await b.close()
