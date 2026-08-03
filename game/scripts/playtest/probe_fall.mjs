// Probe the finisher's fall action live: is the clip advancing, at what
// timeScale, what weight — sampled every 100ms through the knockdown.
import puppeteer from 'puppeteer'
const b = await puppeteer.launch({ headless: true, args: ['--mute-audio'] })
const p = await b.newPage()
await p.goto('http://localhost:5173/play/performance-review?photomode=priya&sandbag=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 45000 })
await new Promise((r) => setTimeout(r, 1800))
await p.evaluate(() => {
  const f = window.__fight
  if (f.fight.over || !f.fight.started) { f.resetFight(); f.fight.started = true }
  f.leonard.x = -0.5; f.opponent.x = 0.5
  f.leonard.meter = 3
  f.leonard.health = f.leonard.maxHealth
  f.opponent.health = f.opponent.maxHealth
})
await p.keyboard.down('KeyI'); await new Promise((r) => setTimeout(r, 60)); await p.keyboard.up('KeyI')
const samples = []
for (let i = 0; i < 45; i++) {
  const s = await p.evaluate(() => ({
    opp: window.__fight.opponent.state,
    hits: window.__fight.fight.leoHits,
    anim: (window.__animDebug || {}).opponent,
  }))
  samples.push(s)
  await new Promise((r) => setTimeout(r, 100))
}
await b.close()
for (const s of samples.filter((x) => x.opp === 'knockdown' || x.anim?.clip === 'guthitfall'))
  console.log(JSON.stringify(s))
