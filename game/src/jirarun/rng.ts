// Seeded pseudo-random number generator for Jira Run.
//
// Why this exists: the live game shuffles obstacles with Math.random(), which
// is fine for players but useless for testing — a bad layout can never be
// reproduced. The headless playtest harness needs DETERMINISM: the same seed
// must always produce the exact same run, so when the robot tester finds an
// unfair or impossible layout, we can replay that precise seed and watch it.
//
// mulberry32: a tiny, fast, well-distributed 32-bit PRNG. Same shape as
// Math.random (returns a float in [0, 1)), so it drops straight into the
// existing makeRow(level, rand) / gap / token code paths.

export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return function next(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
