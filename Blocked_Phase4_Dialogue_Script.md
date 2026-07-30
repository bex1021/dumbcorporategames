# Blocked — Phase 4 Dialogue Script (Performance Review)

> **Purpose.** Make the corporate-speak read like a *conversation that escalates*,
> not random barks. Draft for Rebecca to screen — cut, rewrite, reorder freely.
> Companion to `Blocked_Phase4_Blueprint.md`. Wiring plan at the bottom.

## The core idea: the fight has an emotional arc, and the dialogue rides it

A real 4:30 status meeting doesn't stay one temperature. It opens cordial, gets
probing, goes tense, and — if it's going badly — turns openly hostile. So every
line is tagged to an **intensity tier**, and the fight pulls lines from the tier
that matches the current **tension**. As bars drain and the Hard Stop clock
bleeds, both fighters climb the tiers. The meeting visibly sours. *That* is what
makes it feel like a conversation.

### The four tiers

| Tier | Name | When it plays | Voice |
|---|---|---|---|
| **1** | **Cordial** | Opening ~30s, both above ~70% | Faux-warm, pleasant, "we're all aligned here" |
| **2** | **Probing** | Damage traded, one bar under ~65% | Polite pressure, gloves loosening |
| **3** | **Tense** | A bar under ~35%, or Round 2–3 | Direct, clipped, the meeting's clearly going badly |
| **4** | **Hostile** | A bar under ~15%, or Hard Stop desperation | Mask off, open conflict, desperation |

**Tension** = a 0–1 value from: how much total health is gone, which round it is,
and how close the clock is to Hard Stop. It only ever ratchets *up* within a
round (a meeting doesn't get friendlier). Lines advance **sequentially** within a
tier (next unused line, no immediate repeats) so exchanges progress instead of
shuffling.

---

## LEONARD (you) — moves × tiers

Each cell lists the lines for that move at that temperature; the game speaks them
in order.

### Clarify (jab)
| Tier | Lines |
|---|---|
| 1 Cordial | "Quick clarification—" · "Just to level-set—" · "One small thing—" |
| 2 Probing | "To be clear—" · "Sorry, to be precise—" · "Point of order—" |
| 3 Tense | "No — that's not what I said." · "Let me correct the record." · "That's not accurate." |
| 4 Hostile | "That is *categorically* false." · "Read the thread." · "I have it in writing." |

### Pushback (heavy)
| Tier | Lines |
|---|---|
| 1 Cordial | "I'd gently push back on that." · "Can I offer a different view?" |
| 2 Probing | "I'm going to push back on that." · "I have to disagree there." |
| 3 Tense | "That's a hard no from me." · "Respectfully — absolutely not." |
| 4 Hostile | "Over my dead body." · "We are NOT doing that." |

### Let's Take This Offline (throw)
| Tier | Lines |
|---|---|
| 1 Cordial | "Let's take this offline." · "I'll grab time with you." |
| 2 Probing | "Let's set up a working session." · "This needs its own meeting." |
| 3 Tense | "I'm putting time on your calendar. Today." · "We're resolving this offline." |
| 4 Hostile | "You and me. Conference room. Now." · "We are settling this offline." |

### Active Listening (block)
| Tier | Lines |
|---|---|
| 1 Cordial | "Mm-hm." · "Totally." · "Good point, good point." |
| 2 Probing | "I hear you." · "That's fair." · "Noted." |
| 3 Tense | "…okay." · "Sure." · "If you say so." |
| 4 Hostile | "Uh-huh." · "*Right.*" · (silence — no line) |

### Back-dash (dodge)
| Tier | Lines |
|---|---|
| 1–2 | "Noted." · "I'll take that as an action item." |
| 3–4 | "Let me not speak out of turn." · "I'll circle back on that." |

### Specials (tier-agnostic — a special is a special)
- **Phased Approach:** "We're derisking via a phased approach." · "Per the roadmap—"
- **Circle Back (counter):** "As I mentioned—" · "Circling back to my earlier point—"
- **Data Pull:** "Per the dashboard—" · "The data actually shows—"
- **Throw Under the Bus (Tier 4 only, desperation):** "That was *[Name]'s* call." · "You'd have to ask *[Name]*." · "That was out of my hands."

---

## THE EXEC — moves × tiers

He never raises his voice. Even Tier 4 stays calm — that's what makes it scary.

### Quick Question (jab)
| Tier | Lines |
|---|---|
| 1 Cordial | "Quick question." · "Just curious—" · "Help me understand—" |
| 2 Probing | "Walk me through this." · "Say more about that." · "And the thinking there was…?" |
| 3 Tense | "Let me stop you." · "That doesn't track." · "Is that… true?" |
| 4 Hostile | "Let's be honest with each other." · "We both know that isn't right." |

### Let's Double-Click (heavy)
| Tier | Lines |
|---|---|
| 1 Cordial | "Let's double-click on that." · "Let's go a level deeper." |
| 2 Probing | "I want to pressure-test this." · "Let's unpack that." |
| 3 Tense | "Let's *really* look at this." · "I'm not moving on." |
| 4 Hostile | "We are going to sit here until this is real." |

### Per My Last Email (projectile)
| Tier | Lines |
|---|---|
| 1 Cordial | "Per my last email—" · "As I flagged earlier—" |
| 2 Probing | "Reattaching for visibility—" · "Looping back to my note—" |
| 3 Tense | "I'll forward the thread." · "It's all documented." |
| 4 Hostile | "Adding a few folks for visibility." *(the CC bomb)* · "I'm looping in your manager." |

### Derail ("let's zoom out")
| Tier | Lines |
|---|---|
| 1 Cordial | "Let's zoom out." · "Let's take a step back." |
| 2 Probing | "Are we asking the right question?" · "Let's not rathole." |
| 3 Tense | "I want to challenge the premise." · "Is this even the right forum?" |
| 4 Hostile | "This isn't about the portal, is it." |

### Threaten PIP (command grab)
| Tier | Lines |
|---|---|
| 2 Probing | "Let's talk about your growth areas." |
| 3 Tense | "I want to make sure you're set up for success." · "This is a development conversation." |
| 4 Hostile | "Let's align on expectations." · "I'm going to be direct with you." |

### Actually, Great Point (counter)
| Tier | Lines |
|---|---|
| 1–2 | "Actually — great point." · "You know what? You're right." |
| 3–4 | "Say that again. I want to write it down." · "Interesting. I'll remember that." |

### Item 4 (super — the receipts)
- "Item 4 on the agenda—" · "Circling back to Sepulveda—" · "One more thing before we close—"

---

## Set-pieces (hand-authored punctuation, not tiered)

- **Round opener (Exec):** *"So. Where are we on the portal refresh?"* — the bell.
- **Between-round stance beat:** a beat of water-sipping; the Exec Slacks *"This is going great 🙂"* over the buttons.
- **Exec KO (you win):** checks watch → *"Great sync. Ship it."* → the handshake.
- **Leonard KO (you lose):** the chair exhales → *"We're really investing in your growth."*
- **Every ending, final line:** *Actual Business Value Generated: **$0.00***.

## Call-and-response pairs (optional polish — use sparingly)

A few Exec lines have a matching Leonard retort, so an exchange occasionally
lands as a real back-and-forth instead of two monologues:

| Exec says (jab) | Leonard's next line reads as a reply |
|---|---|
| "Help me understand—" | "To be clear—" |
| "Say more about that." | "So the context is—" |
| "Is that… true?" | "I have it in writing." |
| "Let's zoom out." | "We're derisking via a phased approach." |

Trigger only when Leonard's move lands within ~1s of the Exec's line, so it feels
earned, not scripted.

---

## Wiring plan (when the script is locked)

Small, reuses what's built:
1. Add a `tier` dimension to the move-line pools (and the `SAY` block/dodge pools).
2. Add a `tension()` read = f(total health lost, round, clock) → tier 1–4, ratchet-up only.
3. The callout picker selects from `lines[move][tier]` with a per-tier cursor
   (sequential, no immediate repeat) instead of `Math.random()`.
4. Set-pieces stay hand-fired at round start / KO / stance select.
5. Call-and-response: when Leonard acts shortly after an Exec line, bias his pool
   toward the paired retort.

## Screening notes for Rebecca
- Cut any line that doesn't sound like something you've actually heard in a meeting.
- The Exec should never get *loud* — his Tier 4 is quieter and colder, not angrier.
- Brent (Eng) and Priya (Product) get their own tiered tables later, same shape —
  Brent escalates pedantic ("Well, actually—" → "That will never pass review."),
  Priya escalates scope ("Tiny thought—" → "So it also needs to do…").
