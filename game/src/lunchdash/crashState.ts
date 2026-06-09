// Player-car crash state. Plain mutable module state (like carState): the Car
// writes it on hard impacts, the camera reads `shake`, and the car mesh + HUD
// read the damage tier. Cosmetic only — the car always stays drivable (per the
// blueprint's 4-tier damage model). Reset each run by LunchDash.

export const crash = {
  severity: 0, // accumulates on hard head-on hits → drives the damage tier
  shake: 0, // 0..1 camera-shake impulse, decays each frame
}

export type DamageTier = 'pristine' | 'scuffed' | 'dinged' | 'wrecked'

export function damageTier(severity: number): DamageTier {
  if (severity >= 3) return 'wrecked'
  if (severity >= 1.5) return 'dinged'
  if (severity >= 0.5) return 'scuffed'
  return 'pristine'
}
