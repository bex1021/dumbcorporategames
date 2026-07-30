// The real fighter: a rigged Mixamo character driven by the sim's state machine.
// Replaces the capsule graybox rig once art is in (blueprint Build E).
//
// Retargeting: Mixamo tags every download's bones with a random prefix number
// (mixamorig7, mixamorig9…), so a clip and a body rarely match out of the box.
// We NORMALIZE both to a bare "mixamorig" prefix, so one shared set of clips
// binds onto any body (Leonard/Brent/Priya/Exec). Root motion (Hips.position)
// is stripped — the sim owns position; the clips only move limbs.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { AnimationClip, AnimationUtils, Group, LoopOnce, LoopRepeat, Quaternion, Vector3, type Object3D } from 'three'
import type * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { fight, renderX, renderY, type Fighter } from './fighterState'
import { BODY, MOVE, STUN } from './fightConfig'

const CHAR_SCALE = 0.01 // Mixamo cm → m
const FADE = 0.12
// The strike → guard "retract". Longer than FADE on purpose: the source attack
// clips end at full extension, so this crossfade back to idle IS the visible
// pull-back to fighting stance. Too short (0.12) reads as a snap/teleport.
const RETURN_FADE = 0.2
// Every Mixamo GLB in _mixamo_glb/ is baked at 30 fps (verified per clip).
const SOURCE_FPS = 30
// TRIM, don't seek, and don't speed-crush. The source clips are 1.0–3.8s full
// performances; the gameplay windows are 0.27–0.80s. Playing the whole clip fast
// made the strike an invisible blur; SEEKING into a long clip made the fighter
// POP to a mid-motion pose across the crossfade (no visible wind-up at all).
// Instead each attack clip is cut ONCE, at load, to windup → contact → settle,
// so it plays from t=0 at ~1x and ends on its own retract.
// [startFrame, endFrameExclusive, timeScale] in 30fps SOURCE frames.
// Contact frames measured per clip: jab L-hand f17, heavy R-foot f28,
// throw R-hand f35, jumpattack R-hand f21.
const ATTACK_TRIM: Record<string, [number, number, number]> = {
  jab: [11, 26, 1.09], // 0.367–0.867s → 0.467s clip, contact 0.200s in; startup 11f = 0.183s
  heavy: [18, 43, 1.0], // 0.600–1.433s → 0.800s clip, contact 0.333s in; startup 20f = 0.333s
  throw: [27, 48, 1.33], // 0.900–1.600s → 0.667s clip, contact 0.267s in; startup 12f = 0.200s
  // Measured VERTICAL curve (RightHand height vs hips): f18–22 arms rise ~1m
  // ABOVE the hips (the ARCH — which "distance from hips" mis-read as contact),
  // f24–40 the arch just HOLDS, f43–52 the hand drops to BELOW the hips swinging
  // forward — THE SLAM, impact ≈ f50. The old [11,30) window ended before the
  // strike existed: you saw arch → freeze → opponent flies, no contact.
  jumpattack: [40, 58, 1.8], // 1.333–1.933s → 0.6s clip, contact 0.333s in; startup 11f = 0.185s
}
// Clips that are an attack swing — used to detect a strike→guard return.
const ATTACK_CLIPS = new Set(['jab', 'heavy', 'throw', 'jumpattack'])

// FOOT-SLIDE FIX: each Mixamo walk clip strides at its own built-in ground
// speed (measured from the raw root motion before we stripped it). Playing it
// at 1.0 while the sim moves the body at a different speed = skating. Scale
// playback so one stride covers exactly the ground the sim actually travels.
const CLIP_GROUND_SPEED = { walk: 1.71, walkback: 1.08 } // m/s, measured
const LOCO_DWELL = 8 // min frames between idle↔walk swaps (anti-flicker)
const RECOIL_HIT = 0.26 // metres knocked back on a light hit (visual only)
const RECOIL_KO = 0.4 // …and on a knockdown
const RECOIL_DECAY = 0.86 // per-frame spring back to the sim's true position
const CHEST_FRAC = 0.72 // chest height as a fraction of standing height
const AIM_STRENGTH = 0.8 // how much of the true angle to actually lean
const AIM_CLAMP = 0.5 // rad — never fold the torso in half
// While ATTACKING, the lean is boosted and allowed further: at neutral tuning,
// Leonard's punches at the 1.28x Exec read as hitting someone his own height —
// a polite tilt, not an upward strike. Strike frames multiply the angle and
// raise the cap (~41°) so swinging up at the Exec (and the Exec swinging DOWN
// at Leonard, and the air dive slamming downward) visibly commits. Against
// same-height foes dy≈0, so the boost multiplies zero — no change.
const AIM_ATTACK_MULT = 1.45
const AIM_CLAMP_ATTACK = 0.72
// Smoothing (time-based): the boost engages on attack frames; damping the angle
// over ~4 frames keeps that from popping the spine in a single frame.
const AIM_DAMP = 0.75
const AIM_SIGN = 1 // flips if the lean comes out backwards on this rig
const AIM_AXIS = new Vector3(1, 0, 0)
const norm = (s: string) => s.replace(/^mixamorig\d+/, 'mixamorig')

// role → clip GLB (all under public/, so served at /models/_mixamo_glb/*)
const CLIP_URLS: Record<string, string> = {
  idle: '/models/_mixamo_glb/idle.glb',
  jab: '/models/_mixamo_glb/jab.glb',
  heavy: '/models/_mixamo_glb/heavy.glb',
  throw: '/models/_mixamo_glb/throw.glb',
  block: '/models/_mixamo_glb/block.glb',
  hit: '/models/_mixamo_glb/hit.glb',
  knockdown: '/models/_mixamo_glb/knockdown.glb',
  getup: '/models/_mixamo_glb/getup.glb',
  dodge: '/models/_mixamo_glb/dodge.glb',
  victory: '/models/_mixamo_glb/victory.glb',
  jump: '/models/_mixamo_glb/jump.glb',
  jumpattack: '/models/_mixamo_glb/jumpattack.glb',
  falling: '/models/_mixamo_glb/falling.glb',
  walk: '/models/_mixamo_glb/walk.glb',
  walkback: '/models/_mixamo_glb/walkback.glb',
}
const CLIP_NAMES = Object.keys(CLIP_URLS)
const ONE_SHOT = new Set(['jab', 'heavy', 'throw', 'hit', 'knockdown', 'dodge', 'jumpattack', 'victory', 'getup'])
// Airborne clips: the SIM owns the vertical arc (renderY), so these must NOT
// also carry the clip's own vertical EXCURSION. They must still carry its
// standing HEIGHT — see STAND_HIP_Y.
const AIRBORNE_CLIPS = new Set(['jump', 'falling', 'jumpattack'])
// Standing hip height in Mixamo rig units (cm). MEASURED from Player_Idle.glb's
// bind pose: mixamorigHips.position = (0, 95.7, 2.11) → 0.957m at CHAR_SCALE.
// Every Mixamo Hips.position.y key is an ABSOLUTE pelvis height like this, NOT a
// delta on top of a standing pose — which is why zeroing it (a previous attempt
// at killing the double-stacked arc) put the pelvis ON THE FLOOR and hung the
// legs underneath it: only the torso cleared the ground plane.
const STAND_HIP_Y = 95.7
// On airborne clips keep only the DOWNWARD residual — the anticipation crouch
// and the air tuck — and drop the lift, which the sim already provides. Measured
// lift inside the window each clip actually plays: jump +0.000m, falling
// +0.001m, jumpattack +1.827m. So this only really bites on jumpattack.
const AIR_LIFT_KEEP = 0
// Clips whose hips are LOCKED to standing height outright: the jumpattack slam
// window (f40–58) carries the clip's own 1.35m landing dive in Hips.y — but the
// SIM already drives the descent, so keeping even the downward residual would
// sink him ~1.3m through the floor mid-swing. The strike reads through the arms
// and torso; the hips just ride the sim's arc.
const AIR_HIP_LOCK = new Set(['jumpattack'])
// Reaction clips that need cutting too. NOT attacks, so they must not go through
// the ATTACK_CLIPS timeScale branch.
// knockdown.glb is 2.8s / 84 keys @30fps. MEASURED Hips.y: f0 96.5 (upright),
// f21 76.4 (buckling), f36 15.8 (floor), motionless from ~f63. Frames 0–39 are
// the whole reaction; the rest is lying still, which the state timer covers.
const REACTION_TRIM: Record<string, [number, number]> = { knockdown: [0, 40] }

// Any track with NO key inside a trim window is DROPPED by subclip, so a bone
// exported with a single key at frame 0 (all 30 finger bones) stops being
// animated and snaps to bind pose — measured: jab loses 31 of 53 tracks, throw
// 30 of 53. Re-add each as a constant holding its value at the trim start.
function keepDroppedAsConstant(src: AnimationClip, cut: AnimationClip, startFrame: number): void {
  const kept = new Set(cut.tracks.map((t) => t.name))
  const at = startFrame / SOURCE_FPS
  for (const t of src.tracks) {
    if (kept.has(t.name)) continue
    const size = t.getValueSize()
    let k = 0
    for (let j = 0; j < t.times.length; j++) if (t.times[j] <= at) k = j
    const one = t.values.slice(k * size, (k + 1) * size)
    const vals = new Float32Array(size * 2)
    vals.set(one, 0)
    vals.set(one, size)
    const c = t.clone()
    c.times = new Float32Array([0, Math.max(cut.duration, 1 / SOURCE_FPS)])
    c.values = vals
    cut.tracks.push(c)
  }
}

// Built ONCE, at module scope. THIS ARRAY'S IDENTITY IS LOAD-BEARING: drei's
// useAnimations keys its cleanup effect on [clips], and that cleanup calls
// mixer.stopAllAction() + uncacheAction() on EVERY action. The previous
// useMemo(..., [gltfs]) could never hit — gltfs is a fresh .map() array every
// render — so every re-render tore down the mixer. Pressing J/K/L emits a
// callout line, which setStates in FightWorld, which re-renders… killing the
// swing one frame after it started. (Walking emits no callout, which is exactly
// why movement looked fine and only attacks were dead.)
let CLIPS_CACHE: AnimationClip[] | null = null

// Load + normalize + trim every clip once (shared across all fighters).
function useFightClips(): AnimationClip[] {
  // still called every render so Suspense waits for all the GLBs
  const gltfs = CLIP_NAMES.map((n) => useGLTF(CLIP_URLS[n]))
  if (!CLIPS_CACHE) {
    CLIPS_CACHE = CLIP_NAMES.map((name, i) => {
      const src = gltfs[i].animations.find((a) => a.tracks.length > 0) ?? gltfs[i].animations[0]
      const base = src.clone()
      base.name = name
      for (const t of base.tracks) t.name = norm(t.name)

      // 1. TRIM FIRST — attacks to windup→contact→settle, knockdown to its fall.
      //    Order matters: the hip baseline below must be read from the keys that
      //    SURVIVE the cut. jumpattack's full-clip first key is 84.27 but its
      //    window opens at 60.06; baselining before the cut leaves it 0.242m
      //    under the floor.
      const trim = ATTACK_TRIM[name] ?? REACTION_TRIM[name]
      const clip = trim ? AnimationUtils.subclip(base, name, trim[0], trim[1], SOURCE_FPS) : base
      clip.name = name
      if (trim) keepDroppedAsConstant(base, clip, trim[0])

      // 2. THEN normalise the hips.
      for (const t of clip.tracks) {
        if (!/Hips\.position$/.test(t.name)) continue
        const v = t.values
        if (v.length < 3) continue
        const airborne = AIRBORNE_CLIPS.has(name)
        const lockHips = AIR_HIP_LOCK.has(name)
        const baseY = v[1] // this clip's own standing height, post-trim
        for (let j = 0; j < v.length; j += 3) {
          v[j] = 0 // x — the sim owns horizontal
          v[j + 2] = 0 // z — ditto
          if (!airborne) continue // grounded clips keep their own hip height
          if (lockHips) {
            v[j + 1] = STAND_HIP_Y
            continue
          }
          let r = v[j + 1] - baseY
          if (r > 0) r *= AIR_LIFT_KEEP
          v[j + 1] = STAND_HIP_Y + r
        }
      }
      return clip
    })
  }
  return CLIPS_CACHE
}

// Which strike clip a move maps to. Shared by startup/active AND recovery so
// the trimmed clip keeps playing through its own settle.
const attackClip = (f: Fighter): string => {
  const k = f.move?.kind
  if (k === 'throw') return 'throw'
  if (k === 'counter') return 'block'
  if (k === 'special' || f.move?.heavy) return 'heavy'
  return 'jab'
}

function clipFor(f: Fighter): string {
  if (fight.over && fight.winner === f.id) return 'victory'
  if (f.airborne) {
    if (f.move?.air) return 'jumpattack'
    return f.vy > 0 ? 'jump' : 'falling'
  }
  switch (f.state) {
    case 'startup':
    case 'active':
      // The STRIKE itself — the trimmed clip lands its contact on the hit frame.
      return attackClip(f)
    case 'recovery':
      // The RETRACT — now REAL animation: the trimmed clip contains its own
      // settle back toward guard, so keep playing it instead of cutting to idle.
      // Landing lag after a plain hop has no move, and still falls to idle
      // (which is what stopped the stray jab pose on landing).
      return f.move ? attackClip(f) : 'idle'
    case 'blockstun':
      return 'block'
    case 'hitstun':
      return 'hit'
    case 'knockdown':
      return 'knockdown'
    case 'dash':
      return 'dodge'
    case 'walk':
      // Blocking while moving still reads as a guard — the block pose wins.
      if (f.blocking) return 'block'
      return f.walkDir === -1 ? 'walkback' : 'walk'
    default:
      return f.blocking ? 'block' : 'idle'
  }
}

export function AnimatedFighter({
  bodyUrl,
  fighter,
  foe,
  baseScale = 1,
}: {
  bodyUrl: string
  fighter: Fighter
  foe?: Fighter
  baseScale?: number
}) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const { scene } = useGLTF(bodyUrl)

  // Per-instance clone + normalized bone names so clips bind onto ANY body.
  const cloned = useMemo(() => {
    const c = cloneSkinned(scene)
    c.traverse((o) => {
      if (o.name) o.name = norm(o.name)
      // Cloned meshes default to no shadows → characters look like they float.
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = false
      }
    })
    return c
  }, [scene])

  // Spine bones, grabbed once — used below to aim the upper body at whoever
  // we're actually fighting (see the AIM block in useFrame).
  const spine = useMemo(() => {
    const found: Object3D[] = []
    cloned.traverse((o) => {
      if (/^mixamorigSpine[12]?$/.test(o.name)) found.push(o)
    })
    return found
  }, [cloned])

  // The mixer's own pose for each spine bone, and the value WE last wrote.
  // three only pushes a bone to the scene graph when its blended value CHANGED
  // (PropertyMixer.apply's accu0/accu1 check) — it compares its own accumulators,
  // never the live scene value, so it cannot see that we mutated the bone behind
  // its back. On a frozen (hitstop) or clamped (finished one-shot) frame it skips
  // the write entirely, so b.quaternion still holds OUR offset. Comparing against
  // aimApplied is how we tell "the mixer re-authored this bone" from "nobody
  // touched it" — without it, the old `rotation.x +=` integrated on itself and
  // wound the torso up to a measured 1810°. That was the cartwheel.
  const aimBase = useMemo(() => spine.map((b) => b.quaternion.clone()), [spine])
  const aimApplied = useMemo(() => spine.map((b) => b.quaternion.clone()), [spine])
  const aimQ = useMemo(() => new Quaternion(), [])
  const aimCur = useRef(0) // damped lean angle, so the attack boost eases in

  const clips = useFightClips()
  const { actions, mixer } = useAnimations(clips, inner)
  const current = useRef('')
  const dwell = useRef(0)
  const recoil = useRef(0)
  const prevState = useRef('')
  // Held in a ref so useFrame never mutates a render-scoped binding.
  const mixerRef = useRef(mixer)
  useEffect(() => {
    mixerRef.current = mixer
  }, [mixer])

  useEffect(() => {
    // The action objects were just (re)built, so the diff latch below must
    // forget what it thought was playing. `current` is a ref, so it survives a
    // render that destroyed every AnimationAction — and the only restart path is
    // `want !== current.current`, which would stay false forever once the ref
    // and the mixer disagree, silently swallowing the whole move. '' forces a
    // full re-evaluation next frame (actions[''] is undefined, so the fadeOut
    // below is a safe no-op).
    current.current = ''
    const a = actions.idle
    if (a) a.reset().play()
  }, [actions])

  // DEV: expose the rig so foot-grounding can be measured, not eyeballed.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __rigs?: Record<string, Group | null> }
    w.__rigs = { ...(w.__rigs ?? {}), [fighter.id]: outer.current }
  }, [fighter.id, cloned])

  useFrame((_, delta) => {
    if (!outer.current) return
    // ── POSE CLOCK ↔ SIM CLOCK ──────────────────────────────────────────────
    // The mixer (drei) advances on raw wall-clock delta, independent of the sim.
    // During hitstop the SIM freezes (and we hold the recoil offset below), so
    // freeze the pose too — otherwise the body stops but the limbs keep sliding,
    // which is the mushy, un-impactful "freeze". timeScale 0 = every action holds.
    const mx = mixerRef.current
    if (mx) mx.timeScale = fight.hitstop > 0 ? 0 : 1
    // ── RECOIL (render-only) ────────────────────────────────────────────────
    // Getting hit has to MOVE you or it reads as a sound effect with a health
    // bar. Real pushback wrecked the Brent matchup (see fightConfig), so the
    // flinch lives here: a kick away from the attacker that springs back to
    // the sim's true position. The sim never sees it, so spacing is exact.
    if (fighter.state !== prevState.current) {
      if (fighter.state === 'hitstun') recoil.current = RECOIL_HIT
      else if (fighter.state === 'knockdown') recoil.current = RECOIL_KO
      prevState.current = fighter.state
    }
    // Hold the offset through hitstop so the freeze-frame lands on the flinch,
    // then let it spring back once the world starts moving again. Decay is
    // time-based (^delta*60) so it springs at the same real speed on 60 or 144Hz
    // instead of snapping back faster on high-refresh screens (visible judder).
    if (fight.hitstop <= 0) recoil.current *= Math.pow(RECOIL_DECAY, delta * 60)

    // Position / facing / scale — the sim owns all of this. Positions are
    // interpolated between sim ticks so walking stays smooth above 60 Hz.
    const y = fighter.airborne ? renderY(fighter) : 0
    outer.current.position.set(renderX(fighter) - fighter.facing * recoil.current, y, 0)
    // Mixamo characters face +Z at rest; rotate so they face each other on X.
    // VICTORY: once the KO freeze has played out, the winner turns downstage to
    // take the pose to camera (yaw 0 = the Mixamo rest facing, +Z, toward the
    // audience). Time-based ease so the turn reads the same at 60 and 144Hz;
    // both fight yaws (±π/2) converge to 0 by the short way, and the freeze
    // itself keeps the impact profile.
    const wonAndFree = fight.over && fight.winner === fighter.id && fight.hitstop <= 0
    if (wonAndFree) {
      outer.current.rotation.y += (0 - outer.current.rotation.y) * (1 - Math.pow(0.85, delta * 60))
    } else {
      outer.current.rotation.y = fighter.facing === 1 ? Math.PI / 2 : -Math.PI / 2
    }
    outer.current.scale.setScalar(baseScale)

    const want = clipFor(fighter)

    // Locomotion DWELL: idle↔walk may only swap every few frames. Attacks, hits
    // and knockdowns are exempt — those must read instantly. Belt-and-braces
    // against any remaining single-frame flicker crossfading the body to death.
    const loco = (s: string) => s === 'idle' || s === 'walk' || s === 'walkback'
    if (dwell.current > 0) dwell.current--
    // Anti-flicker dwell only blocks the CLIP SWAP — it must NOT `return` out of
    // useFrame, because the AIM block below is part of every frame's pose (and
    // its base/applied bookkeeping has to stay in step).
    const dwellBlocked = want !== current.current && loco(want) && loco(current.current) && dwell.current > 0

    if (!dwellBlocked && want !== current.current) {
      if (loco(want)) dwell.current = LOCO_DWELL
      const next = actions[want]
      if (!next && import.meta.env.DEV) {
        console.warn(`[AnimatedFighter] no action for clip "${want}"; have:`, Object.keys(actions).filter((k) => actions[k]))
      }
      if (next) {
        // Reactions SNAP; locomotion blends; the strike→guard return GLIDES.
        // A 0.12s crossfade ate a third of a 0.37s flinch (hits snap at 0.03);
        // returning from an attack to idle uses the longer RETURN_FADE so the
        // retract reads as motion, not a pop back to stance.
        const m = fighter.move
        let fade =
          want === 'hit' || want === 'knockdown'
            ? 0.03
            : want === 'idle' && ATTACK_CLIPS.has(current.current)
              ? RETURN_FADE
              : FADE
        // An attack must reach FULL weight before its contact frame, or the
        // money pose plays half-blended under the outgoing clip (a big part of
        // the invisible air strike). Cap the fade to half the startup window.
        if (m && ATTACK_CLIPS.has(want)) fade = Math.min(fade, (m.startup / 60) * 0.5)
        const frozen = fight.hitstop > 0
        next.reset()
        next.setLoop(ONE_SHOT.has(want) ? LoopOnce : LoopRepeat, Infinity)
        next.clampWhenFinished = ONE_SHOT.has(want)
        // The clip is already TRIMMED to this move's window (see ATTACK_TRIM),
        // so it plays from t=0 at ~1x and its contact lands on the hit frame.
        // No seek: starting at frame 0 means the crossfade blends idle into the
        // clip's FIRST pose (centimetres apart) instead of into a mid-swing pose
        // half a metre away — which is what made strikes read as a teleport.
        if (m && ATTACK_CLIPS.has(want)) {
          next.timeScale = ATTACK_TRIM[want]?.[2] ?? 1
        } else if (want === 'hit') {
          // Match the flinch to the actual hitstun, or they're still reeling
          // on screen after the sim says they can act again.
          next.setDuration(STUN.hitLight / 60)
        } else if (want === 'knockdown') {
          // Same treatment 'hit' already got. Untreated, only source frames 0→17
          // of 84 played inside the 34-frame stun — the victim was cut off
          // mid-buckle, still on his feet, then crossfaded back upright. Fit the
          // trimmed fall to the ACTUAL stun so he reaches the floor in time.
          next.setDuration(STUN.knockdown / 60)
        } else if (want === 'walk' || want === 'walkback') {
          const ground = MOVE.walkSpeed * (want === 'walkback' ? MOVE.backSpeedMult : 1)
          next.timeScale = ground / CLIP_GROUND_SPEED[want]
        } else {
          next.timeScale = 1
        }
        if (frozen) {
          // The mixer is at timeScale 0 during hitstop, and three drives fade
          // WEIGHTS off mixer time — so a time-based crossfade cannot progress
          // while frozen. Measured: knockdown weight stayed 0.000 for all 7
          // frames of a throw freeze, i.e. the victim was drawn in his PRE-throw
          // standing pose for the exact moment your eye lands on him. Swap the
          // weights outright; the pose still lands on the next mixer.update even
          // at timeScale 0, because the blended value CHANGED.
          actions[current.current]?.stopFading().setEffectiveWeight(0)
          next.stopFading().setEffectiveWeight(1)
        } else {
          // Undo any stale hitstop zeroing: .weight is PERSISTENT in three, and
          // fadeIn only schedules an interpolant that MULTIPLIES it. A clip that
          // was swapped out during a hitstop still carries .weight = 0, so
          // without this it re-enters invisible and the mixer writes the saved
          // rest state — the full bind-pose T-pose (intermittent, because a
          // LATER frozen swap into the same clip would set it back to 1).
          // setEffectiveWeight() internally calls stopFading(), so it MUST come
          // before the fade calls, never after.
          const out = actions[current.current]
          if (out) {
            out.setEffectiveWeight(1)
            out.fadeOut(fade)
          }
          next.setEffectiveWeight(1)
          next.fadeIn(fade)
        }
        next.play()
        current.current = want
      }
    }

    // ── AIM: pitch the upper body toward the opponent's chest ───────────────
    // Everyone's clips were authored for an opponent of their own height, so
    // against the Exec both sides swung at thin air: Leonard punched the man's
    // stomach, and the Exec's own swings sailed over Leonard's head. Leaning
    // the spine toward where the other fighter's chest ACTUALLY is makes the
    // Exec visibly strike downward and Leonard visibly reach (or leap) up.
    // This runs after the animation mixer, so it layers on top of the clip.
    // Skipped for the winner taking the victory pose — the lean would keep
    // folding the spine toward the downed loser while the body faces front.
    if (foe && spine.length && !wonAndFree) {
      const chest = (f: Fighter) => f.y + BODY.height * f.heightScale * CHEST_FRAC
      const dy = chest(foe) - chest(fighter)
      const dx = Math.max(0.5, Math.abs(foe.x - fighter.x))
      // Strike frames lean HARDER (see AIM_ATTACK_MULT): a punch thrown at the
      // 1.28x Exec must visibly angle UP, and his answers angle down.
      const attacking =
        !!fighter.move &&
        (fighter.state === 'startup' || fighter.state === 'active' || fighter.state === 'recovery')
      const aim = Math.atan2(dy, dx) * AIM_STRENGTH * (attacking ? AIM_ATTACK_MULT : 1)
      const cl = attacking ? AIM_CLAMP_ATTACK : AIM_CLAMP
      const target = Math.max(-cl, Math.min(cl, aim))
      // Damped toward the target so the attack boost eases in over ~4 frames
      // instead of stepping the spine in one. Time-based → same at 60/144Hz.
      aimCur.current += (target - aimCur.current) * (1 - Math.pow(AIM_DAMP, delta * 60))
      // ABSOLUTE, bounded, idempotent. Total fold across the chain can never
      // exceed the clamp no matter how many frames the mixer skips, because we
      // SET base*offset instead of adding to last frame's result.
      //
      // SIGN (measured, scripts/mixamo/verify-aim-sign.mjs): Rx(+) on this rig
      // bows the spine FORWARD/DOWN. Foe above (aim > 0) must arch UP, so the
      // applied angle is -aim. NO facing factor: both rigs are yawed to face
      // each other, so the same local pitch means the same thing for both — the
      // old `* facing` was accidentally right for the left-facing fighter and
      // exactly inverted for Leonard, who bowed DOWN at the taller Exec.
      const per = -aimCur.current / spine.length
      aimQ.setFromAxisAngle(AIM_AXIS, per * AIM_SIGN)
      for (let i = 0; i < spine.length; i++) {
        const b = spine[i]
        if (!b.quaternion.equals(aimApplied[i])) aimBase[i].copy(b.quaternion)
        // PRE-multiply: `rotation.x += d` on an XYZ Euler is Rx(d) * base, i.e. a
        // rotation in the bone's PARENT space. Composing the same way keeps the
        // lean looking exactly as tuned, without the Euler round-trip.
        b.quaternion.copy(aimQ).multiply(aimBase[i])
        aimApplied[i].copy(b.quaternion)
      }
    }
  })

  return (
    <group ref={outer}>
      <group ref={inner} scale={CHAR_SCALE}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

CLIP_NAMES.forEach((n) => useGLTF.preload(CLIP_URLS[n]))
useGLTF.preload('/models/Player_Idle.glb')
useGLTF.preload('/models/Male1_idle.glb')
useGLTF.preload('/models/Female1_idle.glb')
useGLTF.preload('/models/_mixamo_glb/exec_body.glb')
