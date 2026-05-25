# Blocked — Standup Prototype Content Pack v0.2

## Locked prototype decisions

- **No visible Internal Screaming meter** in v1. Internal unraveling appears through copy, tooltips, and ending text only.
- **Show consequences before clicking.** Choice buttons display projected effects like `Time +10m`, `Meeting Load +8`, `Pissed-Off -5`.
- **Visual direction:** hybrid — beige corporate RPG + deadpan dashboard UI.
- **Satire sharpness:** vicious but true.
- **Sound effects in v1:** Slack ping, Gmail ping, calendar invite reminders. Optional later: printer slap, tired sigh, meeting join chime.

## Prototype name

**Blocked: The Standup Prototype**

## Scene premise

It is 9:00am at Alignly. The player is running standup for the **Customer Happiness Portal Refresh**. Everyone says “no blockers.” Everyone is obviously blocked.

## Objective

Finish standup with:
- Project Status: Green or Yellow
- Pissed-Off Meter below Meltdown
- Meeting Load below Calendar Apocalypse

## Starting state

- Time: 9:00am
- Project Status: Green
- Pissed-Off Meter: Fine
- Meeting Load: Low
- Corporate Progress: 0

## Meter scale

### Time
- Starts at 9:00am.
- Standup prototype ends after all required NPCs are handled or chaos triggers.

### Project Status
- Green
- Yellow
- Red

### Pissed-Off Meter
- Fine
- Slightly Tight Smile
- Per My Last Email
- Looping In Leadership
- Glassdoor Draft
- Meltdown

### Meeting Load
- Low
- Manageable
- Concerning
- Pre-Read Required
- Calendar Apocalypse

## UI sound moments

### Slack ping
Use for:
- incoming passive-aggressive message
- someone asking “quick question”
- coping action side effect

Example copy:
> Slack: “quick q — are we aligned on what aligned means?”

### Gmail ping
Use for:
- follow-up emails
- reply-all event tease
- HR/legal-safe language

Example copy:
> Gmail: “Friendly nudge on the pre-read nobody requested.”

### Calendar reminder
Use for:
- meeting load increases
- quick sync scheduled
- Calendar Apocalypse

Example copy:
> Calendar: “Quick Sync starts in 5 minutes. Agenda: TBD.”

## Clickable NPCs / objects

1. Engineer
2. Designer
3. Product Person
4. Salesperson
5. HR Person
6. Printer
7. Office Plant

Executive is not part of standup; appears as teaser/notification or in final prototype expansion.

---

# NPC Interaction Scripts

## 1. Engineer — vague requirements blocker

### Intro line
> “No blockers. I just need someone to explain what the requirement means by ‘simple but powerful.’ Also, ‘premium but frictionless’ appears three times.”

### Player choices

#### A. Clarify the requirement like a sane person
Visible effects:
- `Time +15m`
- `Project Status stable`
- `Pissed-Off -4`
- `Corporate Progress +1`

Result copy:
> You ask Product to define “premium.” A brief silence suggests no one has ever considered this.
>
> The Engineer makes eye contact for the first time today.

Sound: Slack ping

Follow-up notification:
> Slack: Product: “Could we avoid getting too tactical this early?”

#### B. Create a Jira ticket called “Define Premium”
Visible effects:
- `Time +10m`
- `Meeting Load +2`
- `Pissed-Off +3`
- `Corporate Progress +1`

Result copy:
> The blocker now has a ticket number, which makes it feel less like despair and more like governance.
>
> Engineer Trust decreased slightly.

Sound: Gmail ping

Follow-up notification:
> Gmail: “You have been mentioned in ALIGN-1842: Define Premium.”

#### C. Schedule a quick sync
Visible effects:
- `Time +30m`
- `Meeting Load +8`
- `Pissed-Off +6`
- `Corporate Progress +1`

Result copy:
> A 30-minute meeting appears where lunch used to be.
>
> Everyone accepts except the person required to make the decision.

Sound: Calendar reminder

#### D. “Great, sounds like no blockers.”
Visible effects:
- `Time +5m`
- `Project Status stays Green`
- `Pissed-Off +8 delayed`
- `Corporate Progress +0`

Result copy:
> You preserve the standup narrative. Reality takes notes.
>
> The Engineer says “sure” in a way that shortens your lifespan.

Sound: Slack ping

---

## 2. Designer — contradictory feedback blocker

### Intro line
> “No blockers. Leadership just asked if the design could feel more enterprise, but less B2B. Also more human, but not casual.”

### Player choices

#### A. Ask for specific feedback
Visible effects:
- `Time +15m`
- `Pissed-Off -3`
- `Project Status stable`
- `Corporate Progress +1`

Result copy:
> You ask what “enterprise but not B2B” means. The room briefly becomes unsafe for brand adjectives.
>
> Designer appreciated this, which is dangerous because now they expect clarity.

Sound: Slack ping

#### B. Suggest “make it pop”
Visible effects:
- `Time +5m`
- `Pissed-Off +10`
- `Project Status stays Green`
- `Corporate Progress +0`

Result copy:
> You have said the forbidden words.
>
> The Designer smiles with only the bottom half of their face.

Sound: none or subtle error tone

#### C. Socialize the design with stakeholders
Visible effects:
- `Time +30m`
- `Meeting Load +10`
- `Pissed-Off +5`
- `Corporate Progress +2`

Result copy:
> You transform one opinion into seven opinions and call it alignment.
>
> The design now has a stakeholder map. The map has teeth.

Sound: Calendar reminder

#### D. Reframe feedback as “brand tension”
Visible effects:
- `Time +10m`
- `Pissed-Off -2`
- `Project Status stable`
- `Corporate Progress +1`

Result copy:
> Nobody understands what brand tension is, so nobody can disagree with it.
>
> The phrase enters the source of truth unchallenged.

Sound: Gmail ping

---

## 3. Product Person — small change terrorist

### Intro line
> “No blockers. I added one small requirement. It may affect onboarding, permissions, reporting, mobile, and the legal footer, but emotionally it’s small.”

### Player choices

#### A. Ask them to define MVP
Visible effects:
- `Time +15m`
- `Project Status stable`
- `Pissed-Off +2`
- `Corporate Progress +1`

Result copy:
> Product defines MVP as “the smallest version customers would not complain about publicly.”
>
> This is not helpful, but it is a sentence.

Sound: Slack ping

#### B. Move the new requirement to Phase 2
Visible effects:
- `Time +10m`
- `Project Status + toward Green`
- `Pissed-Off +4`
- `Corporate Progress +2`

Result copy:
> The requirement has been moved to Phase 2, a beautiful farm upstate where scope goes to run free.
>
> Product says “totally” and immediately starts a Phase 2 doc.

Sound: Gmail ping

#### C. Schedule scope alignment
Visible effects:
- `Time +30m`
- `Meeting Load +8`
- `Pissed-Off +6`
- `Corporate Progress +1`

Result copy:
> You create a meeting to determine whether the small thing is small.
>
> It is not small.

Sound: Calendar reminder

#### D. Accept the small change
Visible effects:
- `Time +5m`
- `Project Status drops risk`
- `Pissed-Off +7 later`
- `Corporate Progress +1`

Result copy:
> You accept the change because today has already developed a plot.
>
> Somewhere, an engineer sits up straighter, sensing danger.

Sound: Slack ping

---

## 4. Salesperson — promised impossible timeline

### Intro line
> “No blockers. I may have told the client this would be live Thursday. Not committed committed. More like relationship committed.”

### Player choices

#### A. Ask what exactly was promised
Visible effects:
- `Time +15m`
- `Pissed-Off +3`
- `Project Status stable`
- `Corporate Progress +1`

Result copy:
> Sales describes a feature, a strategy, and a legally binding vibe.
>
> You learn the client has screenshots of a thing that does not exist.

Sound: Gmail ping

#### B. Reframe Thursday as “target state”
Visible effects:
- `Time +10m`
- `Project Status stable`
- `Pissed-Off -2`
- `Corporate Progress +2`

Result copy:
> Thursday is no longer a date. It is a directional aspiration.
>
> Sales nods like this was the plan all along.

Sound: Slack ping

#### C. Loop in leadership
Visible effects:
- `Time +20m`
- `Meeting Load +5`
- `Pissed-Off +8`
- `Corporate Progress +1`

Result copy:
> You summon leadership. The air pressure changes.
>
> An executive reacts with a thumbs-up emoji, which everyone interprets differently.

Sound: Slack ping + Calendar reminder

#### D. Mark risk as “being monitored”
Visible effects:
- `Time +5m`
- `Project Status stays Green`
- `Pissed-Off +4`
- `Corporate Progress +1`

Result copy:
> The risk is now being monitored, which means it can hurt you later with documentation.
>
> Dashboard remains Green. Reality clears its throat.

Sound: Gmail ping

---

## 5. HR Person — legally survivable feedback

> **Note:** Diane is HR, not on the project. She doesn't do "no blockers" — she does check-ins. Her dialogue is HR-speak nonsense; the player has to deal with her periodically.

### Intro line
> “Just a quick check-in. A few themes have surfaced in 1:1s — nothing actionable per se. Reminder that all feedback should be actionable, kind, and legally survivable. Also someone used ‘ownership’ in a way that created concern.”

### Player choices

#### A. Ask HR for approved performance language
Visible effects:
- `Time +20m`
- `Pissed-Off -3 visible`
- `Meeting Load +2`
- `Corporate Progress +1`

Result copy:
> HR provides six phrases that sound supportive and mean nothing.
>
> “Opportunity to increase cross-functional impact” has entered your inventory.

Sound: Gmail ping

#### B. Say “This feels like a growth moment”
Visible effects:
- `Time +5m`
- `Pissed-Off -2 visible`
- `Pissed-Off +5 hidden resentment`
- `Corporate Progress +1`

Result copy:
> Everyone becomes calmer and less honest.
>
> The office temperature drops by two degrees.

Sound: none or low chime

#### C. Schedule feedback calibration
Visible effects:
- `Time +30m`
- `Meeting Load +9`
- `Pissed-Off +5`
- `Corporate Progress +2`

Result copy:
> You create a meeting where everyone will agree that words have consequences, then choose worse words.

Sound: Calendar reminder

#### D. Ignore HR gently
Visible effects:
- `Time +5m`
- `Project Status stable`
- `Pissed-Off +4`
- `Corporate Progress +0`

Result copy:
> You nod with enough warmth to avoid follow-up.
>
> HR writes something down anyway.

Sound: Gmail ping

---

## 6. Printer — object NPC

### Intro line
> “PC LOAD LETTER.”

Tooltip:
> The printer has been broken since Q2 but remains business-critical.

### Player choices

#### A. Slap Printer
Visible effects:
- `Time +2m`
- `Pissed-Off -8`
- `IT Suspicion +5`
- `Printer Sentience Risk +3`

Result copy:
> You slap the printer with the confidence of someone who has abandoned the troubleshooting guide.
>
> The printer complies, but remembers.

Sound: printer slap / error beep if available

#### B. Open a facilities ticket
Visible effects:
- `Time +10m`
- `Corporate Progress +1`
- `Pissed-Off +2`
- `Meeting Load +1`

Result copy:
> The ticket is routed to a shared inbox last checked during a different fiscal strategy.
>
> Status: received.

Sound: Gmail ping

#### C. Tell everyone to use the digital copy
Visible effects:
- `Time +5m`
- `Project Status stable`
- `Pissed-Off +3`
- `Corporate Progress +1`

Result copy:
> This is sensible, which makes it culturally incompatible with the office.
>
> Someone asks if the digital copy can be printed for review.

Sound: Slack ping

#### D. Stare at it until it works
Visible effects:
- `Time +5m`
- `Pissed-Off -3`
- `Printer Sentience Risk +2`

Result copy:
> You and the printer reach an understanding outside language.
>
> It prints one page from someone else’s job.

Sound: printer beep

---

## 7. Office Plant — silent stakeholder

### Intro line
> “…”

Tooltip:
> The plant appears to be the only stakeholder with boundaries.

### Player choices

#### A. Stare at plant for emotional regulation
Visible effects:
- `Time +3m`
- `Pissed-Off -4`
- `Plant Influence +1`

Result copy:
> The plant offers nothing. This is the most helpful interaction you’ve had today.

Sound: none

#### B. Add plant to stakeholder map
Visible effects:
- `Time +5m`
- `Corporate Progress +1`
- `Pissed-Off -1`
- `Meeting Load +1`

Result copy:
> The plant is now a stakeholder. It has not objected.
>
> This is interpreted as approval.

Sound: Gmail ping

#### C. Ask plant if there are blockers
Visible effects:
- `Time +2m`
- `Pissed-Off -2`
- `Project Status stable`

Result copy:
> The plant says nothing, which is more actionable than most updates.

Sound: none

#### D. Water plant with office coffee
Visible effects:
- `Time +3m`
- `Pissed-Off -1`
- `Plant Influence +3`
- `Future Surrealism +4`

Result copy:
> The plant absorbs the coffee. Somewhere beneath the soil, a roadmap forms.

Sound: Slack ping, very quiet

---

# Coping Action Menu

Coping actions should be available from a side panel. Consequences are visible before clicking.

## Diminishing returns (MVP balance rule)

Every coping action below loses effectiveness on repeat use within a single standup. Use counters reset between runs. Time cost stays the same on every use.

Default scaling:
- **Use 1**: full effect
- **Use 2**: ~33% of full effect
- **Use 3+**: ~10% of full effect

Each action below has a Use 1 effect (the default) and at least one repeat-use copy variant. Use 1 copy is the canonical line; repeat copy gets bleaker each time.

## Vent to Coworker
Visible effects:
- `Time +10m`
- `Your Pissed-Off -10`
- `Coworker Pissed-Off +5`

Result copy:
> You say, “I just need to say this in a safe space.”
>
> The space becomes less safe.

Sound: Slack ping

## Slap Printer
Visible effects:
- `Time +2m`
- `Pissed-Off -8`
- `IT Suspicion +5`

Result copy:
> The printer makes a sound that would be hard to defend in discovery.

Sound: printer slap / error beep

## Coffee Run
Visible effects:
- `Time +20m`
- `Team Pissed-Off -8`
- `Meeting Load unchanged`
- `Caffeine Crash later`

Result copy:
> You return with coffee. Morale improves until someone asks who ordered oat milk.

Sound: Slack ping

## Send Meme
Visible effects:
- `Time +5m`
- `Pissed-Off -5`
- `Executive Reply Risk +10%`

Result copy:
> The team briefly remembers they are people.
>
> Executive reply risk is non-zero.

Sound: Slack ping

## Cry in Bathroom
Visible effects (Use 1):
- `Time +15m`
- `Pissed-Off -15`
- `Project unattended risk +5`

Result copy (Use 1):
> You cry quietly in the bathroom and emerge with the calm of someone who has rescheduled their humanity.
>
> Slack: “quick q — are you around?”

Result copy (Use 2): `Pissed-Off -5`
> The tears are gone. Only dehydration remains.
>
> Slack: “still need that quick q.”

Result copy (Use 3+): `Pissed-Off -2`
> You sit on the bathroom floor. It is not relaxing. You wonder how this became your job.

Sound: Slack ping, muffled calendar reminder optional

## Delete Meeting
Visible effects:
- `Time +5m`
- `Meeting Load -10`
- `Team Pissed-Off -8`
- `Leadership Visibility -5`

Result copy:
> You delete a meeting. No one notices for four beautiful minutes.
>
> This may be the closest thing to leadership.

Sound: Calendar reminder cancellation / soft chime

---

# Calendar Apocalypse Event

## Trigger

Occurs when:
- Meeting Load reaches maximum, or
- Pissed-Off reaches `Glassdoor Draft` during the standup prototype.

## Event title

**CALENDAR APOCALYPSE**

## Event copy

> Every empty slot has been replaced with a “quick sync.”
>
> The calendar has achieved sentience and chosen violence.

## Notification burst

- Calendar: “Quick Sync starts in 5 minutes. Agenda: TBD.”
- Calendar: “Pre-Alignment Touchbase added.”
- Gmail: “Friendly nudge on the pre-read.”
- Slack: “can we take this offline?”

## Effects

- Meeting Load: Calendar Apocalypse
- Project Status: Yellow
- Pissed-Off: +10
- Corporate Progress: +2, somehow

## Recovery option

Player can choose one emergency action:

### Delete the least useful meeting
Visible effects:
- `Meeting Load -8`
- `Pissed-Off -5`
- `Leadership Visibility -5`

Result:
> You delete “Sync on Sync Follow-Up.” The office exhales.

### Accept all and become the meeting
Visible effects:
- `Corporate Progress +3`
- `Pissed-Off +8`
- `Project Status stays Yellow`

Result:
> You accept every invite. Your calendar becomes a solid color.

### Cry in bathroom
Visible effects:
- `Time +15m`
- `Pissed-Off -15`
- `Meeting Load unchanged`

Result:
> You return to 11 unread calendar updates and a new understanding of silence.

---

# Standup Ending Screens

## Good ending: Standup Complete

Title:
> **Standup Complete**

Body:
> The team is aligned. No one is okay.
>
> It is 10:15 AM. You survived the morning standup.
>
> The Customer Happiness Portal Refresh remains Green, pending clarification of the word “happiness.”
>
> Only 6 hours until the Executive Review.

Stats:
- Blockers identified: 6
- Blockers admitted: 0
- Blockers reclassified as dependencies: 4
- Meetings created: [dynamic]
- Actual progress: emotionally complex
- Dashboard status: Green or Yellow

Performance feedback:
> “Strong ownership. Continue developing executive presence.”

Button:
> Proceed to the rest of your day

## Yellow ending: Green Enough

Title:
> **Green Enough**

Body:
> The project is Yellow, but leadership has not noticed. This is functionally Green.
>
> Several risks are being actively monitored by people who cannot name them.

Stats:
- Alignment claimed: high
- Confidence: medium-high
- Actual decisions: 0–1
- Morale damage: manageable but permanent

Performance feedback:
> “Demonstrates resilience in ambiguous environments.”

## Failure ending: Full Escalation

Title:
> **Full Escalation**

Body:
> The office has reached Meltdown. This has been escalated to leadership.
>
> A mandatory 90-minute Alignment Reset has been scheduled for everyone, including the plant.

Stats:
- Reply-all risk: critical
- Meeting load: irreversible
- Project status: performatively concerned
- Psychological safety: in draft

Performance feedback:
> “Opportunity to be more proactive around unforeseeable chaos.”

## Chaos ending: Calendar Apocalypse

Title:
> **Calendar Apocalypse**

Body:
> There are no empty slots. There are no decisions. There is only availability.
>
> Work cannot fail if no one has time to do it.

Stats:
- Meetings scheduled: too many
- Pre-reads opened: 0
- Follow-ups promised: 11
- Actual progress: deferred

Performance feedback:
> “Excellent visibility.”

---

# Achievement ideas for prototype

- **No Blockers** — Complete standup while every NPC is blocked.
- **This Could Have Been a Slack** — Schedule 3 meetings in the standup prototype.
- **Actual Leadership** — Delete a meeting and improve morale.
- **Soft Skills Damage** — Use HR language to calm people while making them less honest.
- **Printer Whisperer** — Slap the printer and get away with it.
- **Green With Risks** — Keep the dashboard Green despite obvious collapse.
- **Plant-Based Governance** — Add the plant to the stakeholder map.

---

# Implementation notes for Claude Design / prototype builder

- Choice buttons should include visible effect chips before click.
- UI should be hybrid: small office map with RPG-like NPCs plus corporate dashboard meters.
- Microcopy should be vicious but true, not goofy for its own sake.
- Avoid bright cartoon comedy. Keep visual tone beige, polished, deadpan.
- Use notification toasts for Slack/Gmail/Calendar pings.
- No Internal Screaming meter in v1.
- Use copy to show the PM unraveling.
