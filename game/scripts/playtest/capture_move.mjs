// GATE 4 of the fight-move playtest skill: EYES ON THE MOVE.
//
//   node scripts/playtest/capture_move.mjs <moveId> [--gap 1.2] [--bout priya] [--port 5173]
//
// Drives the real game in headless Puppeteer (renders to a virtual display, so
// it is immune to the tab-visibility stall that makes every interactive browser
// pane useless for this), fires the move through the REAL input path against a
// sandbagged opponent, and captures a continuous CDP screencast labelled with
// per-frame sim state. Output: playtest-captures/<moveId>/. LOOK AT THE FRAMES.
//
// Two prior designs failed measurably — kept here so they are not rebuilt:
//  · manual stepFight() interleaved with the game's own loop (double-stepping,
//    AI intents polluting the sequence — Leonard ended up in hitstun during his
//    own kick's capture);
//  · poll-per-screenshot ran at ~1 shot per 300ms CDP roundtrip, so the whole
//    move fit between two shots. Screencast pushes frames continuously.
import puppeteer from 'puppeteer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const moveId = args.find((a) => !a.startsWith('--'))
if (!moveId) {
  console.error('usage: capture_move.mjs <moveId> [--gap 1.2] [--bout priya] [--port 5173]')
  process.exit(1)
}
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : dflt
}
const gap = +opt('gap', '1.2')
const bout = opt('bout', 'priya')
const port = opt('port', '5173')
const outDir = join(here, '..', '..', 'playtest-captures', moveId)
mkdirSync(outDir, { recursive: true })

const KEY_FOR = { clarify: 'KeyJ', pushback: 'KeyK', hurricane: 'KeyL', offline: 'KeyO', phased: 'KeyI' }
// sequences: [key, delayMs, key, ...] — the air attack is W then J mid-hop
const SEQ_FOR = { jumpIn: [['KeyW', 0], ['KeyJ', 180]] }
const live = args.includes('--live') // real AI instead of the sandbag
const key = KEY_FOR[moveId] ?? (SEQ_FOR[moveId] ? 'seq' : null)
if (!key) {
  console.error(`✗ no key mapping for '${moveId}' — add it to KEY_FOR`)
  process.exit(1)
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--window-size=1936,1180', '--mute-audio', '--hide-scrollbars'],
  defaultViewport: { width: 1920, height: 1080 },
})
const page = await browser.newPage()
// domcontentloaded, not networkidle0: the game streams radio/audio assets, and
// under any CPU contention idle0 never fires inside 30s. The waitForFunction
// below is the real readiness gate anyway.
await page.goto(`http://localhost:${port}/play/performance-review?photomode=${bout}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__fight && window.__fight.fight.started, { timeout: 45000 })
await new Promise((r) => setTimeout(r, 1500)) // camera lerp settles → player framing

await page.evaluate((sb) => {
  window.__sandbag = sb
}, !live)
await new Promise((r) => setTimeout(r, 900)) // any in-flight AI action ends
await page.evaluate((g) => {
  const f = window.__fight
  // The load window (a cold Vite compile can take 15s+) runs with the LIVE AI
  // before the sandbag latches — long enough for Priya to KO a passive Leonard
  // and end the round. Never assume a live fight: reset if it is over.
  if (f.fight.over || !f.fight.started) {
    f.resetFight()
    f.fight.started = true
  }
  f.leonard.x = -g / 2
  f.opponent.x = g / 2
  f.leonard.meter = 3
  f.leonard.health = f.leonard.maxHealth
  f.opponent.health = f.opponent.maxHealth
  // per-rAF state log, stamped with the same clock screencast frames carry
  window.__stateLog = []
  const tick = () => {
    const ff = window.__fight
    window.__stateLog.push({
      t: Date.now() / 1000,
      leo: ff.leonard.state,
      opp: ff.opponent.state,
      hits: ff.fight.leoHits,
      oc: (window.__clipNow && window.__clipNow.opponent) || '?', // the ACTUAL clip
    })
    if (window.__stateLog.length < 2000) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}, gap)

const frames = []
const client = await page.createCDPSession()
client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ data, t: metadata.timestamp ?? Date.now() / 1000 })
  await client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await client.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1600, maxHeight: 900, everyNthFrame: 1 })
// screencast delivery ramps up over ~1s — pressing immediately once produced a
// capture with a SINGLE frame inside the whole move window
await new Promise((r) => setTimeout(r, 1200))

// RETRY LOOP: against the live AI a single press proves nothing — rushdown
// Priya interrupted the kick's 333ms telegraph before it ever came out, and the
// capture "tested" a move that never happened. Press when actionable, check
// whether a hit landed, repeat.
const press = async () => {
  if (SEQ_FOR[moveId]) {
    for (const [k, d] of SEQ_FOR[moveId]) {
      if (d) await new Promise((r) => setTimeout(r, d))
      await page.keyboard.down(k)
      setTimeout(() => page.keyboard.up(k), 50)
    }
  } else {
    await page.keyboard.down(key)
    await new Promise((r) => setTimeout(r, 60))
    await page.keyboard.up(key)
  }
}
const tries = live ? 6 : 1
let landed = false
for (let a = 0; a < tries && !landed; a++) {
  const before = await page.evaluate(() => {
    // keep only the current attempt in the state log, so the clip evidence
    // covers the press that actually connects (the 400-cap once filled during
    // retries and the log went blind before the hit)
    window.__stateLog.length = 0
    return window.__fight.fight.leoHits
  })
  await page.evaluate(() => {
    // top the meter back up so specials can retry
    window.__fight.leonard.meter = 3
  })
  await press()
  await new Promise((r) => setTimeout(r, 1600))
  const after = await page.evaluate(() => window.__fight.fight.leoHits)
  landed = after > before
  if (!landed && a < tries - 1) await new Promise((r) => setTimeout(r, 500))
}
await new Promise((r) => setTimeout(r, 2800)) // reaction + full knockdown/getup arc
console.log(landed ? '  ✓ move CONNECTED during capture' : '  ✗ move never connected — frames show whiffs/blocks only')

await client.send('Page.stopScreencast').catch(() => {})
const log = await page.evaluate(() => window.__stateLog)
let kept = 0
for (const fr of frames) {
  let st = log[0]
  for (const l of log) {
    if (l.t <= fr.t + 0.005) st = l
    else break
  }
  if (!st) continue
  const name = `t${fr.t.toFixed(3).slice(-7)}-${st.leo}-opp_${st.opp}-clip_${st.oc}-hits${st.hits}.jpg`
  writeFileSync(join(outDir, name), Buffer.from(fr.data, 'base64'))
  kept++
}
await browser.close()
console.log(`  ${kept} frames, leo states seen: ${[...new Set(log.map((l) => l.leo))].join(' → ')}`)
console.log(`  opponent clips seen: ${[...new Set(log.map((l) => l.oc))].join(', ')}`)
console.log(`\n📁 ${outDir}\nREVIEW CHECKLIST — look at the frames and answer each:
  1. Wind-up readable before the hit frame? (anticipation pose, not a teleport)
  2. On the first 'active' frame, is the limb VISUALLY touching the opponent?
  3. Does the opponent's reaction START on that same frame? (not standing still)
  4. Any interpenetration — limb inside torso for multiple frames?
  5. Recovery returns to guard without a pose pop or T-pose?
A gate you cannot answer from the frames is a FAIL, not a skip.`)
