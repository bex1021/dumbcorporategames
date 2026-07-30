// The tiered fight script — the corporate-speak as a CONVERSATION, not barks.
// (Wires Blocked_Phase4_Dialogue_Script.md, screened + approved.)
//
// Every line belongs to an intensity tier 1–4 (Cordial → Probing → Tense →
// Hostile). The sim asks for a line by (fighter, slot, tier); tiers only ever
// ratchet UP within a fight (a meeting doesn't get friendlier), and lines
// advance SEQUENTIALLY within a tier — next unused line, wrap around — so
// exchanges progress instead of shuffling. Pure data + cursors: no browser
// APIs, safe for the headless playtest harness.

export type Tier = 1 | 2 | 3 | 4

// slot = a move id ('clarify', 'jab'…) or a defensive beat ('block', 'dodge').
type TierLines = [string[], string[], string[], string[]]
type ScriptSide = Record<string, TierLines>

const LEONARD: ScriptSide = {
  clarify: [
    ['Quick clarification—', 'Just to level-set—', 'One small thing—'],
    ['To be clear—', 'Sorry, to be precise—', 'Point of order—'],
    ['No — that’s not what I said.', 'Let me correct the record.', 'That’s not accurate.'],
    ['That is categorically false.', 'Read the thread.', 'I have it in writing.'],
  ],
  pushback: [
    ['I’d gently push back on that.', 'Can I offer a different view?'],
    ['I’m going to push back on that.', 'I have to disagree there.'],
    ['That’s a hard no from me.', 'Respectfully — absolutely not.'],
    ['Over my dead body.', 'We are NOT doing that.'],
  ],
  offline: [
    ['Let’s take this offline.', 'I’ll grab time with you.'],
    ['Let’s set up a working session.', 'This needs its own meeting.'],
    ['I’m putting time on your calendar. Today.', 'We’re resolving this offline.'],
    ['You and me. Conference room. Now.', 'We are settling this offline.'],
  ],
  phased: [
    ['We’re derisking via a phased approach.', 'Per the roadmap—'],
    ['We’re derisking via a phased approach.', 'Per the roadmap—'],
    ['Let me walk you through the timeline.', 'Per the roadmap—'],
    ['Let me walk you through the timeline.', 'Per the roadmap—'],
  ],
  block: [
    ['Mm-hm.', 'Totally.', 'Good point, good point.'],
    ['I hear you.', 'That’s fair.', 'Noted.'],
    ['…okay.', 'Sure.', 'If you say so.'],
    ['Uh-huh.', 'Right.'],
  ],
  dodge: [
    ['Noted.', 'I’ll take that as an action item.'],
    ['Noted.', 'I’ll take that as an action item.'],
    ['Let me not speak out of turn.', 'I’ll circle back on that.'],
    ['Let me not speak out of turn.', 'I’ll circle back on that.'],
  ],
}

const EXEC: ScriptSide = {
  jab: [
    ['Quick question.', 'Just curious—', 'Help me understand—'],
    ['Walk me through this.', 'Say more about that.', 'And the thinking there was…?'],
    ['Let me stop you.', 'That doesn’t track.', 'Is that… true?'],
    ['Let’s be honest with each other.', 'We both know that isn’t right.'],
  ],
  heavy: [
    ['Let’s double-click on that.', 'Let’s go a level deeper.'],
    ['I want to pressure-test this.', 'Let’s unpack that.'],
    ['Let’s really look at this.', 'I’m not moving on.'],
    ['We are going to sit here until this is real.'],
  ],
  // The sandbag's grab is "Circle Back"; at higher tiers it borrows the PIP
  // register from the script (the grab IS the development conversation).
  grab: [
    ['Let’s circle back offline.', 'Let’s find some time.'],
    ['Let’s talk about your growth areas.'],
    ['I want to make sure you’re set up for success.', 'This is a development conversation.'],
    ['Let’s align on expectations.', 'I’m going to be direct with you.'],
  ],
  parry: [
    ['Actually — great point.', 'You know what? You’re right.'],
    ['Actually — great point.', 'You know what? You’re right.'],
    ['Say that again. I want to write it down.', 'Interesting. I’ll remember that.'],
    ['Say that again. I want to write it down.', 'Interesting. I’ll remember that.'],
  ],
  block: [
    ['Go on.', 'Sure.'],
    ['Interesting.', 'Say more.'],
    ['Mm.', 'Noted.'],
    ['Mm.'],
  ],
  dodge: [
    ['Hm.', 'Let’s park that.'],
    ['Hm.', 'Let’s park that.'],
    ['Let’s stay on track.', 'Park it.'],
    ['Let’s stay on track.', 'Park it.'],
  ],
}

// ── Bout 1: BRENT — pedantic, escalates from citation to refusal ────────────
const BRENT: ScriptSide = {
  wellActually: [
    ['Well, actually—', 'Technically—'],
    ['That’s not quite right.', 'Per the spec—'],
    ['That will not pass review.', 'This breaks the contract.'],
    ['Absolutely not.', 'Read the RFC.'],
  ],
  scopeConcern: [
    ['That’s a bigger lift than it sounds.'],
    ['We’d be taking on tech debt.'],
    ['This is architecturally unsound.'],
    ['I will not own this pager.'],
  ],
  block: [
    ['I’d need to look into it.', 'Hm.'],
    ['Needs more detail.', 'Define "done."'],
    ['It’s on the backlog.', '…'],
    ['No.'],
  ],
  dodge: [
    ['Out of scope.', 'Not my ticket.'],
    ['Out of scope.', 'Not my ticket.'],
    ['Take it to architecture review.', 'Let’s not rathole.'],
    ['Take it to architecture review.', 'Let’s not rathole.'],
  ],
}

// ── Bout 2: PRIYA — scope creep, escalates from "tiny" to "everything" ──────
const PRIYA: ScriptSide = {
  tinyThought: [
    ['Tiny thought—', 'Not a request, but—'],
    ['While we’re in here—', 'Small flag—'],
    ['The user won’t accept that.', 'This misses the brief.'],
    ['This is not shippable.', 'Users will churn.'],
  ],
  quickAdd: [
    ['Can it also—', 'Quick add—'],
    ['Just one more flow—', 'And a settings page—'],
    ['It also needs mobile.', 'And offline mode.'],
    ['And onboarding. And the footer.'],
  ],
  circleBack: [
    ['Let’s zoom out.'],
    ['Is this what the user actually wants?'],
    ['I want to challenge the premise.'],
    ['This isn’t about the portal, is it.'],
  ],
  block: [
    ['Let me socialize this.', 'Hm.'],
    ['I’ll check with stakeholders.', 'Interesting.'],
    ['Stakeholders won’t love that.', 'Mm.'],
    ['Noted.'],
  ],
  dodge: [
    ['Parking that.', 'Noted for the roadmap.'],
    ['Parking that.', 'Noted for the roadmap.'],
    ['Backlog. Next.', 'Roadmap item.'],
    ['Backlog. Next.', 'Roadmap item.'],
  ],
}

const SIDES: Record<string, ScriptSide> = {
  leonard: LEONARD,
  exec: EXEC,
  brent: BRENT,
  priya: PRIYA,
}

// ── Tier from fight state (ratchet-up handled by the caller via maxTier) ────
// minHealthFrac = the lower of the two bars (0–1); timeLeft = seconds on clock.
export function tierFor(minHealthFrac: number, timeLeft: number): Tier {
  if (minHealthFrac < 0.15 || timeLeft < 20) return 4
  if (minHealthFrac < 0.35) return 3
  if (minHealthFrac < 0.65) return 2
  return 1
}

// ── Sequential cursors: (fighter, slot, tier) → next line, wrapping ─────────
let cursors: Record<string, number> = {}

export function resetScript(): void {
  cursors = {}
}

/** Next line for this voice/slot at this tier; null if the script has none
 *  (caller falls back to the move's own `line`). Voice = 'leonard' or the
 *  active opponent's script side ('exec' | 'brent' | 'priya'). */
export function nextLine(fighter: string, slot: string, tier: Tier): string | null {
  const pool = SIDES[fighter]?.[slot]?.[tier - 1]
  if (!pool || pool.length === 0) return null
  const key = `${fighter}:${slot}:${tier}`
  const i = cursors[key] ?? 0
  cursors[key] = (i + 1) % pool.length
  return pool[i]
}
