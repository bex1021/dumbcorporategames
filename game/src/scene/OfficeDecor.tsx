// Office decoration overlays — the cult-startup layer painted onto the
// Severance bones (white walls + fluorescent ceilings, see Office.tsx and
// Lights.tsx).
//
// What lives here:
//   1. MissionMural — the big feature wall slogan. Mounted on the back
//      wall in the segment between window x=-12 and window x=0, where
//      there's a clean 6m-wide unbroken span at full ceiling height.
//   2. DepartmentSigns — Lumon-style blocky signage above the HR and
//      SYNERGY 2A doorways. Each has a buzzword subtitle that reads like
//      it could appear inside an MDR division.
//
// All decor is non-interactive. Pure visual layer.

import { Text } from '@react-three/drei'
import { OFFICE, ZONES } from '../config/constants'

// Lumon-coded accent. Matches the teal used in Office.tsx room headers.
const TEAL = '#4fa9a3'
const TEAL_DEEP = '#2d6e6a'
const PANEL_BG = '#f6f8f8'
const TEXT_DARK = '#15191c'

export function OfficeDecor() {
  return (
    <group>
      <MissionMural />
      <DepartmentSigns />
      <ValuesPosters />
    </group>
  )
}

// ============================================================
//  Mission mural
// ============================================================

function MissionMural() {
  // FRONT wall mount — the teal accent wall behind PM at spawn (z = +halfDepth).
  // PM has to turn around to see it, which makes it a deliberate "hero" beat
  // instead of something they walk past on the way to NPCs. The whole front
  // wall is unobstructed (just the bathroom door at x=+9, z=+9 well in front
  // of the wall plane) so we get the full 36m to play with — easy to size
  // the panel large enough that text doesn't crop at close range.
  //
  // Rotation π around Y so the panel's text-side (default +Z in Drei <Text>)
  // faces back into the room (-Z direction). Without this, text would render
  // backward when viewed from the room.
  //
  // Offset 0.14m off the wall plane to avoid z-fighting with the front wall.
  const z = OFFICE.halfDepth - 0.14

  return (
    <group position={[0, 0, z]} rotation={[0, Math.PI, 0]}>
      {/* Backing panel — wider than before (6.4m vs 5.6m) so the hero line
          has breathing room and never crops. Stays off-white so it reads as
          a mounted board against the teal wall rather than blending in. */}
      <mesh position={[0, 1.75, 0]} receiveShadow>
        <boxGeometry args={[6.4, 3.2, 0.04]} />
        <meshStandardMaterial color={PANEL_BG} />
      </mesh>
      {/* Teal top stripe — matches new panel width */}
      <mesh position={[0, 3.25, 0.025]}>
        <boxGeometry args={[6.4, 0.08, 0.04]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.2} />
      </mesh>
      {/* Bottom stripe to balance */}
      <mesh position={[0, 0.18, 0.025]}>
        <boxGeometry args={[6.4, 0.04, 0.04]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.15} />
      </mesh>

      {/* Tiny "company motto" label above the main text */}
      <Text
        position={[0, 2.9, 0.03]}
        fontSize={0.16}
        color={TEAL_DEEP}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.004}
        outlineColor={PANEL_BG}
      >
        OUR MISSION
      </Text>

      {/* Main mural text — split across two lines for impact. Shrunk from
          0.42 → 0.34 so the longest line ("WE DON'T BUILD") fits comfortably
          within maxWidth and never sneaks past the panel edges. */}
      <Text
        position={[0, 2.05, 0.03]}
        fontSize={0.34}
        color={TEXT_DARK}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.0}
        textAlign="center"
        fontWeight={700}
        letterSpacing={0.02}
        outlineWidth={0.004}
        outlineColor={PANEL_BG}
      >
        {`WE DON'T BUILD\nSOFTWARE.`}
      </Text>
      <Text
        position={[0, 1.1, 0.03]}
        fontSize={0.42}
        color={TEAL_DEEP}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.0}
        textAlign="center"
        fontWeight={700}
        letterSpacing={0.03}
        outlineWidth={0.004}
        outlineColor={PANEL_BG}
      >
        WE BUILD ALIGNMENT.
      </Text>

      {/* Tiny attribution line — fake founder quote credit */}
      <Text
        position={[0, 0.46, 0.03]}
        fontSize={0.12}
        color={TEAL_DEEP}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        — Alignly founding team, 2019
      </Text>
    </group>
  )
}

// ============================================================
//  Department signs (above HR + SYNERGY 2A doorways)
// ============================================================

// Each room's open-doorway side faces +Z (the player approaches from south).
// The sign sits just above the front edge of the room walls, facing +Z.
const DEPT_SIGNS: Record<string, { subtitle: string }> = {
  hr: { subtitle: 'EMPATHY DIVISION' },
  meeting: { subtitle: 'CROSS-FUNCTIONAL ENABLEMENT' },
}

function DepartmentSigns() {
  return (
    <>
      {ZONES.filter((z) => z.kind === 'room').map((zone) => {
        const config = DEPT_SIGNS[zone.id]
        if (!config) return null
        // Sign mounted above the room front edge (+Z side, since the open
        // doorway faces the office floor). Y is just above the room walls
        // (room walls are 2.4m tall).
        const w = (zone.w ?? 6) * 0.95
        const frontZ = zone.z + (zone.d ?? 4) / 2 + 0.05
        return (
          <DepartmentSign
            key={`sign-${zone.id}`}
            x={zone.x}
            z={frontZ}
            width={w}
            title={zone.label}
            subtitle={config.subtitle}
          />
        )
      })}
    </>
  )
}

function DepartmentSign({
  x,
  z,
  width,
  title,
  subtitle,
}: {
  x: number
  z: number
  width: number
  title: string
  subtitle: string
}) {
  const height = 0.7
  const y = 2.55 // just above the 2.4m room walls
  return (
    <group position={[x, y, z]} rotation={[0, 0, 0]}>
      {/* Sign backing — white panel with thick teal frame strip on top */}
      <mesh receiveShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color={PANEL_BG} />
      </mesh>
      {/* Teal top band — full Lumon hallway header look */}
      <mesh position={[0, height / 2 - 0.06, 0.03]}>
        <boxGeometry args={[width, 0.1, 0.02]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.25} />
      </mesh>
      {/* Bottom thin teal accent */}
      <mesh position={[0, -height / 2 + 0.025, 0.03]}>
        <boxGeometry args={[width, 0.025, 0.02]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.18} />
      </mesh>

      {/* Title — uppercase, bold, dark */}
      <Text
        position={[0, 0.1, 0.04]}
        fontSize={0.28}
        color={TEXT_DARK}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
        fontWeight={700}
      >
        {title.toUpperCase()}
      </Text>
      {/* Subtitle — smaller teal, all caps, wide spacing */}
      <Text
        position={[0, -0.18, 0.04]}
        fontSize={0.13}
        color={TEAL_DEEP}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.22}
        fontWeight={500}
      >
        {subtitle}
      </Text>
    </group>
  )
}

// ============================================================
//  Values posters — distributed across the office walls
// ============================================================

// Six company-values posters in the polished "late-stage startup" style.
// Each follows the same template as the mission mural / department signs
// (white panel, teal accent stripe, big bold word, line of corporate satire)
// so the office reads as a single curated brand system.
type Value = {
  word: string // single-word value title
  body: string // corporate-satire one-liner under it
}

const VALUES: Value[] = [
  {
    word: 'OWNERSHIP',
    body: 'Do the thing before someone tells you to do the thing.',
  },
  {
    word: 'BIAS FOR ACTION',
    body: 'Ship first. Ask questions later. Apologize never.',
  },
  {
    word: 'CUSTOMER OBSESSION',
    body: 'We do not serve customers. We serve customer journeys.',
  },
  {
    word: 'RADICAL CANDOR',
    body: 'Tell each other the hard truths. In passing. Over Slack.',
  },
  {
    word: 'TRUST THE PROCESS',
    body: 'Even when the process is a meeting about a process.',
  },
  {
    word: "WE'RE A FAMILY",
    body: 'Subject to quarterly performance review.',
  },
]

// Wall placements. The office is 36×26m. Side walls are at x=±18 (length 26
// along Z); the front wall is at z=+13 (length 36 along X) and has the
// bathroom door at x=9. We distribute three posters on each side wall + one
// on each side of the bathroom door on the front wall — see comments below.
//
// `facing` controls which way the poster's normal points: 'left' means
// mounted on the left wall (x=-18) facing +X (into the room); 'right'
// means on the right wall facing -X; 'front' means on the front wall
// facing -Z (into the office, away from the wall).
type Placement = {
  value: Value
  facing: 'left' | 'right' | 'front'
  // Position along the wall:
  //   - left/right walls: this is the z-coordinate
  //   - front wall:       this is the x-coordinate
  along: number
  // Height of poster center above the floor.
  y?: number
}

const PLACEMENTS: Placement[] = [
  // Left wall (x=-18) — 3 posters spread along its 26m length
  { value: VALUES[0], facing: 'left', along: -5 },
  { value: VALUES[1], facing: 'left', along: 3 },
  { value: VALUES[2], facing: 'left', along: 9 },
  // Right wall (x=+18) — 3 posters
  { value: VALUES[3], facing: 'right', along: -5 },
  { value: VALUES[4], facing: 'right', along: 3 },
  { value: VALUES[5], facing: 'right', along: 9 },
]

function ValuesPosters() {
  return (
    <>
      {PLACEMENTS.map((p, i) => (
        <ValuePoster key={`val-${i}`} placement={p} />
      ))}
    </>
  )
}

function ValuePoster({ placement }: { placement: Placement }) {
  const { value, facing, along, y = 1.85 } = placement
  // Each wall positions + rotates the poster differently. The poster's
  // local plane lies in XY (facing +Z); we rotate so its normal points
  // into the room.
  let position: [number, number, number]
  let rotation: [number, number, number]
  if (facing === 'left') {
    // Left wall at x = -OFFICE.halfWidth = -18. Poster sits slightly proud
    // of the wall and faces +X (into the room).
    position = [-OFFICE.halfWidth + 0.11, y, along]
    rotation = [0, Math.PI / 2, 0]
  } else if (facing === 'right') {
    position = [OFFICE.halfWidth - 0.11, y, along]
    rotation = [0, -Math.PI / 2, 0]
  } else {
    // Front wall at z = +halfDepth = +13. Faces -Z.
    position = [along, y, OFFICE.halfDepth - 0.11]
    rotation = [0, Math.PI, 0]
  }
  const w = 1.6
  const h = 1.6
  return (
    <group position={position} rotation={rotation}>
      {/* White backing panel — slightly recessed so the teal accent reads
          as a frame around it. */}
      <mesh receiveShadow>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color={PANEL_BG} />
      </mesh>
      {/* Top teal band */}
      <mesh position={[0, h / 2 - 0.06, 0.025]}>
        <boxGeometry args={[w, 0.08, 0.02]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.18} />
      </mesh>
      {/* Bottom teal band */}
      <mesh position={[0, -h / 2 + 0.03, 0.025]}>
        <boxGeometry args={[w, 0.025, 0.02]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.15} />
      </mesh>

      {/* Small kicker above the value name */}
      <Text
        position={[0, 0.55, 0.03]}
        fontSize={0.075}
        color={TEAL_DEEP}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
      >
        ALIGNLY VALUE
      </Text>

      {/* The big value word — bold, dark */}
      <Text
        position={[0, 0.22, 0.03]}
        fontSize={0.22}
        color={TEXT_DARK}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={w - 0.2}
        letterSpacing={0.04}
        fontWeight={700}
      >
        {value.word}
      </Text>

      {/* Body copy below */}
      <Text
        position={[0, -0.25, 0.03]}
        fontSize={0.085}
        color={TEAL_DEEP}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={w - 0.2}
        lineHeight={1.35}
      >
        {value.body}
      </Text>
    </group>
  )
}
