import { Vector3 } from 'three'

// Per-frame mutable car transform — mirrors src/state/playerState.ts.
// Mutated in place by <Car>, read by <DriveCamera> and <DriveHud>. NOT React
// state: avoids 60fps re-renders.
export const carPosition = new Vector3(0, 0, 0)
export const carFacing = { y: 0 } // heading in radians (forward = -Z at y=0)
export const carTelemetry = { speed: 0 } // signed longitudinal speed, m/s

// Vertical / "air" state for catching air over hill crests. `y` is the car's
// ACTUAL height — equal to the terrain when grounded, above it mid-jump. <Car>
// integrates it; <DriveCamera> reads it so the view follows the car off a ramp.
export const carAir = { y: 0, vy: 0, airborne: false, prevGh: 0, climb: 0 }
