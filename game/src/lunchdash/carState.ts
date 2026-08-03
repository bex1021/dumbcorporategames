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
// `settle` is a post-touchdown launch lockout, in seconds. A car that has just
// slammed down has its suspension compressed and its momentum spent — it does
// not immediately spring off the next hump. Without it, a jump that fell short
// landed on the FAR ramp's back slope and was catapulted straight off it, so
// failing the jump launched you again instead of costing you.
// `rampGate` is the launch gate (m/s) of the ramp we are currently on, held for
// a few frames after leaving its footprint. The launch fires at the LIP — by
// which point the car is already just past the ramp, so sampling the gate at the
// car's position found no ramp and silently fell back to the gentle natural-hill
// threshold. That let an under-speed run launch off a ramp it hadn't earned.
export const carAir = { y: 0, vy: 0, airborne: false, prevGh: 0, climb: 0, settle: 0, rampGate: 0, rampGateT: 0 }
