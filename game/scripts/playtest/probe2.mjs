import puppeteer from 'puppeteer'
const b = await puppeteer.launch({ headless: true, args: ['--mute-audio'] })
const p = await b.newPage()
await p.goto('http://localhost:5173/play/performance-review?photomode=priya&sandbag=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForFunction(() => window.__trims, { timeout: 45000 })
console.log(JSON.stringify(await p.evaluate(() => window.__trims), null, 1))
await b.close()
