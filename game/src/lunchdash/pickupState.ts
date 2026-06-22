// Live state of the current pull-in pickup — written by <ObjectiveDetector>,
// read by the HUD to show the "at the window" prompt + progress bar.

export const pickup = {
  inZone: false, // car is in the active stop's pull-in zone
  filling: false, // ...and slow enough that the pickup is progressing
  progress: 0, // seconds held
  need: 1, // seconds required
  prompt: '',
}

export function resetPickup() {
  pickup.inZone = false
  pickup.filling = false
  pickup.progress = 0
  pickup.need = 1
  pickup.prompt = ''
}
