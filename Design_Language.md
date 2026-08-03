# Design Language — Dumb Corporate Games

*Added after the July 2026 design audit. The Blocked blueprints stay the
authority on game design and tone; this doc records the VISUAL system the
shipped product actually uses, so future work drifts less. Each rule cites
the page that made it necessary.*

## The three layers (all deliberate, all in-fiction)

The product intentionally ships THREE design languages. They are kayfabe
layers, not inconsistency — but each has rules, and drift *within* a layer
is a bug:

| Layer | Where | Language | Source of truth |
|---|---|---|---|
| **Studio site** | `/`, `/blocked` | Brutalist annual-report parody: Helvetica 900 caps, warm off-white `#f1f0ec`, black rules 1–4px, safety orange `#FF4500`, IBM Plex Mono metadata. No rounded corners. Ever. | `game/src/brutalist.tsx` (`BR` palette) |
| **Alignly software** | `/play` hub, game intros, Jira Run HUD, desktop-boot screens | Pitch-perfect Jira/Slack parody: their radii, their blues (`#0052cc`), their grays. The joke only works if it looks *real*. | Jira's own palette, `#5e6c84` for small gray text |
| **In-game HUD** | 3D game overlays | Deadpan dashboard on ink: `ink-900/75` chips, beige type, tier-colored meters. Per blueprint: "deadpan, not wacky." | `game/src/index.css` `@theme` tokens |

## Rules the audit had to enforce (and why)

1. **One Leonard.** He is **Leonard P.**, initials **LP**, everywhere.
   *(Triggered by: `/play` said LB, Jira Run said LC, his tickets said
   Leonard P. — three initials for one man.)*
2. **Orange is a budget, not a paint.** On the studio site, safety orange
   marks THE focal element of a section — one CTA, one rail, one badge.
   If a whole section is orange, nothing is.
   *(Triggered by: the old WHAT'S NEXT section — three all-orange cards
   repeating the Portfolio directly above them.)*
3. **Alignly-layer small gray text is `#5e6c84`, never `#8993a4`.**
   The lighter gray reads as authentic Jira but fails contrast (2.9:1)
   at the 10–12px sizes we use. `#5e6c84` passes (4.9:1) and is still
   Atlassian's own token. *(Triggered by: `/play` locked-achievement
   labels and footnotes.)*
4. **A joke link must be genuinely dead.** In-fiction dead ends
   ("DM → PLEASE DO NOT", "CIRCLE BACK") render as plain rows, not
   `href="#"` — a link that scroll-jumps to the top breaks deadpan AND
   accessibility. *(Triggered by: About/Footer on `/`.)*
5. **Grid tracks that hold display type get `minmax(0, ·)`.** Helvetica
   900 at clamp sizes has a huge min-content width; an unguarded `fr`
   track passes that to the page as horizontal scroll.
   *(Triggered by: SUBSCRIBE button overflowing the viewport at 768px.)*
6. **Every marquee gets `.br-marquee`** so `prefers-reduced-motion`
   freezes it. The achievement cascade in `index.css` is the model
   citizen — it already had a reduced-motion fallback.
7. **Facts appear at most twice per viewport.** Status-theater repetition
   is the bit, but "3 GAMES · ALL LIVE" appeared four times above the
   fold, which is noise, not satire. Badge + index strip is enough.
8. **Keyboard-only is a stated contract, not a silent failure.** Touch-only
   devices get the IT-department gate (`KeyboardGate.tsx`, `?kbgate` to
   preview) with an escape hatch — never an unplayable canvas.
9. **Copy pitches the page's subject.** `/blocked` sells Blocked, not the
   studio. The studio pitch lives on `/`. *(Triggered by: both pages
   opening with the same paragraph.)*
10. **Long-form prose is sentence case, centered, at `SHELL` = 720px; the
    furniture stays caps and full-bleed.** On the reading pages (`/about`,
    `/blog/:slug`) eyebrows, meta strips, tickers, and status chips keep
    the full brutalist all-caps register, and every section border and
    background still runs edge to edge — but the *reading column* (section
    title, paragraphs, pull quotes, takeaway) sits in one 720px column
    centered in the viewport. Two separate reasons:
    · **Sentence case**, because Helvetica 900 caps is a display face and
      past roughly a paragraph it stops being a style and starts costing
      comprehension.
    · **Centered**, because full-bleed left alignment is right for a poster
      and wrong for 1,200 words — on a wide monitor it strands the reader
      in the left third of the screen.
    Section titles inside the column are sized `clamp(30px, 5vw, 54px)` —
    keyed to fit `SHELL`, not the viewport, or a vw clamp overflows the
    column on a wide screen. *(Triggered by: the About page, the site's
    first writing longer than a blurb, and then by the post pages reading
    as a left-hand gutter at 1440px.)*
10b. **Reading pages alternate prose and graphic sections.** `/about` never
    runs more than one screen of type before something to look at: the
    stat strip, the calendar grid, the redacted impact-analysis document,
    the two game figures, the played-games grid. The graphic sections stay
    full-bleed, which is what makes the centered prose read as deliberate
    rather than as a narrow page. Anything horizontally wide inside them
    (the calendar, the document table) scrolls in its own
    `overflow-x: auto` container so the page body never does — see rule 5.
11. **Nothing in the editorial layer states the game count in prose.**
    `/about` derives it from `CAMPAIGN.length`; posts say "a set of short
    games." *(Triggered by: writing "four browser games" on a branch where
    only three shipped. Every hard-coded count is a future lie.)*
