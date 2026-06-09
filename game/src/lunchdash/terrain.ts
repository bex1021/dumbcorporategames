// Terrain elevation for Lunch Dash. Most of the city is flat (height 0); a
// cluster of smooth hills fills the empty northern area (SF/LA-style). The car,
// camera, ground mesh, buildings, trees and beacons all sample this so they sit
// on the terrain. Gaussian bumps = gentle, continuous slopes that taper to flat
// away from the hill district, so the dense flat downtown stays flat.

type Hill = { x: number; z: number; r: number; h: number }

// Hill centers live in the empty north band (z < -120), clear of downtown,
// the park, brownstones, and the river.
const HILLS: Hill[] = [
  { x: -40, z: -205, r: 88, h: 30 },
  { x: 60, z: -180, r: 78, h: 26 },
  { x: 135, z: -160, r: 60, h: 18 },
  { x: 5, z: -160, r: 58, h: 16 },
  { x: 100, z: -230, r: 72, h: 23 },
  { x: -80, z: -165, r: 56, h: 15 },
]

export function terrainHeight(x: number, z: number): number {
  let h = 0
  for (const k of HILLS) {
    const dx = x - k.x
    const dz = z - k.z
    h += k.h * Math.exp(-(dx * dx + dz * dz) / (2 * k.r * k.r))
  }
  return h
}
