// The Lunch Dash objective chain. Each stop now has a real pull-in ZONE (x,z)
// that the car must reach AND slow down in to trigger a pickup beat — not a
// drive-by. The two food stops are drive-thru windows (see STOREFRONTS); the
// last stop is the HQ drop-off in front of the tower.

import { DEST_POINTS, STOREFRONTS } from './cityLayout'

export type Destination = {
  id: string
  short: string // minimap / HUD label
  goal: string // one-line objective text
  x: number // pull-in zone — where you actually stop
  z: number
  color: string
  kind: 'drivethru' | 'office'
  holdSeconds: number // how long to sit (slowly) in the zone to complete
  timeCost: number // in-game minutes the stop eats (the wait)
}

const sf = (id: 'bowlz' | 'lunch') => STOREFRONTS.find((s) => s.id === id)!

export const DESTINATIONS: Destination[] = [
  {
    id: 'bowlz',
    short: 'Corporate Slop Bowlz',
    goal: "Pick up the exec's salmon bowl",
    x: sf('bowlz').zx,
    z: sf('bowlz').zz,
    color: '#4f9d69',
    kind: 'drivethru',
    holdSeconds: 2.5,
    timeCost: 1,
  },
  {
    id: 'lunch',
    short: 'Your Lunch',
    goal: 'Grab your own lunch at the drive-thru',
    x: sf('lunch').zx,
    z: sf('lunch').zz,
    color: '#d08b3a',
    kind: 'drivethru',
    holdSeconds: 4,
    timeCost: 4, // your lunch is the real time-sink
  },
  {
    id: 'office',
    short: 'Alignly HQ',
    goal: 'Get the bowl back to the office',
    x: DEST_POINTS.office.x,
    z: DEST_POINTS.office.z + 12, // drop-off pad at the curb in front (south) of the tower
    color: '#4a6da7',
    kind: 'office',
    holdSeconds: 1.2,
    timeCost: 0,
  },
]

export const ZONE_RADIUS = 5.5 // how close to the window counts as "in the zone"
export const PICKUP_MAX_SPEED = 5 // m/s — you must slow to ~11 mph to pull up
