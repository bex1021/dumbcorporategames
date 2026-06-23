// The "camera + light" layer — cinematic post-processing that makes the
// hand-built low-poly city read as PHOTOGRAPHED rather than flatly rendered.
// This is the single biggest "feel real" upgrade and it adds zero new geometry:
// it just finishes the existing frame the way a film camera + colourist would.
//
// Kept deliberately TASTEFUL. Over-processing (crushed blacks, a bloom haze over
// everything, neon saturation) looks worse than none — the goal is "shot on a
// real camera", not "Instagram filter". Each effect is dialled low on purpose.

import { EffectComposer, N8AO, Bloom, HueSaturation, BrightnessContrast, Vignette, SMAA } from '@react-three/postprocessing'

export function CinematicEffects() {
  return (
    // multisampling 0 → SMAA handles anti-aliasing at the end (avoids a known
    // MSAA-depth clash with the AO pass on some GPUs)
    <EffectComposer multisampling={0}>
      {/* Ambient occlusion — soft contact-shadow in every crevice and wherever
          an object meets the ground. THE grounding effect: without it, objects
          read as stickers floating on the floor; with it, they sit in the
          world. Half-res + medium quality keeps it cheap. */}
      <N8AO halfRes quality="medium" aoRadius={6} distanceFalloff={1} intensity={1.5} color="#0a0a0f" />
      {/* Bloom — a gentle glow on the BRIGHTEST things only (sky, sunlit faces,
          brake lights, beacons). High threshold so it's a highlight, not a haze. */}
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={0.35} />
      {/* Colour grade — a hair more saturation + contrast, like a film LUT. */}
      <HueSaturation saturation={0.07} />
      <BrightnessContrast brightness={0.0} contrast={0.07} />
      {/* Lens vignette — subtle corner darkening to focus the eye on the car.
          Kept light so peripheral traffic stays visible (it's a driving game). */}
      <Vignette offset={0.36} darkness={0.42} />
      {/* Anti-aliasing, applied last to the finished image. */}
      <SMAA />
    </EffectComposer>
  )
}
