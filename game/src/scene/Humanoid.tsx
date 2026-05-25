// Blocky humanoid built from primitives. Faces -Z in local space.
// Two poses: 'stand' and 'sit'. Includes hands, feet, eyes, mouth, neck.

type Props = {
  shirtColor: string
  pantsColor?: string
  skinColor?: string
  hairColor?: string
  pose?: 'stand' | 'sit'
}

const SHOE_COLOR = '#1a1a1a'
const EYE_COLOR = '#1a1a1a'
const MOUTH_COLOR = '#3a2820'

export function Humanoid({
  shirtColor,
  pantsColor = '#2c2c33',
  skinColor = '#d8b89a',
  hairColor = '#2a1e15',
  pose = 'stand',
}: Props) {
  if (pose === 'sit') return <SitPose {...{ shirtColor, pantsColor, skinColor, hairColor }} />
  return <StandPose {...{ shirtColor, pantsColor, skinColor, hairColor }} />
}

function StandPose({
  shirtColor,
  pantsColor,
  skinColor,
  hairColor,
}: Required<Omit<Props, 'pose'>>) {
  return (
    <group>
      {/* Legs */}
      <mesh position={[-0.13, 0.4, 0]} castShadow>
        <boxGeometry args={[0.18, 0.8, 0.22]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      <mesh position={[0.13, 0.4, 0]} castShadow>
        <boxGeometry args={[0.18, 0.8, 0.22]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.13, 0.04, -0.06]} castShadow>
        <boxGeometry args={[0.2, 0.08, 0.34]} />
        <meshStandardMaterial color={SHOE_COLOR} />
      </mesh>
      <mesh position={[0.13, 0.04, -0.06]} castShadow>
        <boxGeometry args={[0.2, 0.08, 0.34]} />
        <meshStandardMaterial color={SHOE_COLOR} />
      </mesh>
      {/* Hip */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.48, 0.2, 0.28]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.3]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.4, 1.3, 0]} castShadow>
        <boxGeometry args={[0.14, 0.65, 0.18]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh position={[0.4, 1.3, 0]} castShadow>
        <boxGeometry args={[0.14, 0.65, 0.18]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {/* Hands */}
      <mesh position={[-0.4, 0.93, 0]} castShadow>
        <sphereGeometry args={[0.085, 12, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.4, 0.93, 0]} castShadow>
        <sphereGeometry args={[0.085, 12, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.63, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.07, 0.1, 10]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      {/* Head — slightly oblong via scale */}
      <group position={[0, 1.78, 0]}>
        <mesh scale={[1, 1.12, 1]} castShadow>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        <Face />
      </group>
      {/* Hair — top half-sphere */}
      <mesh position={[0, 1.84, -0.005]} castShadow>
        <sphereGeometry args={[0.193, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>
    </group>
  )
}

function SitPose({
  shirtColor,
  pantsColor,
  skinColor,
  hairColor,
}: Required<Omit<Props, 'pose'>>) {
  return (
    <group>
      {/* Upper legs (thighs) — horizontal forward (toward -Z, the facing dir) */}
      <mesh position={[-0.13, 0.5, -0.22]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.5]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      <mesh position={[0.13, 0.5, -0.22]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.5]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      {/* Lower legs (shins) — vertical from knee down */}
      <mesh position={[-0.13, 0.25, -0.47]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      <mesh position={[0.13, 0.25, -0.47]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.13, 0.04, -0.55]} castShadow>
        <boxGeometry args={[0.2, 0.08, 0.3]} />
        <meshStandardMaterial color={SHOE_COLOR} />
      </mesh>
      <mesh position={[0.13, 0.04, -0.55]} castShadow>
        <boxGeometry args={[0.2, 0.08, 0.3]} />
        <meshStandardMaterial color={SHOE_COLOR} />
      </mesh>
      {/* Hip */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.3]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.3]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {/* Arms — slightly forward as if resting on desk/lap */}
      <mesh position={[-0.4, 1.0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.18]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh position={[0.4, 1.0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.18]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {/* Hands */}
      <mesh position={[-0.4, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.085, 12, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.4, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.085, 12, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.33, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.07, 0.1, 10]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      {/* Head */}
      <group position={[0, 1.5, 0]}>
        <mesh scale={[1, 1.12, 1]} castShadow>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        <Face />
      </group>
      {/* Hair */}
      <mesh position={[0, 1.56, -0.005]} castShadow>
        <sphereGeometry args={[0.193, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>
    </group>
  )
}

// Eyes + nose + mouth on the -Z face of the head.
function Face() {
  return (
    <group>
      {/* Eyes */}
      <mesh position={[-0.075, 0.03, -0.16]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color={EYE_COLOR} />
      </mesh>
      <mesh position={[0.075, 0.03, -0.16]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color={EYE_COLOR} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, -0.01, -0.185]}>
        <sphereGeometry args={[0.028, 8, 6]} />
        <meshStandardMaterial color="#c89a78" />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, -0.06, -0.165]}>
        <boxGeometry args={[0.06, 0.012, 0.005]} />
        <meshStandardMaterial color={MOUTH_COLOR} />
      </mesh>
    </group>
  )
}
