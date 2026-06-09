// The Lunch Dash objective chain. Coordinates come from cityLayout's
// DEST_POINTS (so the city generator can clear space around each stop); the
// labels / goals / colors live here. A fuller errand system comes later; this
// is the route that makes the drive purposeful.

import { DEST_POINTS } from './cityLayout'

export type Destination = {
  id: string
  short: string // minimap / HUD label
  goal: string // one-line objective text
  x: number
  z: number
  color: string
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'bowlz',
    short: 'Corporate Slop Bowlz',
    goal: "Pick up the exec's salmon bowl (downtown)",
    ...DEST_POINTS.bowlz,
    color: '#4f9d69',
  },
  {
    id: 'lunch',
    short: 'Your Lunch',
    goal: 'Grab your lunch across the river (use a bridge)',
    ...DEST_POINTS.lunch,
    color: '#d08b3a',
  },
  {
    id: 'office',
    short: 'Alignly HQ',
    goal: 'Head back to Alignly HQ',
    ...DEST_POINTS.office,
    color: '#4a6da7',
  },
]

export const ARRIVAL_RADIUS = 8 // m — how close to a destination counts as "arrived"
