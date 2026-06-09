// Out-of-bounds state for the soft countryside boundary. Plain mutable module
// state (like carState): the Car writes it each frame, the HUD reads it. No
// hard wall — drive out to the country, get a "turn back" warning, and past a
// hard limit you're returned to Alignly HQ.

export const boundary = {
  zone: 'in' as 'in' | 'warning',
  returnPulse: 0, // bumped each time the car is snapped back; HUD flashes a toast
}
