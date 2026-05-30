// Jira Run — the in-Canvas world + game loop.
//
// Forward auto-run (Leonard.z increases), behind-the-back camera, 3-lane
// dodge + jump + slide, obstacle spawn/cull, collision → death, Kanban
// BOARD gates → deposit an update + level up. Per-frame state lives in a
// single ref (G) so we never churn React; React state holds only the
// rendered obstacle list (updated a few times/sec on spawn/cull).

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import type { AnimationClip } from 'three'
import {
  LANES, LANE_LERP, GRAVITY, JUMP_V, SLIDE_DUR, CLEAR_JUMP_Y, HIT_Z,
  SPAWN_AHEAD, CULL_BEHIND, LEVEL_DISTANCE, TOTAL_UPDATES,
  TOKEN_VALUE, TOKEN_Y,
  makeRow, gapRange, speedForLevel, isJumpable, isSlideable, PAL,
  type Obstacle, type ObstacleKind, type Token,
} from './runnerConfig'

const LEONARD_URL = '/models/Player_Idle.glb' // hosts the mesh we render
const RUN_URL = '/models/Player_run.glb' // real Mixamo running clip (anim-only, ~73KB)
const JUMP_URL = '/models/Player_jump.glb' // real Mixamo running-jump clip (anim-only)
useGLTF.preload(LEONARD_URL)
useGLTF.preload(RUN_URL)
useGLTF.preload(JUMP_URL)
// Real run clip now — slight speed-up so the stride cadence reads at game
// pace (we drive forward motion ourselves; this is purely cosmetic tempo).
const RUN_TIMESCALE = 1.2

// Shared jump signal: the game loop sets this each frame from grounded
// state; LeonardModel reads it to crossfade Run ↔ Jump. Module-level mutable
// (same pattern as playerState) so we don't thread props through Suspense.
const runnerAnim = { jumping: false }

export type HudState = { updates: number; level: number; distance: number; score: number; mult: number }
export type Checkpoint = { level: number; updates: number; score: number }

type Props = {
  running: boolean
  // Where this run begins — start of the current sprint. On a fresh game it's
  // {1,0,0}; after a death it's the last sprint the player banked, so retries
  // resume the sprint instead of starting the whole phase over.
  start: Checkpoint
  onHud: (h: HudState) => void
  onDeposit: (n: number) => void
  onToken: () => void
  onCheckpoint: (c: Checkpoint) => void
  onDeath: (distance: number) => void
  onWin: () => void
}

// Combo multiplier from tokens collected this run: x1, then +1 every 8
// tokens, capped at x4. Rewards greedy weaving without runaway scores.
function multForCombo(combo: number) {
  return Math.min(4, 1 + Math.floor(combo / 8))
}

export function RunnerWorld({ running, start, onHud, onDeposit, onToken, onCheckpoint, onDeath, onWin }: Props) {
  const { camera } = useThree()

  // ---- per-frame game state (never triggers React re-render) ----
  // Seeded from `start` (the current sprint checkpoint) so retries resume the
  // sprint instead of the whole phase. z always restarts at 0 — only the
  // sprint number / deposits / score carry over.
  const G = useRef({
    z: 0, lane: 1, x: 0, y: 0, vy: 0, grounded: true,
    sliding: false, slideT: 0,
    speed: speedForLevel(start.level), level: start.level, levelDist: 0, updates: start.updates,
    alive: true, won: false, boardActive: false,
    nextSpawnZ: 34, hudAccum: 0,
    score: start.score, combo: 0,
  })
  const obsRef = useRef<Obstacle[]>([])
  const tokRef = useRef<Token[]>([])
  const idRef = useRef(1)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [tokens, setTokens] = useState<Token[]>([])

  const leonardRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const pillarsRef = useRef<THREE.Group>(null)
  const floorRef = useRef<THREE.Group>(null)

  // ---- input ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = G.current
      if (!running || !g.alive || g.won) return
      switch (e.key) {
        // Camera is BEHIND Leonard looking +Z, so world +X renders on the
        // player's LEFT. Left/A must therefore move toward the higher lane
        // index (+X) to feel correct on screen, and Right/D toward the lower.
        case 'ArrowLeft': case 'a': case 'A':
          g.lane = Math.min(2, g.lane + 1); e.preventDefault(); break
        case 'ArrowRight': case 'd': case 'D':
          g.lane = Math.max(0, g.lane - 1); e.preventDefault(); break
        case 'ArrowUp': case 'w': case 'W': case ' ':
          if (g.grounded && !g.sliding) { g.vy = JUMP_V; g.grounded = false }
          e.preventDefault(); break
        case 'ArrowDown': case 's': case 'S':
          if (g.grounded) { g.sliding = true; g.slideT = SLIDE_DUR }
          e.preventDefault(); break
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [running])

  function syncObstacles() {
    setObstacles(obsRef.current.slice())
  }
  function syncTokens() {
    setTokens(tokRef.current.slice())
  }

  // Spawn one obstacle row at nextSpawnZ; return which lanes it occupies so
  // we can drop tokens in an OPEN lane (pulling the player to weave).
  function spawnRow(): 'full' | number[] {
    const g = G.current
    const row = makeRow(g.level, Math.random)
    let occupied: number[] = []
    for (const o of row) {
      obsRef.current.push({ id: idRef.current++, z: g.nextSpawnZ, kind: o.kind, lanes: o.lanes })
      if (o.lanes === 'full') occupied = [0, 1, 2]
      else occupied = occupied.concat(o.lanes)
    }
    return occupied
  }

  // Drop a short run of ⭐ tokens in the gap after a row. Placed in an OPEN
  // lane (so collecting = dodging toward safety), or as a diagonal sweep
  // across lanes ~30% of the time to force a weave.
  function spawnTokens(rowZ: number, occupied: 'full' | number[]) {
    const occ = occupied === 'full' ? [0, 1, 2] : occupied
    const open = [0, 1, 2].filter((l) => !occ.includes(l))
    const startLane = open.length
      ? open[Math.floor(Math.random() * open.length)]
      : Math.floor(Math.random() * 3)
    const diagonal = Math.random() < 0.3
    const baseZ = rowZ + 3.5
    for (let i = 0; i < 3; i++) {
      const lane = diagonal ? Math.max(0, Math.min(2, startLane - 1 + i)) : startLane
      tokRef.current.push({ id: idRef.current++, z: baseZ + i * 2.2, lane })
    }
  }

  function spawnBoard() {
    const g = G.current
    obsRef.current.push({ id: idRef.current++, z: g.nextSpawnZ + 8, kind: 'board', lanes: 'full' })
    g.boardActive = true
    syncObstacles()
  }

  useFrame((_, dtRaw) => {
    const g = G.current
    if (!running || !g.alive || g.won) return
    const dt = Math.min(dtRaw, 0.05) // clamp huge frames (tab refocus)

    // forward motion
    g.z += g.speed * dt

    // lane smoothing
    const targetX = LANES[g.lane]
    g.x += (targetX - g.x) * (1 - Math.exp(-LANE_LERP * dt))

    // vertical (jump arc)
    if (!g.grounded || g.vy !== 0) {
      g.y += g.vy * dt
      g.vy += GRAVITY * dt
      if (g.y <= 0) { g.y = 0; g.vy = 0; g.grounded = true }
    }
    // slide timer
    if (g.sliding) { g.slideT -= dt; if (g.slideT <= 0) g.sliding = false }

    // ---- spawning ----
    if (!g.boardActive) {
      let dirty = false
      while (g.nextSpawnZ < g.z + SPAWN_AHEAD) {
        const rowZ = g.nextSpawnZ
        const occ = spawnRow(); dirty = true
        if (Math.random() < 0.78) spawnTokens(rowZ, occ) // most gaps get tokens
        const [gmin, gmax] = gapRange(g.level)
        const gap = gmin + Math.random() * (gmax - gmin)
        g.nextSpawnZ += gap
        g.levelDist += gap
        if (g.levelDist >= LEVEL_DISTANCE) { spawnBoard(); break }
      }
      if (dirty) { syncObstacles(); syncTokens() }
    }

    // ---- cull behind ----
    const before = obsRef.current.length
    obsRef.current = obsRef.current.filter((o) => o.z > g.z - CULL_BEHIND)
    if (obsRef.current.length !== before) syncObstacles()
    const tokBefore = tokRef.current.length
    tokRef.current = tokRef.current.filter((t) => t.z > g.z - CULL_BEHIND)
    if (tokRef.current.length !== tokBefore) syncTokens()

    // ---- collision / deposit ----
    for (const o of obsRef.current) {
      if (Math.abs(o.z - g.z) > HIT_Z) continue
      const inLane = o.lanes === 'full' || o.lanes.includes(g.lane)
      if (!inLane) continue
      if (o.kind === 'board') {
        // pass-through deposit (only once — mark by moving it behind)
        if (o.z <= g.z) {
          g.updates += 1
          onDeposit(g.updates)
          obsRef.current = obsRef.current.filter((x) => x.id !== o.id)
          syncObstacles()
          if (g.updates >= TOTAL_UPDATES) {
            g.won = true
            onWin()
          } else {
            g.level += 1
            g.speed = speedForLevel(g.level)
            g.levelDist = 0
            g.boardActive = false
            // Bank a checkpoint at the start of the new sprint — a death from
            // here restarts this sprint, not the whole phase.
            onCheckpoint({ level: g.level, updates: g.updates, score: g.score })
          }
        }
        continue
      }
      // hazard. A 'wall' is neither jumpable nor slideable → cleared stays
      // false → you die unless you switched out of its lane (inLane above).
      const cleared =
        (isJumpable(o.kind) && g.y >= CLEAR_JUMP_Y) ||
        (isSlideable(o.kind) && g.sliding)
      if (!cleared) {
        g.alive = false
        onDeath(Math.floor(g.z))
        return
      }
    }

    // ---- token pickup (only reached if still alive this frame) ----
    {
      let collected = 0
      const survivors: Token[] = []
      for (const t of tokRef.current) {
        if (Math.abs(t.z - g.z) <= HIT_Z && t.lane === g.lane) collected++
        else survivors.push(t)
      }
      if (collected > 0) {
        for (let i = 0; i < collected; i++) {
          g.combo += 1
          g.score += TOKEN_VALUE * multForCombo(g.combo)
        }
        tokRef.current = survivors
        syncTokens()
        onToken()
      }
    }

    // ---- transforms ----
    if (leonardRef.current) {
      leonardRef.current.position.set(g.x, g.y, g.z)
    }
    // Drive the animation state machine: airborne → Jump clip, else Run.
    runnerAnim.jumping = !g.grounded
    if (modelRef.current) {
      // The run clip animates the body; we only add a slide squash on top.
      modelRef.current.scale.y = g.sliding ? 0.5 : 1
    }
    // camera follows behind, slight lateral lean toward lane
    camera.position.set(g.x * 0.35, 3.4, g.z - 6.6)
    camera.lookAt(g.x * 0.18, 1.0, g.z + 12)

    // tile the side pillars + floor so the world looks infinite
    if (pillarsRef.current) pillarsRef.current.position.z = Math.floor((g.z - 16) / 8) * 8
    if (floorRef.current) floorRef.current.position.z = g.z

    // throttled HUD push
    g.hudAccum += dt
    if (g.hudAccum > 0.12) {
      g.hudAccum = 0
      onHud({
        updates: g.updates, level: g.level, distance: Math.floor(g.z),
        score: g.score, mult: multForCombo(g.combo),
      })
    }
  })

  return (
    <>
      <color attach="background" args={[PAL.sky]} />
      <fog attach="fog" args={[PAL.sky, 45, 95]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 12, -4]} intensity={0.8} />

      {/* Floor + lane lines — follow Leonard so they read as endless */}
      <group ref={floorRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[11, 260]} />
          <meshStandardMaterial color={PAL.floor} />
        </mesh>
        {[-1.15, 1.15].map((x) => (
          <mesh key={x} position={[x, 0.02, 0]}>
            <boxGeometry args={[0.05, 0.02, 260]} />
            <meshStandardMaterial color={PAL.grid} emissive={PAL.grid} emissiveIntensity={0.6} />
          </mesh>
        ))}
        {/* outer rails */}
        {[-3.6, 3.6].map((x) => (
          <mesh key={x} position={[x, 0.15, 0]}>
            <boxGeometry args={[0.12, 0.3, 260]} />
            <meshStandardMaterial color={PAL.grid} emissive={PAL.grid} emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>

      {/* Tiled Kanban-column pillars down both sides for speed sensation */}
      <group ref={pillarsRef}>
        {Array.from({ length: 24 }).map((_, i) => {
          const z = i * 8
          return (
            <group key={i}>
              <SidePillar x={-4.6} z={z} tint={i % 2 === 0 ? PAL.block : PAL.board} />
              <SidePillar x={4.6} z={z} tint={i % 2 === 0 ? PAL.board : PAL.block} />
            </group>
          )
        })}
      </group>

      {/* Obstacles */}
      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} obstacle={o} />
      ))}

      {/* ⭐ Story-point tokens */}
      {tokens.map((t) => (
        <TokenMesh key={t.id} token={t} />
      ))}

      {/* Leonard */}
      <group ref={leonardRef}>
        <group ref={modelRef}>
          <Suspense fallback={<FallbackLeonard />}>
            <LeonardModel />
          </Suspense>
        </group>
      </group>
    </>
  )
}

// ---- Leonard (idle mesh + real Mixamo run/jump clips) ----
// Mount the Idle GLB's scene (the mesh) and retarget the run + running-jump
// clips onto it by bone name (drei useAnimations). Run loops by default;
// while airborne (runnerAnim.jumping) we crossfade to the Jump clip and back.
// Root motion is stripped from both so our own physics drives position.
function LeonardModel() {
  const group = useRef<THREE.Group>(null)
  const idle = useGLTF(LEONARD_URL)
  const run = useGLTF(RUN_URL)
  const jump = useGLTF(JUMP_URL)
  const clips = useMemo(() => {
    const out: AnimationClip[] = []
    const r = pickClip(run.animations)
    const j = pickClip(jump.animations)
    if (r) out.push(stripRootMotion(r, 'Run'))
    if (j) out.push(stripRootMotion(j, 'Jump'))
    return out
  }, [run.animations, jump.animations])
  const { actions } = useAnimations(clips, group)
  const wasJumping = useRef(false)

  useEffect(() => {
    const runA = actions['Run']
    if (runA) { runA.reset().play(); runA.timeScale = RUN_TIMESCALE }
    return () => { Object.values(actions).forEach((a) => a?.stop()) }
  }, [actions])

  // Crossfade Run ↔ Jump on the shared signal (edge-triggered).
  useFrame(() => {
    const j = runnerAnim.jumping
    if (j === wasJumping.current) return
    wasJumping.current = j
    const runA = actions['Run']
    const jumpA = actions['Jump']
    if (j) {
      jumpA?.reset().fadeIn(0.1).play()
      runA?.fadeOut(0.1)
    } else {
      runA?.reset().fadeIn(0.15).play()
      jumpA?.fadeOut(0.15)
    }
  })

  // 0.01 = Mixamo cm→m correction (matches Phase 1 Player.tsx). Without it
  // Leonard renders ~100× and the camera ends up inside his shoe.
  // rotation.y = 0 faces him +Z (away from the behind-camera) so we see his
  // back as he runs into the screen.
  return <primitive ref={group} object={idle.scene} rotation={[0, 0, 0]} scale={0.01} />
}

// Pick the first non-empty clip from a GLB (Mixamo names them "mixamo.com").
function pickClip(animations: AnimationClip[]): AnimationClip | null {
  return animations.find((c) => c.tracks.length > 0) ?? null
}
// Clone, rename, and drop the root-motion position track so Leonard runs in
// place (our z-motion drives him forward). Same logic as Phase 1's Player.tsx.
function stripRootMotion(clip: AnimationClip, name: string): AnimationClip {
  const cloned = clip.clone() as AnimationClip
  cloned.name = name
  cloned.tracks = cloned.tracks.filter((t) => {
    if (!t.name.endsWith('.position')) return true
    return !/(?:mixamorig\d*Hips|Hips|Root|Armature)\.position$/.test(t.name)
  })
  return cloned
}
function FallbackLeonard() {
  return (
    <mesh position={[0, 0.9, 0]} castShadow>
      <capsuleGeometry args={[0.3, 1.0, 4, 8]} />
      <meshStandardMaterial color={PAL.leonardClash} />
    </mesh>
  )
}

function SidePillar({ x, z, tint }: { x: number; z: number; tint: string }) {
  return (
    <mesh position={[x, 1.4, z]}>
      <boxGeometry args={[0.7, 2.8, 0.7]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.18} />
    </mesh>
  )
}

// ⭐ Story-point token — spinning gold gem floating in a lane.
function TokenMesh({ token }: { token: Token }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 3
  })
  return (
    <mesh ref={ref} position={[LANES[token.lane], TOKEN_Y, token.z]}>
      <octahedronGeometry args={[0.34, 0]} />
      <meshStandardMaterial color={PAL.update} emissive={PAL.update} emissiveIntensity={0.6} />
    </mesh>
  )
}

// ---- Obstacle rendering ----
function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const laneXs =
    obstacle.lanes === 'full' ? [0] : obstacle.lanes.map((l) => LANES[l])
  const full = obstacle.lanes === 'full'

  return (
    <group position={[0, 0, obstacle.z]}>
      {laneXs.map((x, i) => (
        <ObstaclePiece key={i} kind={obstacle.kind} x={full ? 0 : x} full={full} />
      ))}
    </group>
  )
}

function ObstaclePiece({ kind, x, full }: { kind: ObstacleKind; x: number; full: boolean }) {
  const w = full ? 7.0 : 1.8
  if (kind === 'block') {
    return (
      <group position={[x, 0, 0]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[w, 1.4, 1.1]} />
          <meshStandardMaterial color={PAL.block} emissive={PAL.block} emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[w, 0.08, 1.1]} />
          <meshStandardMaterial color={PAL.blockEdge} emissive={PAL.blockEdge} emissiveIntensity={0.5} />
        </mesh>
      </group>
    )
  }
  if (kind === 'gap') {
    // red BLOCKED trap tile on the floor — jump it
    return (
      <mesh position={[x, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 2.6]} />
        <meshStandardMaterial color={PAL.gap} emissive={PAL.gap} emissiveIntensity={0.45} />
      </mesh>
    )
  }
  if (kind === 'overhang') {
    // head-height bar — slide under it; posts down to the floor as a gate
    return (
      <group position={[x, 0, 0]}>
        <mesh position={[0, 1.85, 0]}>
          <boxGeometry args={[w, 0.55, 0.6]} />
          <meshStandardMaterial color={PAL.overhang} emissive={PAL.overhang} emissiveIntensity={0.3} />
        </mesh>
        {(full ? [-3.4, 3.4] : [-0.85, 0.85]).map((px) => (
          <mesh key={px} position={[px, 0.95, 0]}>
            <boxGeometry args={[0.12, 1.9, 0.12]} />
            <meshStandardMaterial color={PAL.overhang} />
          </mesh>
        ))}
      </group>
    )
  }
  if (kind === 'wall') {
    // Tall purple dependency wall — too tall to jump, solid to the floor so
    // there's no gap to slide. The ONLY way past is another lane. Deliberately
    // has NO red (red = the duckable overhang) — instead bold WHITE hazard
    // bands so it reads as a solid "go-around" barrier, never a duck-gate.
    return (
      <group position={[x, 0, 0]}>
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[w, 3.4, 0.9]} />
          <meshStandardMaterial color={PAL.wall} emissive={PAL.wall} emissiveIntensity={0.16} />
        </mesh>
        {[0.9, 1.9, 2.9].map((yy) => (
          <mesh key={yy} position={[0, yy, 0.46]}>
            <boxGeometry args={[w * 0.88, 0.26, 0.05]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
    )
  }
  // board — full-width green Kanban gate
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[7.6, 0.7, 0.3]} />
        <meshStandardMaterial color={PAL.board} emissive={PAL.board} emissiveIntensity={0.4} />
      </mesh>
      {[-3.7, 3.7].map((px) => (
        <mesh key={px} position={[px, 1.5, 0]}>
          <boxGeometry args={[0.3, 3.0, 0.3]} />
          <meshStandardMaterial color={PAL.board} emissive={PAL.board} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* translucent "deposit here" curtain */}
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[7.0, 3.0]} />
        <meshStandardMaterial color={PAL.boardEdge} transparent opacity={0.16} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
