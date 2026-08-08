// Reproduce the boutEnd and GauntletResult screens headlessly and dump their
// exact text — hunting the "u2lbb" string a playtester saw at the end of the
// game. The browser pane can't get here (its hidden visibilityState stalls the
// rAF watcher that flips fight.over → boutEnd), so: real Chrome, headless.
import puppeteer from 'puppeteer'

const port = process.argv[2] || '5173'
const browser = await puppeteer.launch({
  headless: true,
  args: ['--window-size=1936,1180', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1920, height: 1080 },
})
const page = await browser.newPage()
page.on('response', (r) => { if (r.status() >= 400) console.log(`[HTTP ${r.status()}] ${r.url()}`) })
// door straight into the FINAL bout with the sandbag up
await page.goto(`http://localhost:${port}/play/performance-review?photomode=exec&sandbag=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 45000 })
await new Promise((r) => setTimeout(r, 1200))

// one-punch the exec: set his bar to 1 and land a jab through the real input path
await page.evaluate(() => {
  const f = window.__fight
  f.opponent.health = 1
  f.leonard.x = f.opponent.x - 0.9
})
await page.keyboard.down('KeyJ')
await new Promise((r) => setTimeout(r, 80))
await page.keyboard.up('KeyJ')
// wait for the boutEnd overlay (KO freeze drains first)
await page.waitForFunction(() => window.__fight.fight.over, { timeout: 8000 })
await new Promise((r) => setTimeout(r, 2500))
const boutEnd = await page.evaluate(() => document.body.innerText)
console.log('══════════ BOUT-END SCREEN ══════════')
console.log(boutEnd)

// click continue ("SEE THE REVIEW" — this was the last bout, index 2)
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /REVIEW|CALENDAR/i.test(x.innerText))
  if (b) { b.click(); return b.innerText }
  return null
})
console.log(`\n[clicked: ${clicked}]`)
await new Promise((r) => setTimeout(r, 3000))
const over = await page.evaluate(() => document.body.innerText)
console.log('══════════ FINAL (GauntletResult) SCREEN ══════════')
console.log(over)
await browser.close()
