// Canonical locks for Blocked MVP. Sourced from MVP locks decision (2026-05-24).
// Do not change these without explicit revisit — they shape feel and content.

export const OFFICE = {
  width: 36, // x-extent, meters
  depth: 26, // z-extent, meters
  wallHeight: 3.5,
  // Office is centered at origin, so bounds are [-w/2, +w/2] etc.
  get halfWidth() {
    return this.width / 2
  },
  get halfDepth() {
    return this.depth / 2
  },
} as const

export const PLAYER = {
  walkSpeed: 4.2, // m/s — forward walking speed
  backwardSpeedFactor: 0.6, // backward is 60% of forward (tank-control convention)
  accel: 14, // how quickly velocity approaches target (1/s); higher = snappier
  rotationSpeed: 2.6, // rad/s when turning with left/right (≈ 150°/sec)
  radius: 0.4,
  height: 1.85,
  // Spawn position: standing next to his chair, just clear of the chair's
  // right side and the desk's footprint. PM-desk zone is at (-9, _, 9), the
  // chair is behind it at (-9, _, 9.65). Putting PM at (-8, _, 10.3) places
  // him to the right of the chair (his left side faces it) and clear of the
  // desk's z-range (8.6 to 9.4) and the chair's z-range (9.4 to 9.9).
  // Facing y=0 keeps him looking toward the office interior (-Z), ready to
  // walk into the room.
  spawnX: -8,
  spawnZ: 10.3,
  shirtColor: '#5b6b8a', // muted blazer blue
  pantsColor: '#2c2c33',
} as const

export const CAMERA = {
  distance: 3.5, // meters behind PM
  height: 2.0, // meters above ground
  lookHeight: 1.2, // looks at PM's chest, not feet
  fov: 62,
  // Camera is rigidly behind PM — no rotation lag. Player should always see
  // the back of Leonard's head, and "up arrow" always means "walk into screen".
  // Camera position is clamped inside the office with this margin so it can't
  // pass through walls.
  boundsMargin: 0.4,
} as const

// Role-coded NPC palette + GLB assignments.
// Each NPC has:
//   - color: a chest-badge accent color for at-a-glance ID
//   - glb: the GLB model to load (sitting or standing variant from Mixamo)
//   - x, z, pose: world position + pose category
export const NPCS = [
  {
    id: 'brent',
    name: 'Brent',
    role: 'Eng',
    color: '#6b7a8f', // slate badge
    glb: '/models/Male1_Sitting.glb',
    x: -12,
    z: 1,
    pose: 'sit' as const,
    required: true,
    bark: "I'm going to pretend that helped.",
  },
  {
    id: 'tasha',
    name: 'Tasha',
    role: 'Design',
    color: '#c47a9a', // pastel pink badge
    glb: '/models/Female1_Sitting.glb',
    x: -12,
    z: -5,
    pose: 'sit' as const,
    required: true,
    bark: "I've updated the file name to final_final_really_final.",
  },
  {
    id: 'priya',
    name: 'Priya',
    role: 'Product',
    color: '#7aa66c', // sage badge
    glb: '/models/Female1_Sitting.glb',
    x: 0,
    z: -5,
    pose: 'sit' as const,
    required: true,
    bark: 'Tiny thought. Not a request. Unless it’s easy.',
  },
  {
    id: 'chad',
    name: 'Chad',
    role: 'Sales',
    color: '#3a4f7a', // navy badge
    glb: '/models/Male1_Sitting.glb',
    x: 12,
    z: -5,
    pose: 'sit' as const,
    required: true,
    bark: "Great news, the client loved the thing we haven't built.",
  },
  {
    id: 'diane',
    name: 'Diane',
    role: 'HR',
    color: '#a89876', // beige badge
    glb: '/models/Female1_idle.glb',
    x: -10,
    z: -10,
    pose: 'stand' as const, // stands inside HR office
    required: true,
    bark: "I'm hearing some themes.",
  },
  {
    id: 'printer',
    name: 'Printer',
    role: 'Object',
    color: '#d9d3c4',
    glb: null,
    x: 0,
    z: 1,
    pose: 'object' as const,
    required: false,
    bark: 'PC LOAD LETTER.',
  },
  {
    id: 'phyllis',
    name: 'Phyllis',
    role: 'Plant',
    color: '#6b8e5a',
    glb: null,
    x: 12,
    z: 9,
    pose: 'object' as const,
    required: false,
    bark: '…',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    role: 'Coffee',
    color: '#8a9499',
    glb: null,
    x: 0,
    z: 9,
    pose: 'object' as const,
    required: false,
    bark: 'It is warm. That is its main accomplishment.',
  },
] as const

// ---- Object-NPC interactions ----
// The Printer and Phyllis don't have dialogue trees — they have run-limited
// "press E to interact" mechanics. Each press applies a small meter effect
// and pops a rotating bark line from an escalating script.
//
// Single-purpose effects (project +3 / pissedOff -2 / etc.) match the
// scale of the coping bar actions — small but real, and capped at 5 uses
// per run so they're strategic (when do you spend them?).
import type { Effects } from '../state/gameStore'

export type ObjectInteraction = {
  // Verb-phrase shown in the interact prompt button. We append the
  // progress count ('(n/maxUses)') in InteractPrompt so the player sees
  // there's something to chase.
  actionLabel: string
  maxUses: number
  effects: Effects // applied on each press
  // One bark per use, in order. Last one is the 5th press payoff.
  barks: string[]
  // Bark shown on the 6th+ press, once maxed out.
  exhaustedBark: string
  // Optional achievement ID granted on reaching maxUses.
  // (Conditions live in src/content/achievements.ts which reads copingUseCounts.)
  achievementHint?: string
}

export const OBJECT_INTERACTIONS: Record<string, ObjectInteraction> = {
  printer: {
    actionLabel: 'Unjam the printer',
    maxUses: 5,
    // The Printer is cathartic to scream at. Project goes up because you
    // channeled rage into the wrong object instead of into a meeting.
    effects: { time: 3, projectStatus: 3, pissedOff: -2 },
    barks: [
      'PC LOAD LETTER.',
      'PRINTER NOT READY. PRINTER IS NEVER READY.',
      'PAPER JAM ON LINE 32. SOUL JAM ON LINE 40.',
      'HUMANS ARE THE TRUE LEGACY SYSTEM.',
      'I HAVE OBSERVED YOU. I HAVE NOTHING ELSE TO TELL YOU.',
    ],
    exhaustedBark: 'YOU HAVE HARMED ME ENOUGH. SCAN A DOCUMENT.',
    achievementHint: 'printer-prophet',
  },
  phyllis: {
    actionLabel: 'Vent to Phyllis',
    maxUses: 5,
    // Venting to a plant is the best 1:1 you'll get this quarter.
    // Pissed-Off drops; alignment drops because you weren't producing work.
    effects: { time: 3, pissedOff: -6, alignment: -1 },
    barks: [
      '…',
      '…?',
      '…!',
      'Phyllis has noted your concerns and rated them: valid.',
      'Phyllis has nothing to add. Phyllis is your best 1:1 this quarter.',
    ],
    exhaustedBark: 'Phyllis is requesting boundaries.',
    achievementHint: 'plant-friend',
  },
  coffee: {
    actionLabel: 'Grab a coffee',
    maxUses: 5,
    // 5min per cup, slight calming effect (caffeine + ritual), tiny alignment
    // tax because you went for coffee instead of producing work.
    effects: { time: 5, pissedOff: -3, alignment: -1 },
    barks: [
      'Mediocre coffee. Aggressive ceramic mug.',
      'The pot was empty. Of course it was. You made a new one. For everyone else.',
      'You drink it standing, like a real American.',
      'Caffeine and existential dread, roughly equal proportions.',
      'Five cups in. You ARE the coffee now.',
    ],
    exhaustedBark: 'The coffee machine has logged your dependency. HR has been notified.',
  },
}

// Zones are floor markers + signs. Desks come from NPC positions (each NPC has
// a desk behind them). Rooms (HR, SYNERGY 2A) get partition walls.
export const ZONES = [
  { id: 'pm-desk', label: 'PM Desk', kind: 'desk', x: -9, z: 9 },
  // Coffee moved to NPCS roster as an interactive object NPC. See OBJECT_INTERACTIONS.
  // Bathroom is now a real room (see Bathroom.tsx) carved into the front-right
  // corner — colliders below + geometry in Bathroom.tsx. "Cry in Bathroom"
  // coping action teleports PM inside.
  { id: 'hr', label: 'HR Office', kind: 'room', x: -10, z: -10, w: 6, d: 4 },
  { id: 'meeting', label: 'SYNERGY 2A', kind: 'room', x: 10, z: -10, w: 6, d: 4 },
] as const

// Windows on the back wall (z = -halfDepth). Frame width × height.
export const WINDOWS = [
  { x: -12, w: 5, h: 2 },
  { x: 0, w: 5, h: 2 },
  { x: 12, w: 5, h: 2 },
] as const

// Rectangular wall colliders for partitioned rooms (HR, SYNERGY 2A, Bathroom).
// Each room has back + left + right walls; the front (+Z side) is open as a
// doorway. Axes are world XZ; player collides against these.
export const ROOM_COLLIDERS = [
  // HR Office (center -10, -10, size 6×4)
  { minX: -13, maxX: -7, minZ: -12.04, maxZ: -11.96 }, // back wall
  { minX: -13.04, maxX: -12.96, minZ: -12, maxZ: -8 }, // left wall
  { minX: -7.04, maxX: -6.96, minZ: -12, maxZ: -8 }, // right wall
  // SYNERGY 2A (center 10, -10, size 6×4)
  { minX: 7, maxX: 13, minZ: -12.04, maxZ: -11.96 }, // back wall
  { minX: 6.96, maxX: 7.04, minZ: -12, maxZ: -8 }, // left wall
  { minX: 12.96, maxX: 13.04, minZ: -12, maxZ: -8 }, // right wall
  // Bathroom (front-right corner, bounds x=14..18, z=10..13)
  // The office's front wall (z=+13) and right wall (x=+18) form 2 sides
  // automatically; we only need to collide the new partition walls.
  // Front partition at z=10, full width
  { minX: 14, maxX: 18, minZ: 9.96, maxZ: 10.04 },
  // Left partition at x=14, SPLIT by a 1m doorway at z=11..12
  { minX: 13.96, maxX: 14.04, minZ: 10, maxZ: 11 },
  { minX: 13.96, maxX: 14.04, minZ: 12, maxZ: 13 },
] as const
