---
name: fight-move-playtest
description: Mandatory verification gauntlet after ANY change to Phase 4 fight moves — new/edited Mixamo clips, frameData.ts numbers, AnimatedFighter.tsx trims/routing, fighterState.ts hit logic, or fightAudio.ts cues. Runs four gates (clip anatomy → sim/animation sync → measured audio → eyes-on capture) and reports each with its number or image. Trigger whenever wiring a combat move, importing a fight clip, adjusting trims/timings/reach, or editing fight sound — do not wait to be asked, and NEVER report a fight-move change as done without this skill's report.
---

# Fight-Move Playtest

Run this after every change to the Performance Review fight's moves, clips, or
audio. It exists because "the event fired" and "the hitbox overlapped" were
repeatedly reported as *fixed* while the player saw silent kicks, missing
uppercuts and no reactions. Each gate closes a specific way that happened.

**The one rule that outranks everything: a gate that cannot run is a FAIL, not
a skip.** Every false "fixed" came from substituting a reachable check for the
real one. If a gate is blocked, the report says `FAIL: unverified — <why>` and
the user decides. Never "pass by proxy," never "should work."

All commands run from `game/`. Dev server must be up for gates 3–4
(`npm --prefix game run dev`, or the running preview server — check the port).

## Gate 1 — Clip anatomy (headless, exact)

For any NEW or re-imported clip:

```bash
node scripts/mixamo/check-rootmotion.mjs        # add the slot to its list first
node scripts/mixamo/strip-horizontal.mjs <slot> # if root motion was baked in
node scripts/mixamo/analyse-clip.mjs <slot> 3   # per-frame anatomy
node scripts/mixamo/measure-new.mjs             # contacts by limb SPEED + loop seams
node scripts/mixamo/measure-direction.mjs <slot> # WHICH WAY a fall/reaction goes
```

Heights and speeds cannot see DIRECTION — a backward fall and a forward crumple
have identical hip-height profiles, and one got shipped mislabelled as the
other. For any fall/knockdown clip, run measure-direction: head-vs-hips along
facing at the settled pose tells you which way the body actually lies.

Read the anatomy table, not just the peaks. Answer in the report:
- **What is each phase?** (airborne spans, hand-high spans, hip drops, dead
  anticipation frames). The combo clip shipped with every uppercut trimmed off
  because only speed peaks were read, not what the limbs were doing.
- **Root motion?** In-place clips only — the sim owns position. (Walk drifted
  0.5m/cycle, the kick 3.3m; travelling strikes get it back via `lunge`.)
- **Loop seams** for loops: per-bone drift vs the idle control (≈0.0000).
- **Dead frames at the start of REACTION clips** — trim to the flinch onset or
  the victim stands still after contact (`hit` lost 6 frames, `guthit` 7).

Contract: `analyse/measure` scripts read the GLBs directly; but
`verify-trim.mjs` carries copies of `ATTACK_TRIM`/window tables — **update them
in the same edit** or it passes on stale values (it did, twice).

## Gate 2 — Sim ↔ animation sync (headless, exact)

```bash
node scripts/mixamo/verify-trim.mjs      # trims contain the strike & fit windows
npx tsx scripts/playtest/move_audit.ts   # drift, connects, states, pass-through
npx tsx scripts/playtest/reach_sweep.ts  # connect range vs configured reach
npx tsx scripts/playtest/cue_audit.ts    # every move sounds in EVERY outcome
npx tsx scripts/playtest/phase4.ts       # balance harness still clean
```

Hard limits:
- **Drift ≤ 4 frames** between each measured animation contact and its sim hit
  (`move_audit.ts` prints `drift [...]`). Uneven combos use `reArmSeq`, never a
  forced uniform `reArm`.
- **All hits of a multi-hit connect** at 0.9 / 1.4 / 1.9m. Only the FINAL hit
  of a flurry floors (`floors` flag) — hit-1 knockdown shoved victims out of
  hits 2–5.
- **No pass-through**: `closest gap` never < 0 and respects `ARENA.minGap`.
- **Reach must match the limb**: damage registering where the limb is visibly
  short reads as fake (kick shipped at 1.62 connecting from 2.1m; the `lunge`
  closes distance, not the hitbox).
- **Defender reaction state begins on the contact frame** and heavy staggers
  route to `guthit` + shove (the victim leaving the leg's arc is what sells
  contact — there is no physics to prevent interpenetration).
- Update `move_audit.ts`'s `VISUAL` table from Gate 1's measurements — it is a
  copy and goes stale like `verify-trim`.

## Gate 3 — Audio, measured not asserted

Open `http://localhost:<port>/audio-test.html` in a REAL browser (the
claude-in-chrome tools work; click **Run all cues** — Web Audio needs the
gesture). The page imports `fightAudio.ts` directly, so it is immune to the
render-loop stall. **Run it twice; the first run after context creation reads
~20 dB low (resume() race). Re-run after EVERY audio edit, no exceptions** —
that habit caught the double-envelope bug the same day it was written.

Limits:
- Impacts between **−4 and −0.5 dBFS**; swings/whiffs between **−24 and −18**
  (Rebecca asked twice for quieter whooshes — the swing is texture, the impact
  is the event; keep ~18 dB between them); nothing over 0.
- **Envelope shape, not just level** — a peak meter cannot hear the difference
  between a whoosh and a click. Whooshes need an attack ramp (`noise(...,
  attack > 0)`); impacts keep instant attack. Known traps, all shipped once:
  - `tone(type, f0, f1, DUR, GAIN, delay)` — duration before gain.
  - Ramped noise must NOT also get the gain-node decay (double envelope
    crushed a 0.9-gain swell to 0.05 peak).
  - The crack layer, not the sub, is what reads as a hard hit.
- `cue_audit.ts` (Gate 2) proves coverage; this gate proves audibility. Both.

## Gate 4 — Eyes on the move

```bash
node scripts/playtest/capture_move.mjs <moveId> --gap 1.2 [--bout priya]         # sandbag: geometry
node scripts/playtest/capture_move.mjs <moveId> --gap 1.2 --live [--bout priya]  # LIVE AI: interaction
```

Headless Puppeteer (virtual display — immune to the tab-visibility stall that
blanks every interactive pane), real key input, CDP-screencast frames labelled
with per-frame sim state in `playtest-captures/<moveId>/`.

**BOTH runs are mandatory** (Rebecca: "you can't be testing against a passive
sandbag"). The sandbag proves geometry; only `--live` proves the move functions
against the real opponent — the kick passed every sandbag check while the live
AI stuffed or blocked ALL SIX attempts (0 clean hits), so its reaction was
never seen in play. `--live` retries up to 6 times and prints whether the move
ever CONNECTED; "never connected" is itself a finding (the move may need armor,
different timing, or a different role). One live run also caught the flurry's
victim recovering mid-string and blocking hits 3–4 (stagger 30f < hit gap 50f
→ combo-stringing rule in applyHit).

Run captures ALONE — a balance harness or tsc running concurrently starves the
page and the navigation times out. If `fight.started` never goes true on a
healthy build, restart the dev server first (a long HMR session wedges it);
`scripts/playtest/console_check.mjs` dumps boot state + console errors.

**Open the frames with the Read tool and LOOK at them.** Answer each, in the
report, per move changed:
1. Wind-up readable before the hit frame (anticipation pose, not a teleport)?
2. On the first `active`/contact frame, is the limb VISUALLY touching?
3. Does the opponent's reaction start on that same frame?
4. Any interpenetration held across multiple frames?
5. Recovery returns to guard — no pose pop, no T-pose?

Also capture at `--gap 0.8` and `2.0` when reach or lunge changed. New moves
need their key added to `KEY_FOR` in `capture_move.mjs`.

Do NOT verify visuals through the in-app preview pane or interactive Chrome
tabs: they report `visibilityState: hidden`, which stalls R3F entirely — every
black-canvas "bug" chased this month was that. Screenshots come from this
harness or the press shooter, nowhere else.

## Standing rules (each shipped as a bug once)

- **Edits assert, probes verify.** Two systemic bugs hid for days: (1) python
  replaces whose match string had drifted no-opped SILENTLY — whole retime
  tables existed only in reports, never on disk; every scripted edit must
  assert its match. (2) A trailing `else { timeScale = 1 }` clobbered every
  reaction's rate even when the table was right — reading the source said one
  thing, the running action said another. After wiring, verify ON THE PAGE:
  `window.__trims` (built trims + action durations) and `window.__animDebug`
  (live per-fighter clip/time/timeScale/weight). `probe_fall.mjs` is the
  pattern. The action's `dur` proves the trim; its `ts` proves the rate.
- **Fall/reaction clips: measure DIRECTION before wiring** (measure-direction
  — heights cannot see it; "Stunned" fell backward while named like a daze).

- **No text painted on the floor texture, ever.** The camera dollies, so any
  baked stretch is right at one distance only. Text lives on vertical surfaces
  or camera-facing billboards, at natural glyph aspect. Resize the text, never
  stretch it.
- Mixamo exports: **FBX Binary, Without Skin, In Place** where offered. Named
  `<slot>.fbx` in `scripts/mixamo/incoming/`, then `npm run mixamo:import`.
- New clip slots: URL + `HAS_*` flag flip in the SAME commit (URLs are fetched
  on mount; a missing file fails the whole fighter).
- Strikes must be visually distinct from throws (unblockable ≠ looks like a
  kick) — flag any move whose kind and look disagree.
- All motion time-based; photosensitivity rules apply to fight effects.

## Report format (mandatory)

```
GATE 1 clip anatomy      PASS/FAIL — <numbers: contacts, root motion, seams>
GATE 2 sync              PASS/FAIL — drift [...], connects at [...], harness clean
GATE 3 audio             PASS/FAIL — <the dBFS table>
GATE 4 eyes-on           PASS/FAIL — <which frames, what they show>
NOT VERIFIED             <anything not covered, stated plainly>
```

Fix-and-rerun until green or explicitly blocked. A blocked gate is reported as
FAIL with the reason — the user decides what to do with it.
