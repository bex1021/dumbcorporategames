// Do the fight achievements actually award and render? Win the final bout
// cleanly (door + sandbag), then inspect localStorage + the badge strip.
import puppeteer from 'puppeteer'
const browser = await puppeteer.launch({
  headless: true,
  args: ['--window-size=1936,1180', '--mute-audio'],
  defaultViewport: { width: 1920, height: 1080 },
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/play/performance-review?photomode=exec&sandbag=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 45000 })
await new Promise((r) => setTimeout(r, 1200))
await page.evaluate(() => {
  const f = window.__fight
  // COLD-COMPILE GUARD (same lesson as capture_move): a slow first compile
  // can let the 99s round clock EXPIRE before this harness acts — the bout
  // resolves as a timeout win against the sandbag and every later press is a
  // no-op. Never assume a live fight: reset if it is over.
  if (f.fight.over || !f.fight.started) {
    f.resetFight()
    f.fight.started = true
  }
  f.opponent.health = 1
  f.leonard.x = f.opponent.x - 0.9
})
const pre = await page.evaluate(() => ({
  started: window.__fight.fight.started, over: window.__fight.fight.over,
  leo: window.__fight.leonard.state, oppHP: window.__fight.opponent.health,
  dist: +Math.abs(window.__fight.opponent.x - window.__fight.leonard.x).toFixed(2),
  sandbag: !!window.__sandbag,
}))
console.log('pre-jab:', JSON.stringify(pre))
await page.keyboard.down('KeyJ')
await new Promise((r) => setTimeout(r, 80))
await page.keyboard.up('KeyJ')
await new Promise((r) => setTimeout(r, 1200))
const post = await page.evaluate(() => ({
  over: window.__fight.fight.over, winner: window.__fight.fight.winner,
  leo: window.__fight.leonard.state, oppHP: window.__fight.opponent.health,
}))
console.log('post-jab:', JSON.stringify(post))
await page.waitForFunction(() => window.__fight.fight.over, { timeout: 8000 })
await new Promise((r) => setTimeout(r, 2600))
// continue to the final screen
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /REVIEW/i.test(x.innerText))
  b?.click()
})
await new Promise((r) => setTimeout(r, 2500))
const out = await page.evaluate(() => ({
  stored: JSON.parse(localStorage.getItem('blocked.fight-achievements.v1') ?? '[]'),
  stripShown: /ACHIEVEMENTS · \d+\/10/.test(document.body.innerText),
}))
console.log('awarded:', out.stored.join(', ') || '(none)')
console.log('badge strip on final screen:', out.stripShown ? '✓' : '✗')
// expectations for this exact run: a fast, throwless, full-health exec win
// 'exceeds' is EXCLUDED on purpose: the photomode door records only the exec
// bout, and finalRating correctly refuses to rate a 1-of-3 day (must-win rule).
const expect = ['flawless', 'strictly', 'hardstop', 'aligned', 'noresched']
const missing = expect.filter((e) => !out.stored.includes(e))
console.log(missing.length ? `✗ missing: ${missing.join(', ')}` : '✓ all six expected awards present')
await browser.close()
process.exit(missing.length || !out.stripShown ? 1 : 0)
