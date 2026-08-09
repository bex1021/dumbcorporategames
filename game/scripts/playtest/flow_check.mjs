// End-to-end check of the REAL bout flow (no photomode door):
//   calendar → invite → lobby → the rig-readiness gate ignites the fight
//   → LOSE → the UNCONVINCED card offers REJOIN → same meeting regenerates
//   → WIN → the day advances to Priya.
// Proves A1 (must-win progression) and A2 (no fight vs an unloaded fighter).
import puppeteer from 'puppeteer'

const port = process.argv[2] || '5173'
const browser = await puppeteer.launch({
  headless: true,
  args: ['--window-size=1936,1180', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1920, height: 1080 },
})
const page = await browser.newPage()
const fails = []
const step = (name, ok) => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`)
  if (!ok) fails.push(name)
}

await page.goto(`http://localhost:${port}/play/performance-review`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('Architecture Sync'), { timeout: 45000 })

const clickByText = async (re) =>
  page.evaluate((src) => {
    const rx = new RegExp(src, 'i')
    const el = [...document.querySelectorAll('button, [style*="cursor: pointer"], [style*="cursor:pointer"]')].find((x) => rx.test(x.innerText))
    if (el) { el.click(); return true }
    return false
  }, re.source)

const joinFlow = async () => {
  await page.waitForFunction(() => document.body.innerText.includes('STARTS NOW'), { timeout: 20000 })
  await clickByText(/STARTS NOW/)
  await new Promise((r) => setTimeout(r, 400))
  await clickByText(/JOIN MEETING/)
  await new Promise((r) => setTimeout(r, 400))
  await clickByText(/Join now/)
}

// ── round 1: join and verify the gate ───────────────────────────────────────
await joinFlow()
// the gate: started must imply both rigs ready (poll during the wait window)
const gate = await page.evaluate(async () => {
  const t0 = Date.now()
  let startedBeforeReady = false
  while (Date.now() - t0 < 12000) {
    const f = window.__fight
    const rigs = window.__rigs
    if (f?.fight.started) {
      const both = rigs?.leonard && rigs?.opponent
      if (!both) startedBeforeReady = true
      return { started: true, startedBeforeReady }
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  return { started: false, startedBeforeReady }
})
step('fight ignites', gate.started)
step('never starts before both fighters are mounted', !gate.startedBeforeReady)

// ── lose on purpose ─────────────────────────────────────────────────────────
await page.evaluate(() => {
  const f = window.__fight
  f.leonard.health = 1
  // stand IN RANGE: Brent is the Wall (approach 0.3) — against an idle
  // Leonard at spawn distance he can dawdle past the 30s wait
  f.leonard.x = f.opponent.x - 0.9
})
// let Brent land the finish
await page.waitForFunction(() => window.__fight.fight.over, { timeout: 30000 })
await new Promise((r) => setTimeout(r, 2600))
let text = await page.evaluate(() => document.body.innerText)
step('loss card shows UNCONVINCED', /JUDGED AGAINST YOU|UNCONVINCED/.test(text))
step('loss card offers PRESS ENTER, not review', /PRESS ENTER/.test(text) && !/SEE THE REVIEW/.test(text))

// ── ENTER: one keypress, straight back into the same room ───────────────────
// (playtest: no calendar round-trip on a defeat)
await page.keyboard.press('Enter')
await page.waitForFunction(() => window.__fight.fight.started && !window.__fight.fight.over, { timeout: 15000 })
const after = await page.evaluate(() => ({
  index: window.__fight.gauntlet.index,
  results: window.__fight.gauntlet.results.length,
  text: document.body.innerText,
}))
step('gauntlet did NOT advance (index 0, no recorded results)', after.index === 0 && after.results === 0)
step('ENTER lands directly in the fight — no calendar between', !/STARTS NOW|JOIN MEETING/.test(after.text))

// ── round 2: win, and the day advances ──────────────────────────────────────
await new Promise((r) => setTimeout(r, 300))
await new Promise((r) => setTimeout(r, 600))
await page.evaluate(() => {
  const f = window.__fight
  ;(window).__sandbag = true
  f.opponent.health = 1
  f.leonard.health = f.leonard.maxHealth
  f.leonard.x = f.opponent.x - 0.9
})
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.down('KeyJ')
await new Promise((r) => setTimeout(r, 80))
await page.keyboard.up('KeyJ')
await page.waitForFunction(() => window.__fight.fight.over, { timeout: 8000 })
await new Promise((r) => setTimeout(r, 2600))
text = await page.evaluate(() => document.body.innerText)
step('win card shows CONVINCED', /CONVINCED/.test(text) && !/UNCONVINCED/.test(text))
await clickByText(/BACK TO CALENDAR/)
await new Promise((r) => setTimeout(r, 900))
const final = await page.evaluate(() => ({
  index: window.__fight.gauntlet.index,
  wins: window.__fight.gauntlet.results.filter((r) => r.won).length,
  text: document.body.innerText,
}))
step('win advances the day (index 1, one win recorded)', final.index === 1 && final.wins === 1)
step('Product Review is now the live meeting', /Product Review[\s\S]{0,80}STARTS NOW/.test(final.text))

await browser.close()
console.log(fails.length ? `\n✗ FLOW CHECK FAILED: ${fails.join(' · ')}` : '\n✓ FLOW CHECK PASS — gate, loss-retry and win-advance all verified')
process.exit(fails.length ? 1 : 0)
