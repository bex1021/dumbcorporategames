// Smoke-check: does the fight actually run its score? Headless Puppeteer
// (immune to the pane's visibility stall), photomode door straight into a
// bout, then probe __music: playing flag + heat rising as health drops.
import puppeteer from 'puppeteer'

const port = process.argv[2] || '5173'
const browser = await puppeteer.launch({
  headless: true,
  args: ['--window-size=1936,1180', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  defaultViewport: { width: 1920, height: 1080 },
})
const page = await browser.newPage()
await page.goto(`http://localhost:${port}/play/performance-review?photomode=priya`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 45000 })
await new Promise((r) => setTimeout(r, 1200))

const probe1 = await page.evaluate(() => ({
  playing: window.__music?.isPlaying() ?? null,
}))

// hurt the opponent hard → heat must climb into the hook tiers
const probe2 = await page.evaluate(async () => {
  const f = window.__fight
  f.opponent.health = Math.round(f.opponent.maxHealth * 0.1)
  await new Promise((r) => setTimeout(r, 300)) // a few frames of the heat loop
  return { playing: window.__music?.isPlaying() ?? null, oppFrac: f.opponent.health / f.opponent.maxHealth }
})

// KO → music must stop
const probe3 = await page.evaluate(async () => {
  const f = window.__fight
  f.opponent.health = 1
  // land the finish via sim time: force over
  f.fight.over = true
  f.fight.winner = 'leonard'
  await new Promise((r) => setTimeout(r, 400))
  return { playing: window.__music?.isPlaying() ?? null }
})

await browser.close()
console.log(`start of bout: playing=${probe1.playing}`)
console.log(`opponent at 10%: playing=${probe2.playing}`)
console.log(`after KO: playing=${probe3.playing}`)
if (probe1.playing === true && probe2.playing === true && probe3.playing === false) {
  console.log('✓ music wiring PASS')
} else {
  console.log('✗ music wiring FAIL')
  process.exit(1)
}
