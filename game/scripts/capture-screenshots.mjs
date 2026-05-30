// Marketing screenshot generator.
//
// Drives the dev server (Vite at localhost:5173) via puppeteer to capture
// gameplay moments for the marketing site. For each shot, we navigate to
// the right route, click past intros, mutate the game store directly to
// stage the scene, then page.screenshot() to disk.
//
// Output: game/public/screenshots/<name>.png
//
// Run with:
//   1. Start the dev server: npm --prefix game run dev
//   2. In another shell:    node game/scripts/capture-screenshots.mjs
//
// Re-run any time the game looks different — adjust the SHOTS list below.

import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHOTS_DIR = path.resolve(__dirname, '../public/screenshots')
const BASE = 'http://localhost:5173'
const VIEWPORT = { width: 1600, height: 1000 }

// The shots we want. `setup` is a string preset or a richer object.
const SHOTS = [
  // Slots referenced by routes/Blocked.tsx Screenshots section (01–06):
  { name: '01-hero',     route: '/play/blocked',  setup: 'heroAtPod' },
  { name: '02-hr',       route: '/play/blocked',  setup: { dialogue: 'diane' } },
  { name: '03-printer',  route: '/play/blocked',  setup: 'printerSlap' },
  { name: '04-calendar', route: '/play/blocked',  setup: 'calendarPanel' },
  { name: '05-standup',  route: '/play/blocked',  setup: { ending: 'standup-complete' } },
  { name: '06-plant',    route: '/play/blocked',  setup: 'plant' },
  // Bonus shots beyond the existing slots — usable elsewhere on the site:
  { name: '07-brent',    route: '/play/blocked',  setup: { dialogue: 'brent' } },
  { name: '08-chad',     route: '/play/blocked',  setup: { dialogue: 'chad' } },
  { name: '09-walk',     route: '/play/blocked',  setup: 'wide' },
  { name: '10-sprint',   route: '/play/jira-run', setup: 'jirarunRunning' },
]

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: VIEWPORT,
})
const page = await browser.newPage()

page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') {
    console.log('  [browser]', m.type(), m.text().slice(0, 200))
  }
})
page.on('pageerror', (err) => console.log('  [pageerror]', err.message.slice(0, 200)))

// Click past the /play/blocked intro flow (Slack mockup → Jira briefing
// with "Start sprint") until store.phase === 'playing'.
async function advancePastIntros() {
  for (let i = 0; i < 10; i++) {
    const phase = await page.evaluate(async () => {
      const m = await import('/src/state/gameStore.ts')
      return m.useGameStore.getState().phase
    })
    if (phase === 'playing') return
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, [role=button]')]
        .find(b => /start sprint|continue|begin/i.test(b.textContent || ''))
      if (btn) { btn.click(); return }
      document.body.click()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ',    code: 'Space', bubbles: true }))
    })
    await sleep(400)
  }
  console.log('  warn: never reached phase=playing')
}

// Mutate game state in-page to stage a scene.
async function applySetup(spec) {
  await page.evaluate(async (spec) => {
    const storeMod = await import('/src/state/gameStore.ts')
    const posMod   = await import('/src/state/playerState.ts')
    const slapMod  = await import('/src/state/slapState.ts')
    const store = storeMod.useGameStore
    // NPC world positions, mirrored from config/constants.ts NPCS.
    const NPCS = {
      brent:   [-12,  1],
      tasha:   [-12, -5],
      priya:   [  0, -5],
      chad:    [ 12, -5],
      diane:   [-10, -10],
      printer: [  0,  1],
      phyllis: [ 12,  9],
    }
    if (spec === 'wide') {
      // Sit the player near the PM desk facing into the bullpen for a
      // marketing-style wide shot.
      posMod.playerPosition.set(-3, 0, 8)
    } else if (spec === 'heroAtPod') {
      // 01-hero caption: "BULLPEN · 09:14 AM · PM AT ENGINEER POD" —
      // approach Brent's pod (-12, 1), camera frames the back of the PM
      // looking toward Brent's desk.
      posMod.playerPosition.set(-10, 0, 3.5)
    } else if (spec === 'plant') {
      // 06-plant caption: "OFFICE PLANT · SILENT STAKEHOLDER · BOUNDARIES: YES"
      // Phyllis sits at (12, 9). Stand the PM just south of her so the
      // camera frames both with the bullpen behind.
      posMod.playerPosition.set(11, 0, 11.5)
    } else if (spec && spec.dialogue) {
      const id = spec.dialogue
      const [x, z] = NPCS[id]
      // Stand the PM just in front of (+z side of) the NPC so the camera
      // frames both. Camera is a third-person follow, so position drives
      // framing.
      posMod.playerPosition.set(x + 1.2, 0, z + 2.6)
      store.getState().setNearbyNPC(id)
      store.getState().openDialogue(id)
    } else if (spec === 'printerSlap') {
      // PrinterPos is (0,1). Put the PM just next to it; slap trigger is
      // an incrementing counter the Player.tsx watches each frame.
      posMod.playerPosition.set(-0.8, 0, 2.2)
      slapMod.slapState.printerSlapTrigger =
        (slapMod.slapState.printerSlapTrigger || 0) + 1
    } else if (spec === 'calendarPanel') {
      // The recovery panel renders whenever pendingRecovery is set. We
      // bypass the meter-load trigger and set the flag directly.
      store.setState({ pendingRecovery: 'calendar-apocalypse' })
    } else if (spec && spec.ending) {
      store.getState().endGame(spec.ending)
    }
  }, spec)
}

async function captureOne(shot) {
  console.log('==', shot.name)
  await page.goto(BASE + shot.route, { waitUntil: 'networkidle0' })

  if (shot.route === '/play/blocked') {
    await advancePastIntros()
  } else if (shot.route === '/play/jira-run') {
    // JiraRun has an intro screen with "PRESS SPACE TO ENTER THE BOARD".
    await sleep(700)
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => /enter the board/i.test(b.textContent || ''))
      btn?.click()
    })
    // Canvas remounts after the fade. Wait until it's at full size.
    try {
      await page.waitForFunction(() => {
        const c = document.querySelector('canvas')
        return c && c.width >= 800
      }, { timeout: 12000 })
    } catch {
      console.log('  warn: jirarun canvas never reached full size')
    }
  }

  if (shot.setup === 'jirarunRunning') {
    // Let the player accumulate some distance / hit a checkpoint visually.
    await sleep(1500)
  } else {
    await applySetup(shot.setup)
  }

  // Let one more rAF tick happen so the camera, lighting, and HUD have
  // a chance to react to the state mutation.
  await sleep(800)

  const out = path.join(SHOTS_DIR, shot.name + '.png')
  await page.screenshot({ path: out })
  console.log('  saved', out)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

for (const shot of SHOTS) {
  try {
    await captureOne(shot)
  } catch (err) {
    console.log('  ERROR:', err.message)
  }
}

await browser.close()
console.log('\nall done')
