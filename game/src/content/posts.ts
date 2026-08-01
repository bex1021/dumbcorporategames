// src/content/posts.ts — dev-log posts for /blog.
//
// ── TRUTH RULE (the important one) ─────────────────────────────────────
// Every incident in these posts is traceable to something real in this
// repo: a commit, a design doc, or a value verified by running it. The
// `source` field on each post records which. If you cannot point at the
// source, do not write the post — an invented anecdote in a first-person
// dev log is a lie about your own work, and a real developer will spot
// the wrong technical detail immediately.
//
// This file was corrected once already. Three posts were cut for having
// no source (a camera story, a "fixed it twice" story, a "my core loop
// failed" story) and six had their technical explanations replaced with
// what the commits actually said. The corrections were not small: the
// vanishing car was a NaN in a suspension spring, not the culling bug I
// had guessed; the strobe came from randomising screenshake per rendered
// frame, and the KO freeze was the *cause*, not the fix.
//
// ── WHO THESE ARE FOR ──────────────────────────────────────────────────
// Someone who has never made a game and may not work in tech at all.
// They should read any post start to finish without looking anything up.
//
//   soWhat  — why this matters, plain language, BEFORE the story. A reader
//             who stops here should still have gotten the point.
//   plain   — inline "IN PLAIN TERMS" block. Every technical word gets an
//             analogy from outside tech, no exceptions.
//   apply   — 3–4 concrete steps for your own first project. Not "be
//             careful"; actual actions.
//   takeaway— the one sentence to remember.
//   source  — the commit / doc / measurement this is drawn from.
//
// VOICE — contractions on, uneven sentence lengths, at most one aphorism
// per post, American spellings. Explaining simply is not writing down to
// someone; never say "don't worry about it."
//
// ANONYMITY CONTRACT (also enforced in routes/About.tsx): no real name, no
// employer, no job titles, industry, city, or team size.

export type Block =
  | { k: 'p'; t: string }
  | { k: 'lead'; t: string }
  | { k: 'h'; t: string }
  | { k: 'quote'; t: string }
  | { k: 'ul'; items: string[] }
  | { k: 'code'; t: string; cap?: string }
  | { k: 'note'; label: string; t: string }
  /** Jargon explainer. `term` is the word; `t` explains it via analogy. */
  | { k: 'plain'; term: string; t: string }

export type Post = {
  key: string
  slug: string
  title: string
  dek: string
  date: string
  readMin: number
  tags: string[]
  /** Why this matters. Rendered up top, before the story. */
  soWhat: string
  /** The one sentence to remember. */
  takeaway: string
  /** Concrete steps for someone's own first project. */
  apply: string[]
  /** Where this incident is recorded. Shown in the post footer. */
  source: string
  body: Block[]
}

export const POSTS: Post[] = [
  // ── LOG-001 · verified: author's own account ───────────────────────────
  {
    key: 'LOG-001',
    slug: 'i-have-never-written-a-line-of-game-code',
    title: 'I HAVE NEVER WRITTEN A LINE OF GAME CODE',
    dek: 'Starting with no qualifications, one idea, and an AI that will build anything you ask for — including the wrong thing, confidently.',
    date: '2026-07-31',
    readMin: 5,
    tags: ['BEGINNINGS', 'AI', 'HONESTY'],
    soWhat:
      'If you have an idea for a game and no technical background, the thing standing between you and a playable version is no longer the code. It is knowing what to ask for and being honest about whether the result is any good. That second part cannot be delegated, to an AI or anyone else, and it is the actual job.',
    takeaway:
      'The bottleneck was never the code. It was knowing what to ask for, and nobody can generate that part for you.',
    apply: [
      'Describe what you want in plain English, the way you\'d explain it to a friend. That description is your design document. You do not need any other kind.',
      'Play the thing the moment it runs — not after it\'s finished. The gap between "this works" and "this is fun" is enormous, and only playing reveals it.',
      'Write your locked decisions down somewhere permanent, with the reason. Otherwise you\'ll relitigate them at 11pm and undo work you already paid for.',
      'Keep a log of what broke. Not for an audience — a commit message written properly is the only reason I can tell you the truth about any of this months later.',
    ],
    source: 'The author\'s own account. No technical claims in this one.',
    body: [
      {
        k: 'lead',
        t: 'I don\'t have a computer science background. Not a minor, not a bootcamp, not one class. Before this, the most technical thing I\'d ever shipped was a pivot table that someone described as "actually pretty clean."',
      },
      {
        k: 'p',
        t: 'Then I built a set of short browser games. They\'re live. You can play them right now, for free, and they\'ll take about as long as a status meeting.',
      },
      {
        k: 'p',
        t: 'This is the honest version of how that happened. Not the LinkedIn version. The one where things took nine tries.',
      },

      { k: 'h', t: 'THE PART EVERYONE ASKS ABOUT FIRST' },
      {
        k: 'p',
        t: 'Yes, an AI wrote most of the code. I\'m not going to be cute about it or call it a "collaboration" in the way that flatters me. I described what I wanted, it produced something, I played it, and a fair amount of the time it was wrong in a way I couldn\'t have diagnosed on my own.',
      },
      {
        k: 'p',
        t: 'What surprised me is that this didn\'t make anything easy. It moved the hard part somewhere else. Writing the code stopped mattering almost immediately. Knowing what code should exist became the entire job.',
      },
      {
        k: 'quote',
        t: 'An AI will happily build you a beautiful, well-commented, performant version of a bad idea.',
      },
      {
        k: 'p',
        t: 'It never once said this mechanic is boring. Never said the player has no reason to care. It said yes, and then it said yes again, and the only thing standing between me and forty hours of polished nothing was me actually playing the thing and admitting it wasn\'t fun.',
      },

      { k: 'h', t: 'WHAT I ACTUALLY BROUGHT' },
      {
        k: 'p',
        t: 'For a while I felt like a fraud with a keyboard. What helped was working out that I wasn\'t the engineer on this project. I was the person with the material.',
      },
      { k: 'ul', items: [
        'Twenty-odd years of playing games and knowing, in my body, when one feels bad.',
        'Eight years of corporate experience I\'d very much like to convert into something other than a stress response.',
        'One specific idea I couldn\'t talk myself out of.',
        'Enough taste to know the output was wrong, even when I couldn\'t say why.',
      ] },
      {
        k: 'p',
        t: 'That last one turned out to be the actual skill. Not writing the fix. Noticing that something needed one.',
      },

      { k: 'h', t: 'WHY A DEV LOG, AND WHY ANONYMOUS' },
      {
        k: 'p',
        t: 'Anonymous because I still have the day job. That\'s the whole reason. No mystique, just an employment contract and a healthy respect for it.',
      },
      {
        k: 'p',
        t: 'A dev log because when I started I went looking for writing by people in exactly my position — no experience, no team, building anyway — and mostly found professionals explaining math I couldn\'t follow, or threads insisting AI had made game development trivial. The first assumed I knew things. The second was lying.',
      },
      {
        k: 'note',
        label: 'A NOTE ON HOW THESE ARE WRITTEN',
        t: 'Every incident in this log is drawn from a real commit, design doc, or measurement in the project — the source is listed at the bottom of each post. An earlier version of this log had three posts I\'d written from memory rather than records, and the technical details were wrong. They\'ve been cut. A dev log that invents its own history is worth nothing to you.',
      },
      {
        k: 'p',
        t: 'So these are notes from the middle. What broke, why it broke, what I\'d tell someone a week behind me. If you make games for real and something in here makes you wince, that\'s the price of watching someone learn in public.',
      },
    ],
  },

  // ── LOG-002 · verified live ────────────────────────────────────────────
  {
    key: 'LOG-002',
    slug: 'the-green-checkmark-that-was-lying',
    title: 'THE GREEN CHECKMARK THAT WAS LYING',
    dek: 'For weeks, the tool that was supposed to check my work said everything was fine. It had been checking nothing at all.',
    date: '2026-07-31',
    readMin: 6,
    tags: ['TOOLING', 'AI', 'STATUS GREEN'],
    soWhat:
      'You are going to rely on automatic checks — something that tells you your work is okay before you show it to anyone. This post is about discovering mine had been inspecting zero of my files and reporting success anyway. The lesson generalizes far past games: any check you have never seen fail is not a check, it is decoration. That applies to a backup you have never restored, a spreadsheet formula nobody has stress-tested, and a smoke alarm you have never pressed the button on.',
    takeaway:
      'A passing check is only worth what it actually checked. Ask any dashboard what its denominator is.',
    apply: [
      'The first time you set up any automatic check, break something on purpose and confirm the check goes red. If it still passes, it isn\'t connected to your work. Two minutes, and the highest-value two minutes in the project.',
      'Treat suspicious speed as evidence. If a check on a big project finishes instantly, it probably didn\'t look at anything.',
      'Learn the difference between "no problems found" and "nothing was examined." Most tools print the same cheerful message for both.',
      'Write the correct command in a file in your project, not in your head.',
    ],
    source:
      'Verified by running both commands against this repo while writing the post. The root config really does contain an empty file list; the counts below are the real output.',
    body: [
      {
        k: 'lead',
        t: 'For a few weeks, the command I ran to confirm my work was correct came back clean every single time. Instantly. No errors, no warnings, nothing.',
      },
      { k: 'p', t: 'It was checking nothing. Zero files. A green light wired to an empty room.' },

      { k: 'h', t: 'FIRST — WHAT IS THIS THING SUPPOSED TO DO' },
      {
        k: 'plain',
        term: 'TYPE CHECKER',
        t: 'A proofreader for your project\'s plumbing. It doesn\'t check spelling or whether your game is fun. It checks that the pieces fit together — that when one part of the game asks another part for "the player\'s score," the other part hands back an actual number, and not the word "banana" or nothing at all. It reads every file and complains before you ever run the game. Like the person at a theater who checks that every prop the script mentions actually exists backstage.',
      },
      {
        k: 'p',
        t: 'That is genuinely useful when you don\'t know what you\'re doing. It catches the boring category of mistake — you renamed something in one place and forgot the other eleven — which is most of the mistakes a beginner makes.',
      },

      { k: 'h', t: 'HOW IT ENDED UP CHECKING NOTHING' },
      {
        k: 'p',
        t: 'My project has a small settings file that tells the checker which code to look at. Mine didn\'t list any code. It pointed at two *other* settings files, which each listed the real code.',
      },
      {
        k: 'p',
        t: 'That\'s a completely standard way to organize a project and it isn\'t a mistake. The mistake was mine: the command I\'d been running only read the top file, found an empty list, concluded there was nothing to check, and reported success. Cheerfully. Every time.',
      },
      {
        k: 'code',
        cap: 'Real output from this project, run while writing this post.',
        t: 'npx tsc --noEmit   # → exits clean.   0 files checked.\nnpx tsc -b         # → follows refs.  108 files checked.',
      },
      {
        k: 'p',
        t: 'A hundred and eight files it had never once opened. When I finally ran the right command it found real errors immediately, some sitting in code I\'d already published. The site worked anyway — browsers are forgiving in ways this checker is not — but I\'d been trusting a signal that was structurally incapable of failing.',
      },

      { k: 'h', t: 'WHY THIS IS THE INTERESTING KIND OF BUG' },
      { k: 'quote', t: 'A status light that can\'t go red isn\'t a status light. It\'s decor.' },
      {
        k: 'p',
        t: 'Nobody lied to me. The tool did exactly what it was told. The number of files it examined simply was not a number anyone was looking at — not in the output, not in my head. There was no alarm to miss, because the alarm was never wired up.',
      },
      {
        k: 'p',
        t: 'I make a game about a company where a project is marked GREEN because someone said so in a meeting. And I\'d accidentally built myself the same instrument. Not fraud. Just a number whose denominator nobody thought to ask about.',
      },

      { k: 'h', t: 'THIS BITES HARDER IF YOU\'RE BUILDING WITH AI' },
      {
        k: 'p',
        t: 'When you work with an AI assistant, it runs your checks, sees the success message, and tells you — accurately, in good faith — that everything passes. It isn\'t making things up. It\'s trusting your setup, exactly as you did.',
      },
      {
        k: 'p',
        t: 'Which means a broken check doesn\'t merely fail to catch your bugs. It launders them into a confident all-clear from something that sounds like it knows.',
      },
      {
        k: 'note',
        label: 'THE TWO-MINUTE HABIT',
        t: 'Break something on purpose the first time you set up any check. Type nonsense into a file and confirm the check goes red. Then undo it. If it stayed green, you\'ve learned it was never watching — now, instead of in three weeks.',
      },
      {
        k: 'p',
        t: 'I didn\'t find this by being clever. I found it because a bug turned up in the browser that the checker had sworn was impossible, and I believed reality over the dashboard.',
      },
      {
        k: 'note',
        label: 'DEADPAN CORNER',
        t: 'The project status remained GREEN throughout. It was, in fairness, always going to.',
      },
    ],
  },

  // ── LOG-003 · verified: ad98dc9, 517a6d0 ───────────────────────────────
  {
    key: 'LOG-003',
    slug: 'i-built-a-robot-to-play-my-own-game',
    title: 'I BUILT A ROBOT TO PLAY MY OWN GAME',
    dek: 'It told me my driving level had no stakes at all — and separately, that a reward I was proud of had become impossible to earn.',
    date: '2026-07-31',
    readMin: 8,
    tags: ['BALANCE', 'PLAYTESTING', 'FAIRNESS'],
    soWhat:
      'The moment you finish building something, you become the worst possible judge of how hard it is, because you know all the answers and cannot un-know them. Worse, the problem is often the opposite of what you fear: I was braced for "too hard" and the real finding was that my driving level had no tension at all. You cannot feel that from the inside.',
    takeaway:
      'You can\'t playtest your own difficulty. You\'re the one player in the world who already has the answer key.',
    apply: [
      'Write your rules out as plain numbers in a separate file — no graphics, just the choices and what each costs. Doing this alone shows you which parts of your design do nothing.',
      'Give your test players personalities: optimal, careful, reckless, naive. "Can this be won" is far less useful than "who wins it, and by how much."',
      'Check for too-easy as well as too-hard. If every personality including the worst one wins comfortably, you have no game — you have a corridor.',
      'When you add a global constraint (a deadline, a budget, a cap), re-check every reward. Mine silently broke a path that used to work.',
    ],
    source:
      'Commit ad98dc9 (the Lunch Dash balance harness and its headline finding) and commit 517a6d0 (the math review that made "Aligned but Hated" reachable again).',
    body: [
      {
        k: 'lead',
        t: 'Something I didn\'t see coming: the moment you finish building a game, you become permanently unqualified to judge how hard it is.',
      },
      {
        k: 'p',
        t: 'I know what every choice costs before I click it. I know which lane the obstacle is in. I know the route across town without looking at the map. Every run I did was a run with the answer key.',
      },

      { k: 'h', t: 'SO I MADE SOMETHING THAT COULDN\'T CHEAT' },
      {
        k: 'p',
        t: 'The idea was to take the game\'s real rules and run them in a stripped-down version with no graphics at all — just the numbers — then let a program play it thousands of times while I make dinner.',
      },
      {
        k: 'plain',
        term: 'A TEST HARNESS',
        t: 'A program that plays your game for you, very fast, with no pictures. Because there\'s nothing to draw, it plays thousands of games in the time you\'d play one. It can\'t tell you whether your game is fun — nothing can do that except a human — but it can tell you whether winning is possible, how often, and for whom.',
      },
      {
        k: 'p',
        t: 'The important detail is that the harness imports the *real* scoring code rather than a copy of it. A reimplementation drifts from the game within a week and then you\'re carefully balancing something that no longer exists.',
      },
      {
        k: 'p',
        t: 'Four personalities: optimal, careful, reckless, and naive. "Can this be won" is a much less useful question than "who wins it."',
      },

      { k: 'h', t: 'THE FINDING I WASN\'T BRACED FOR' },
      {
        k: 'p',
        t: 'I expected to hear the driving level was too hard. The actual result: the route across town is only about 716 metres, so at the clock I\'d set, *every* personality — including the naive one that makes no good decisions — finished with half an hour to spare.',
      },
      {
        k: 'quote',
        t: 'Noon never threatened. The deadline the whole level is built around could not be missed, by anyone, ever.',
      },
      {
        k: 'p',
        t: 'That is a worse problem than being too hard, and it\'s invisible from the inside. I\'d driven that route dozens of times and always arrived comfortably, and I read my own comfort as good design rather than as no stakes.',
      },

      { k: 'h', t: 'AND THE REWARD THAT HAD QUIETLY BECOME IMPOSSIBLE' },
      {
        k: 'p',
        t: 'Separately, the first game has an achievement for finishing the day aligned on the project and personally despised by everyone in the office. It\'s my favorite one — the whole thesis of the game in a single badge.',
      },
      {
        k: 'p',
        t: 'It had become unreachable, and the reason is the interesting part. Getting alignment that high required the only two choices worth two points each. Both cost thirty minutes. That put the full path at ninety-five to a hundred minutes — and I had recently added a hard ninety-minute deadline.',
      },
      {
        k: 'p',
        t: 'The deadline was a good change. It also silently invalidated an entire style of play, in a completely different part of the game, and nothing announced it. On top of that, those same two choices only annoyed people a little, so even when the path had been reachable it topped out just under the "hated" threshold anyway.',
      },
      {
        k: 'note',
        label: 'THE FIX, AND WHY IT\'S BETTER',
        t: 'Both choices went from costing thirty minutes to twenty, and from mildly annoying to properly annoying. That opened a real corridor — and it\'s thematically right, because forcing everyone into an alignment meeting is exactly the part that should make people hate you.',
      },

      { k: 'h', t: 'THE RULE THAT KEEPS THIS FROM RUINING YOUR GAME' },
      {
        k: 'p',
        t: 'The trap: the robot loses a lot, and your instinct is to make everything easier. But the robot is *bad at your game*. No intuition, no pattern recognition. Most of its losses aren\'t unfairness — they\'re a bad player playing badly, which your game is allowed to punish.',
      },
      {
        k: 'note',
        label: 'THE RULE',
        t: 'Before changing anything, classify every failure as genuine unfairness or bot error. Only fix the first kind. Otherwise you sand every edge off your game to satisfy something that can\'t feel tension.',
      },
      {
        k: 'p',
        t: 'The unreachable achievement was genuine unfairness — no skill fixes an impossibility. The naive bot spilling the lunch was not. That was the game working.',
      },
      {
        k: 'p',
        t: 'Writing the rules out as plain numbers, stripped of the 3D and dialogue and music, was the most clarifying thing I did on the whole project. When the whole system fits on one screen you can see which parts aren\'t doing anything.',
      },
    ],
  },

  // ── LOG-004 · verified: 197dcc2 ────────────────────────────────────────
  {
    key: 'LOG-004',
    slug: 'the-strobe-i-didnt-know-id-built',
    title: 'THE STROBE I DIDN’T KNOW I’D BUILT',
    dek: 'The dramatic freeze at the end of a fight was, at certain frame rates, a genuine health hazard. Two separate mistakes, both invisible on my machine.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['ACCESSIBILITY', 'HARM'],
    soWhat:
      'It is possible to hurt a stranger by accident with a visual effect, and much easier than you would think. Flashing and hard screen movement can trigger seizures in people with photosensitive epilepsy, and nothing in your tools warns you. This is the one category of mistake in game-making where the cost lands on someone else\'s body rather than your pride.',
    takeaway:
      'Anything that moves or flashes the whole screen must be driven by elapsed time, not by how many frames your computer happened to draw.',
    apply: [
      'Never randomise a visual effect per drawn frame. On a fast machine that produces a different random value 120 times a second, which is a strobe. Use a smooth decaying curve instead.',
      'Drive every whole-screen effect from elapsed time. The same code then looks identical on a slow laptop and a fast desktop — and it is the difference between a thump and a strobe.',
      'Be extra careful during pauses. A freeze that stops the action but keeps redrawing can flicker precisely when the screen is most dramatic, which is what happened to me.',
      'Honor the "reduce motion" setting your player\'s device already has. One line to read, and the people who need it have usually already turned it on.',
    ],
    source:
      'The accessibility section of commit 197dcc2, which documents both causes and both fixes as load-bearing and not to be regressed.',
    body: [
      {
        k: 'lead',
        t: 'The knockout at the end of a fight freezes the screen for a moment, shakes, and holds. It\'s the most dramatic thing in the game. It was also, on a fast enough display, a strobe.',
      },
      { k: 'p', t: 'Two separate mistakes stacked on top of each other, and neither was visible on the machine I built it on.' },

      { k: 'h', t: 'MISTAKE ONE — RANDOM, EVERY SINGLE FRAME' },
      {
        k: 'plain',
        term: 'FRAMES',
        t: 'A game redraws the screen many times a second — each redraw is a frame. A cheap laptop might draw 30 a second; a good monitor 120. If you write an effect as "do this every frame," it happens four times faster on the fast machine. Same code, different experience, and you will only ever see the version your own hardware produces.',
      },
      {
        k: 'p',
        t: 'My screen shake picked a fresh random offset on every drawn frame. That sounds reasonable — shake should look random. But a new random position 120 times a second isn\'t shaking. It\'s flickering, and at that rate the difference stops being aesthetic.',
      },
      {
        k: 'p',
        t: 'The fix was to replace randomness with a bounded decaying sine wave — a smooth wobble that fades out, computed from elapsed time. It looks better *and* it can\'t strobe, because its speed no longer depends on the hardware.',
      },

      { k: 'h', t: 'MISTAKE TWO — THE FREEZE WAS FLICKERING' },
      {
        k: 'p',
        t: 'This is the one I find genuinely unsettling, because the freeze is the part I was proudest of.',
      },
      {
        k: 'p',
        t: 'To make motion look smooth, the game draws positions part-way between the last two states. During the knockout freeze the action stops, but the drawing does not — and my code was recomputing that blend against a stale reference each time, so the transparency of the whole effect re-cycled on every drawn frame.',
      },
      {
        k: 'quote',
        t: 'The most dramatic second in the game was the second most likely to hurt somebody.',
      },
      {
        k: 'p',
        t: 'The fix was to take a snapshot of the previous state *before* the code that skips work during a freeze, so the freeze holds one stable image instead of re-deriving a slightly different one continuously.',
      },

      { k: 'h', t: 'WHY THIS MATTERS MORE THAN THE OTHER BUGS' },
      {
        k: 'p',
        t: 'Rapid full-screen flashing can trigger seizures in people with photosensitive epilepsy. They get no warning, and they cannot tell in advance that your game will do it.',
      },
      {
        k: 'p',
        t: 'No tool told me. There was no error, no warning, no check that went red. Elsewhere in this log I make a point about verifying that your automatic checks actually work — this is the category where there is no automatic check to verify.',
      },
      {
        k: 'note',
        label: 'WHAT THE PROJECT DOES NOW',
        t: 'All whole-screen motion is time-based and deterministic, frozen properly during pauses, and the fight honors the operating system\'s reduce-motion setting. It\'s written into the commit as load-bearing and not to be regressed, because the failure mode is silent and the person it hurts is not in the room.',
      },
    ],
  },

  // ── LOG-005 · verified: 3512d83 + Design_Language.md ───────────────────
  {
    key: 'LOG-005',
    slug: 'three-design-languages-on-purpose',
    title: 'THREE DESIGN LANGUAGES, ON PURPOSE',
    dek: 'My website, my fake corporate software, and my game display look nothing like each other. An audit found the problem wasn\'t the differences — it was the drift between them.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['DESIGN', 'SATIRE'],
    soWhat:
      'Everyone tells you to be consistent. That advice is slightly wrong. What you need is a reason for every difference. When I audited my own project, the visual system turned out to be fine — every actual defect was drift between three deliberate styles that no document had ever recorded. Writing them down fixed more than redesigning anything would have.',
    takeaway:
      'Consistency isn\'t the goal. Coherence is. Every difference should be a decision you could explain out loud — and if it isn\'t written down, it isn\'t a decision.',
    apply: [
      'Write your visual rules as actual sentences — colors, fonts, spacing, what the accent color is for. A page of plain text beats a mood board, because you can check work against sentences.',
      'If your project has more than one "world" (a website and a game, say), give each its own written rules and state why they differ.',
      'Note which mistake caused each rule. Future you will otherwise argue the rule was arbitrary and undo it.',
      'When something looks off, check for drift between your styles before you redesign anything. That\'s where the defects actually live.',
    ],
    source:
      'Commit 3512d83, which codified the three-layer design language after an audit, and the resulting Design_Language.md.',
    body: [
      {
        k: 'lead',
        t: 'There are three completely different visual styles in this project, and for a while I assumed that meant I\'d done something wrong.',
      },
      { k: 'ul', items: [
        'The studio website is loud — black and orange, enormous type, hard edges, no rounded corners anywhere.',
        'The fake workplace software inside the game — the ticket board, the chat app, the calendar — is bland, blue and rounded, because that is what real workplace software looks like.',
        'The in-game display is a third thing again: small, monospaced, sitting quietly on top of the 3D world.',
      ] },
      {
        k: 'plain',
        term: 'DESIGN LANGUAGE',
        t: 'The set of rules that make a bunch of separate screens feel like they came from the same place: which colors, which fonts, how much space, how corners are shaped. You already read these fluently — it\'s why a fake login page feels wrong even when you can\'t say why.',
      },

      { k: 'h', t: 'WHY THREE IS RIGHT HERE' },
      {
        k: 'p',
        t: 'The game is a satire of office life. If the fake ticket board looked stylish the joke would die on contact — the point is that it looks exactly like the software you resent on a Tuesday. It has to be boring. Being boring is the gag.',
      },
      { k: 'quote', t: 'The website is the poster. The fake software is the punchline. They should not look alike.' },

      { k: 'h', t: 'WHAT THE AUDIT ACTUALLY FOUND' },
      {
        k: 'p',
        t: 'When I finally went through the whole thing looking for visual defects, I expected to find that the three styles were the problem. They weren\'t. The system was sound.',
      },
      {
        k: 'p',
        t: 'Every real defect was *drift between* the three — a corner rounded on the brutalist site because I\'d been working in the software parody that morning, an accent color leaking across a boundary. Small things, individually invisible, collectively making the whole thing feel careless.',
      },
      {
        k: 'p',
        t: 'And the root cause was that no document recorded the three languages. They existed entirely in my head, which meant every boundary was a judgment call I made slightly differently each time.',
      },
      {
        k: 'note',
        label: 'WHAT THAT DOCUMENT LOOKS LIKE',
        t: 'About a page. "Backgrounds are #f1f0ec, never white." "Orange is a budget — one focal element per section, never a whole block." "No rounded corners, ever." Each rule cites the page that made it necessary, so future me can\'t claim it was arbitrary.',
      },
      {
        k: 'p',
        t: 'Every rule in that file exists because I broke it first. That turns out to be the only way I learn a design principle — reading it in a book does nothing; watching my own page get worse does everything.',
      },
    ],
  },

  // ── LOG-006 · verified: Design_Language.md rule 2 ──────────────────────
  {
    key: 'LOG-006',
    slug: 'orange-is-a-budget-not-a-paint',
    title: 'ORANGE IS A BUDGET, NOT A PAINT',
    dek: 'I made three cards all-orange to show they mattered. Nothing on the page mattered after that.',
    date: '2026-08-01',
    readMin: 4,
    tags: ['DESIGN', 'AUDIT'],
    soWhat:
      'This is the most transferable thing in this whole log and it has nothing to do with games. If you emphasize everything, you have emphasized nothing. It applies identically to a slide deck, a dashboard, a résumé — anywhere you are trying to make one thing stand out.',
    takeaway:
      'An accent color is a budget you spend, not a paint you apply. Spend it once per screen and it works. Spend it five times and it does nothing.',
    apply: [
      'Pick exactly one accent color and give it one job: marking the single most important thing on screen.',
      'Count your uses. One focal element per screenful. If you have three, two of them are lying about their importance.',
      'Squint until the screen blurs. Whatever still stands out is what your reader sees first. If that isn\'t what you wanted, you have your answer.',
      'When tempted to emphasize a second thing, ask which of the two you\'d cut. That\'s usually the real decision hiding underneath.',
    ],
    source:
      'Rule 2 of this project\'s Design_Language.md, which records the section that caused it: an old roadmap with three all-orange cards.',
    body: [
      {
        k: 'lead',
        t: 'I had a section on my website with three cards in it. All three were important, so I gave all three the full treatment — orange background, big type, the works.',
      },
      { k: 'p', t: 'The result was a page with three orange blocks and no emphasis at all.' },
      { k: 'quote', t: 'A highlighter works because most of the page isn\'t highlighted.' },

      { k: 'h', t: 'WHAT WAS ACTUALLY GOING WRONG' },
      {
        k: 'p',
        t: 'Emphasis isn\'t a property of a thing. It\'s a relationship between that thing and everything around it. Orange doesn\'t mean "important" — it means "more important than the things next to it, which are not orange." Remove the contrast and you remove the meaning, however bright the color.',
      },
      {
        k: 'p',
        t: 'So the fix wasn\'t a better shade. It was taking orange *away* from two of the three. The remaining one got louder without changing at all.',
      },
      {
        k: 'plain',
        term: 'VISUAL HIERARCHY',
        t: 'The order a person\'s eye moves through a screen. You control it with size, weight, color and space. Every screen has one whether you designed it or not — if you didn\'t decide what gets looked at first, something else did, usually the largest thing rather than the most important one.',
      },

      { k: 'h', t: 'THE RULE I WROTE DOWN' },
      {
        k: 'note',
        label: 'ORANGE IS A BUDGET',
        t: 'One focal element per section. A button, a status pill, a single highlighted phrase — never a whole block. If two things in the same view are competing for the accent, one of them isn\'t as important as I thought, and deciding which is the actual design work.',
      },
      {
        k: 'p',
        t: 'The unexpected part is how much this improved my writing rather than my layout. Deciding what gets the one orange thing forces you to decide what a section is *for*. Several sections turned out to be for nothing in particular, and I deleted them.',
      },
    ],
  },

  // ── LOG-007 · verified: 7de6c4a ────────────────────────────────────────
  {
    key: 'LOG-007',
    slug: 'the-car-that-vanished-but-left-its-shadow',
    title: 'THE CAR THAT VANISHED AND LEFT ITS SHADOW',
    dek: 'The player\'s car disappeared mid-drive while its shadow kept going. The cause was a division that happened one time, on the very first frame.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['3D', 'BUGS'],
    soWhat:
      'Some bugs come from a single bad number that then spreads silently through everything it touches. Once you know that this category exists — and know the one clue that gives it away — you will recognize it instantly instead of losing days. It is one of the highest-value things a beginner can learn.',
    takeaway:
      'When something vanishes rather than looking wrong, suspect a broken number rather than broken logic. Bad math doesn\'t draw an error; it draws nothing.',
    apply: [
      'Guard against the first frame. Elapsed time is often zero on the very first update, and anything that divides by it produces a broken number that never recovers.',
      'If part of a thing disappears but a related part stays (the shadow, the collision, the sound), that\'s your clue: the object still exists, so its position is broken, not the object.',
      'When you suspect a broken number, print it. It shows up plainly as "NaN" and that word instantly tells you which calculation to look at.',
      'Fix it where it\'s produced, not where you notice it. A broken number spreads — patching the display just hides it further downstream.',
    ],
    source:
      'Commit 7de6c4a, which records the root cause and fix: a zero-delta first frame made the suspension spring produce NaN, and the fix was flooring the time step and guarding the spring.',
    body: [
      {
        k: 'lead',
        t: 'The player\'s car disappeared while driving. Not gradually — gone. And its shadow stayed exactly where it should be, moving along the road, attached to nothing.',
      },
      {
        k: 'p',
        t: 'That detail is the entire clue, and at the time I had no idea.',
      },

      { k: 'h', t: 'THE ONE BAD NUMBER' },
      {
        k: 'plain',
        term: 'NaN — "NOT A NUMBER"',
        t: 'A special value computers produce when a calculation has no sensible answer, most commonly dividing by zero. Its dangerous property is that it is contagious: anything you calculate using it also becomes NaN. It does not raise an error or stop the program. It quietly spreads through every number it touches.',
      },
      {
        k: 'p',
        t: 'My car has simulated suspension — springs that compress over bumps, so it leans in corners and settles when you brake. Springs are calculated using how much time passed since the last update.',
      },
      {
        k: 'p',
        t: 'On the very first frame of the level, no time has passed yet. That value is zero. The spring calculation divided by it, and the result was NaN. From that instant, the car\'s position was not a number — and it never recovered, because every subsequent calculation used the previous one.',
      },
      {
        k: 'quote',
        t: 'The engine was asked to draw the car at "nowhere," so it drew nothing. Which is not a crash. It is worse than a crash, because nothing tells you.',
      },

      { k: 'h', t: 'WHY THE SHADOW STAYED' },
      {
        k: 'p',
        t: 'The shadow was being positioned by a different piece of code that hadn\'t touched the broken number. So the game still knew where the car was *supposed* to be, and happily drew its shadow there, while the car body itself had a position that couldn\'t be drawn anywhere.',
      },
      {
        k: 'p',
        t: 'That split — one part of an object fine, another part gone — is the fingerprint of this bug. If the whole object had vanished I\'d have suspected the object. Because only part of it went, the object plainly still existed, which means the problem had to be a value rather than the thing itself.',
      },

      { k: 'h', t: 'THE FIX, AND THE HABIT' },
      {
        k: 'p',
        t: 'Two small changes: put a floor under the time step so it can never be zero, and guard the spring so that if it ever does produce something impossible, it falls back to a sane value rather than poisoning everything downstream.',
      },
      {
        k: 'note',
        label: 'THE GENERAL SHAPE',
        t: 'A single bad value at one moment, spreading silently forever after. The giveaway is almost always that something disappears or goes still rather than looking wrong. Wrong-looking means your logic is off. Missing usually means a number stopped being a number.',
      },
      {
        k: 'p',
        t: 'I had guessed the cause completely wrong before checking — I assumed the engine was skipping the car because it thought the car was off-screen, which is a real thing engines do and would have been a perfectly reasonable explanation. It just wasn\'t this one. That\'s the argument for reading what your own records say instead of trusting the story you remember.',
      },
    ],
  },

  // ── LOG-008 · verified: 90bb640 ────────────────────────────────────────
  {
    key: 'LOG-008',
    slug: 'my-character-was-standing-still-the-whole-time',
    title: 'MY CHARACTER WAS STANDING STILL THE WHOLE TIME',
    dek: 'He looked like he was running. He was frozen in his idle pose with a fake bounce bolted on. The fix used an animation I already had.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['ANIMATION', '3D'],
    soWhat:
      'You can get professional character movement for free without being an animator. What nobody tells you is that downloading it is a small part of the work — the rest is wiring it up so the right movement plays at the right moment and the right speed. And you often already have what you need.',
    takeaway:
      'The asset isn\'t the work. Getting the right one to play at the right moment, at the right speed, is the work — and one clip can often do several jobs.',
    apply: [
      'Write down your character\'s states before downloading anything: idle, walking, running, jumping. That list is your shopping list and your wiring diagram at once.',
      'Try speeding up a clip you already have before hunting a new one. A brisk walk played faster reads convincingly as a jog, and it costs you nothing.',
      'Match the animation speed to how fast the character actually moves. Mismatch it and the feet skate across the floor — the single most recognizable amateur 3D tell.',
      'If you\'ve bolted on a fake bounce to make something feel alive, delete it once a real clip is driving the body. Two sources of motion fight each other.',
    ],
    source:
      'Commit 90bb640, which records that the character was rendering in his idle pose with a procedural bob, and the fix: drive the idle model with the walking clip at 1.7× speed.',
    body: [
      {
        k: 'lead',
        t: 'My character ran across the screen for weeks and I thought he was animated. He wasn\'t. He was standing perfectly still in his idle pose, bobbing up and down, being slid sideways by the game.',
      },
      {
        k: 'p',
        t: 'It looked *almost* right, which is why it survived so long. The bob sold enough motion that my eye filled in the rest.',
      },

      { k: 'h', t: 'HOW BORROWED ANIMATION WORKS' },
      {
        k: 'plain',
        term: 'RIG AND ANIMATION CLIP',
        t: 'A 3D character has an invisible skeleton inside it, called a rig. An animation clip is a recording of that skeleton moving — a walk, a jump, a wave — stored separately from the character itself. Because the skeleton is a standard shape, a clip recorded for one character can play on a completely different one. That\'s why you can download a walk and put it on your own character for free.',
      },
      {
        k: 'p',
        t: 'This is one of the best deals available to a beginner: professional motion-captured movement, free, in a format that works. It makes an amateur project look dramatically better in an afternoon.',
      },
      {
        k: 'p',
        t: 'The catch is that you get a pile of separate clips and no opinion about when each should play. That part is entirely yours, and it\'s where things look wrong.',
      },

      { k: 'h', t: 'THE FIX I DIDN\'T EXPECT' },
      {
        k: 'p',
        t: 'I assumed I needed to go and download a running animation. I didn\'t. The fix was to take the character model from the idle file, but drive its skeleton with the walking clip I already had — and play it at 1.7 times speed.',
      },
      { k: 'quote', t: 'A brisk walk, sped up, reads as a jog. Nobody has ever noticed.' },
      {
        k: 'p',
        t: 'It\'s the same walk he uses in the office. One clip, two jobs, no new download. And because the wiring refers to animations by name, swapping in a real running clip later is a one-line change.',
      },
      {
        k: 'note',
        label: 'THE THING I HAD TO REMOVE',
        t: 'Once the real clip was driving the body, the fake bounce had to go — it was fighting the animation, because the clip already moves the body up and down. Two sources of motion on the same thing always look worse than either alone.',
      },

      { k: 'h', t: 'THE HABIT WORTH STEALING' },
      {
        k: 'p',
        t: 'Write the list of states before shopping. Idle, walk, run, jump, land. Five words on paper. That list tells you exactly what to find and exactly what to wire, and it stops you doing what I did — which was grabbing something that looked good and working backwards trying to find a moment for it.',
      },
      {
        k: 'p',
        t: 'That\'s the animation equivalent of buying furniture before measuring the room.',
      },
    ],
  },

  // ── LOG-009 · verified: 592ff50, e3f3f76 ───────────────────────────────
  {
    key: 'LOG-009',
    slug: 'four-notes-across-four-games',
    title: 'FOUR NOTES ACROSS FOUR GAMES',
    dek: 'A4, C5, B4, G4. The little sting when one stage hands you to the next is the same phrase that later swells into a whole theme.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['AUDIO', 'COHESION'],
    soWhat:
      'Making separate pieces feel like one project is usually assumed to be expensive — matching art, shared assets, a consistent look. It isn\'t. One small element repeated everywhere does most of the work, and sound is the cheapest version of that trick available to someone with no art skills.',
    takeaway:
      'Cohesion is cheaper than it looks. Four notes did more to bind four games together than any amount of matching artwork would have.',
    apply: [
      'Pick one tiny element and put it in every part of your project — a few notes, one sound, one recurring phrase. It has to be small enough to survive being rearranged.',
      'Plant it quietly first, then let it grow. Mine is a soft sting at each handoff, and the same phrase opens a full theme later. People recognize it without knowing why.',
      'Use one sound for one meaning everywhere. A single notification sound across your whole project teaches players a language for free.',
      'Keep it under whatever it sits behind. Mine is deliberately quiet — tucked below another sound, felt more than heard.',
    ],
    source:
      'Commit 592ff50 (the four-note motif and where it recurs) and commit e3f3f76 (unifying the notification sound across all four games).',
    body: [
      {
        k: 'lead',
        t: 'I had four games that were supposed to be four parts of one day, and they stubbornly felt like four unrelated things. They shared a character and a story. It wasn\'t enough.',
      },
      { k: 'p', t: 'What fixed it was four notes: A4, C5, B4, G4.' },

      { k: 'h', t: 'WHAT A MOTIF ACTUALLY IS' },
      {
        k: 'plain',
        term: 'MOTIF (OR LEITMOTIF)',
        t: 'A very short musical phrase — a few notes — repeated throughout a work and dressed differently each time. Film scores lean on this constantly: the same handful of notes played by strings in a sad scene and by brass in a triumphant one. Your ear links the scenes together without you consciously noticing the melody repeated.',
      },
      {
        k: 'p',
        t: 'Mine plays as a soft logo sting every time one stage hands you off to the next, tucked just behind the chat-notification knock — quiet enough that you feel it rather than hear it.',
      },

      { k: 'h', t: 'THE PART THAT MAKES IT WORK' },
      {
        k: 'p',
        t: 'Those four notes are deliberately the same four that open the heroic lead theme in the arcade stage. So the little hook you hear when the executive hands you to the next stage is the phrase that later swells into an actual anthem.',
      },
      {
        k: 'quote',
        t: 'Nobody notices the melody. Everybody notices that the four games feel like one place.',
      },
      {
        k: 'p',
        t: 'That\'s a leitmotif *developing* across a campaign rather than just repeating, and it cost one small self-contained synth that plays in every stage without touching either music system.',
      },

      { k: 'h', t: 'THE SAME TRICK, EVEN CHEAPER' },
      {
        k: 'p',
        t: 'There\'s one chat-notification knock in this project and it plays in every stage. It used to be a different sound in each — the arcade stage had its own little synth blip — and unifying them was a smaller change than the motif with nearly as much effect.',
      },
      {
        k: 'p',
        t: 'It became the sound of the day interrupting you. I didn\'t plan that meaning. Repetition created it.',
      },
      {
        k: 'note',
        label: 'THE CHEAP VERSION',
        t: 'If you take one thing from this: use the same short sound for the same kind of event across your entire project. Same chime for every notification, same thunk for every failure. Players learn the language in about a minute, and it makes a hobby project feel considered.',
      },
    ],
  },

  // ── LOG-010 · verified: e3f3f76 ────────────────────────────────────────
  {
    key: 'LOG-010',
    slug: 'every-ending-costs-zero-dollars',
    title: 'EVERY ENDING COSTS $0.00',
    dek: 'All four games close on the same immovable line, win or lose. Getting there meant noticing that one of them didn\'t.',
    date: '2026-08-01',
    readMin: 4,
    tags: ['NARRATIVE', 'RESTRAINT'],
    soWhat:
      'The strongest instinct a beginner has is to make sure the audience got it — one more line, one more clarifying sentence, one more variation so it feels responsive. That instinct is usually wrong. A thing that refuses to react is often saying more than a thing that reacts perfectly.',
    takeaway:
      'The line lands because it never changes. Make your best idea immovable rather than responsive.',
    apply: [
      'Find the single line or image that says what your whole project is about, and put it in the same place every time.',
      'Resist making it dynamic. If it responds to how well the player did, it becomes a score. If it refuses to, it becomes a statement.',
      'Delete the sentence after it. That sentence is you being nervous, and cutting it makes the line before it stronger.',
      'Audit for the place you forgot. Mine was missing from exactly one of four endings, which quietly weakened all of them.',
    ],
    source:
      'Commit e3f3f76, which added the line to the one ending that was missing it so all four close identically.',
    body: [
      {
        k: 'lead',
        t: 'Every ending in every stage of this game, win or lose, closes on the same line: *Actual Business Value Generated: $0.00.*',
      },
      { k: 'p', t: 'No character says it. Nothing references it. It appears, and then the game is over.' },

      { k: 'h', t: 'THE VERSION THAT ALMOST SHIPPED' },
      {
        k: 'p',
        t: 'For a while it wasn\'t on all of them. Three stages had it. The first one — the original game, the one everything else grew out of — didn\'t.',
      },
      {
        k: 'p',
        t: 'That sounds trivial and it wasn\'t. A line that appears at the end of three out of four endings is a nice touch. A line that appears at the end of *every* ending, without exception, is a rule the game obeys — and rules are what the player notices.',
      },
      { k: 'quote', t: 'Three out of four is a flourish. Four out of four is an argument.' },

      { k: 'h', t: 'WHY IT DOESN\'T CHANGE' },
      {
        k: 'p',
        t: 'The obvious next idea is to vary it — a better number for a good day, a worse one for a disaster. That was my instinct too, and it would have destroyed it.',
      },
      {
        k: 'p',
        t: 'The point is that it *doesn\'t* move. You can play brilliantly, keep everyone happy, hit every target, and the figure is identical to the run where everything collapsed. That\'s the whole argument of the game, and it\'s made by the number refusing to respond to you.',
      },
      {
        k: 'note',
        label: 'A TEST FOR YOUR OWN WRITING',
        t: 'Find the line you\'re proudest of. Read what comes immediately after it. If that next line explains, softens or restates it — cut it and read again. This has never once made my writing worse, which is a strange thing to be able to say about a rule.',
      },
    ],
  },

  // ── LOG-011 · verified: 2ce1d42 ────────────────────────────────────────
  {
    key: 'LOG-011',
    slug: 'a-save-file-that-survives-a-cleared-cookie',
    title: 'A SAVE FILE THAT SURVIVES A CLEARED COOKIE',
    dek: 'The whole campaign lived in four little browser slots and died with a privacy cleanup. The fix turned out to be a respect problem, not a technical one.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['BROWSER', 'PLAYER RESPECT'],
    soWhat:
      'If your game runs in a web browser, everything it remembers is fragile — one privacy sweep and a player\'s entire progress is gone, silently, with no way back. Deciding what happens then is a design decision about how much you value someone\'s time, and most beginners never make it consciously.',
    takeaway:
      'Someone gave you twenty minutes of their life. Losing it silently is a design decision, even when you make it by not deciding.',
    apply: [
      'Assume browser storage will vanish. Privacy tools clear it routinely, private windows never keep it, and it doesn\'t follow anyone to another browser.',
      'Give people a way to carry progress out — a code they can copy. It turns an invisible fragile thing into something they can hold.',
      'Dress the boring feature as part of your world. Mine is presented as your HR file, which made people want to look at it rather than treat it as a chore.',
      'Refuse anything pasted in that you didn\'t issue, and only restore the specific things you expect. A save code is an input from outside, and inputs from outside get checked.',
    ],
    source:
      'Commit 2ce1d42, which packed four browser storage keys into one copyable code and verified export, wipe, and restore end to end.',
    body: [
      {
        k: 'lead',
        t: 'A browser game remembers you using a small pocket of storage inside the browser. It works well, right up until it doesn\'t.',
      },
      {
        k: 'plain',
        term: 'BROWSER STORAGE',
        t: 'Space a website is allowed to keep on your computer — a note it leaves for itself so it recognizes you next visit. It survives closing the tab and restarting the machine. It does *not* survive clearing your browsing data, it never exists in a private window, and it doesn\'t follow you between browsers. Progress made in Chrome is invisible in Safari.',
      },
      {
        k: 'p',
        t: 'My whole campaign lived in four of those slots — which stages you\'d unlocked, what you\'d chosen, and two separate sets of achievements. All four died together with one routine privacy cleanup.',
      },

      { k: 'h', t: 'WHY I DIDN\'T JUST ADD ACCOUNTS' },
      {
        k: 'p',
        t: 'The obvious fix is to make people sign up so progress lives on a server. I didn\'t want that, and not only because it\'s more work.',
      },
      {
        k: 'p',
        t: 'The whole promise here is that you click a link and you\'re playing. No install, no account, no email address. Adding a signup wall to protect a twenty-minute game costs more players than the forgetting does.',
      },
      { k: 'quote', t: 'The fix couldn\'t cost more than the problem. That ruled out the obvious one.' },

      { k: 'h', t: 'WHAT I DID INSTEAD' },
      {
        k: 'p',
        t: 'All four slots get packed into a single short code you can copy, keep anywhere, and paste back in later on any machine. In the fiction it\'s your HR file, which turned a chore into something people actually want to look at.',
      },
      {
        k: 'note',
        label: 'THE PART I ALMOST GOT WRONG',
        t: 'A save code is text from outside your program, and anything from outside gets treated as suspicious. Mine is tagged so a stray paste is rejected rather than half-loaded, and restoring only writes the specific things it expects — so a hostile code can\'t stuff arbitrary junk into a player\'s browser. That took ten extra minutes and it is not optional.',
      },
      {
        k: 'p',
        t: 'And it\'s verified the only way that counts: export the code, wipe everything, paste it back, confirm the progress and achievements return. A backup you have never restored is not a backup — which is the same lesson as the green checkmark, arriving from a completely different direction.',
      },
    ],
  },

  // ── LOG-012 · verified: 600172c ────────────────────────────────────────
  {
    key: 'LOG-012',
    slug: 'my-laptop-was-rendering-four-times-the-pixels',
    title: 'MY SCREEN WAS RENDERING FOUR TIMES THE PIXELS',
    dek: 'It ran beautifully on the machine I built it on. That machine was the problem, not the benchmark.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['PERFORMANCE', '3D'],
    soWhat:
      'You will build on the computer you own and unconsciously design for it. If your game stutters on an ordinary laptop, most people who click your link leave in the first ten seconds and you never hear from them — this is the failure that produces total silence, which is easy to mistake for nothing being wrong.',
    takeaway:
      'A sharp screen quietly costs you four times the work for a difference nobody asked for. Cap it, and get the frames back for free.',
    apply: [
      'Cap how sharply your game renders. A high-resolution screen will otherwise draw roughly four times as many pixels for a difference most players cannot see in motion.',
      'Stop rendering entirely when your game isn\'t on screen. A browser tab in the background will happily keep burning someone\'s battery.',
      'Halve your shadow quality and look at it honestly. Mine went to a quarter of the memory and I genuinely cannot tell in a small indoor scene.',
      'Test on the oldest computer you can borrow, in the first week. Late performance problems are design problems wearing a disguise.',
    ],
    source:
      'Commit 600172c, whose performance section lists each change and its measured effect on older laptops and integrated graphics.',
    body: [
      {
        k: 'lead',
        t: 'My game ran smoothly for me and badly for other people, and the biggest single cause was something I\'d never have guessed: my screen was too good.',
      },

      { k: 'h', t: 'THE PIXEL PROBLEM' },
      {
        k: 'plain',
        term: 'PIXEL DENSITY',
        t: 'High-resolution screens pack several physical dots into the space of one old-fashioned pixel, which is why text looks crisp. The catch: unless you say otherwise, a 3D game renders at that full density — so a sharp laptop screen can be drawing about four times as many pixels as a normal one for the same window. Four times the work, for a difference that mostly disappears once things are moving.',
      },
      {
        k: 'p',
        t: 'Capping that was the single biggest win in the whole performance pass, and it changed nothing anyone can see. It is close to free frames.',
      },

      { k: 'h', t: 'THE OTHER THREE' },
      { k: 'ul', items: [
        'Turned off edge-smoothing on high-density displays, where the screen is already sharp enough that it\'s mostly invisible — and it costs real work every frame.',
        'Stopped rendering completely while the browser tab is hidden, and resumed on return. Otherwise a forgotten tab quietly drains someone\'s battery on your behalf.',
        'Halved the shadow resolution. That cut shadow memory to a quarter — 16 MB down to 4 — and halved the cost of the shadow pass. In a small indoor scene, there is still plenty of detail.',
      ] },
      {
        k: 'quote',
        t: 'Not one of those changed the design. The game looks the same. It just stopped doing four times the work for no visible benefit.',
      },

      { k: 'h', t: 'THE MISTAKE UNDERNEATH THE MISTAKE' },
      {
        k: 'p',
        t: 'The real error wasn\'t technical. It was testing exclusively on a machine that hid the problem, for months, while making decisions that quietly assumed that machine.',
      },
      {
        k: 'note',
        label: 'WHY THIS ONE IS SNEAKY',
        t: 'Someone whose browser stutters doesn\'t file a bug report. They close the tab and never mention it. This failure produces total silence, and silence is very easy to read as everything being fine.',
      },
    ],
  },

  // ── LOG-013 · verified: blueprint acceptance criteria ──────────────────
  {
    key: 'LOG-013',
    slug: 'show-the-price-before-they-pay-it',
    title: 'SHOW THE PRICE BEFORE THEY PAY IT',
    dek: 'The single design rule that turned my conversations from reading into deciding — written into the spec as a requirement, not discovered by accident.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['DESIGN', 'FUNDAMENTALS'],
    soWhat:
      'A choice is only interesting if the player understands what it costs. Hide the consequences and you have a quiz with invisible answers; show them and the same words become a genuine decision. This is the cheapest way to make any interactive thing feel meaningful, and it costs no new content at all.',
    takeaway:
      'A choice without a visible cost isn\'t a choice, it\'s a guess. Show the price and the same words become a decision.',
    apply: [
      'Show what each option will cost before the player commits — not after. The tension lives in the moment before choosing.',
      'Make sure no option is free. If one choice has no downside, it isn\'t an option, it\'s the answer, and everything else is decoration.',
      'Let players take the bad deal knowingly. Being able to see the cost and choose it anyway is where the feeling comes from.',
      'Test your core action stripped bare — no music, no story, no rewards. Thirty seconds of just that. If it isn\'t interesting naked, nothing you add on top will rescue it.',
    ],
    source:
      'The MVP acceptance criteria in this project\'s game blueprint, which require that choice buttons preview their consequences before selection.',
    body: [
      {
        k: 'lead',
        t: 'My game is mostly conversations. You walk up to someone, they describe a problem, and you pick one of three or four responses. Written down like that it sounds like a quiz, and quizzes are not fun.',
      },
      {
        k: 'p',
        t: 'What makes it a game is a rule that was in the spec before any of it was built: every option shows exactly what it will cost you, before you choose it.',
      },

      { k: 'h', t: 'WHAT THAT LOOKS LIKE' },
      {
        k: 'p',
        t: 'Under each response is a row of small chips. Time +15m. Team Pissed-Off +7. Meeting Load +14. Project Status −3. You can read all four options and their prices before committing to any of them.',
      },
      {
        k: 'plain',
        term: 'THE CORE LOOP',
        t: 'The small set of actions a player repeats constantly — the thing they spend most of their time doing. Everything else in a game (story, art, achievements) sits on top of that loop and multiplies it. If the loop is dull, more content makes a dull game longer rather than better.',
      },
      {
        k: 'p',
        t: 'With the prices hidden, my loop is: read a problem, guess. With the prices shown, it becomes: read a problem, weigh four bad deals against a clock, take one knowing exactly what it costs.',
      },
      { k: 'quote', t: 'Same words. Same characters. Same art. Completely different activity.' },

      { k: 'h', t: 'WHY NO OPTION CAN BE FREE' },
      {
        k: 'p',
        t: 'The rule only works if every choice hurts somewhere. The honest answer costs you twenty minutes you don\'t have. Filing a ticket converts the problem into paperwork. Booking a meeting spawns another meeting. Waving it through keeps your status green and comes back to bite you two conversations later.',
      },
      {
        k: 'p',
        t: 'If one option were simply best, there\'d be nothing to decide and the other three would be scenery. The design work isn\'t writing four options — it\'s making sure all four are defensible.',
      },
      {
        k: 'note',
        label: 'THE TEST WORTH RUNNING EARLY',
        t: 'Strip out the music, story, rewards and art, and play only your core action for thirty seconds. Would you keep going? Run this in week one when the answer is cheap, not in month three when everything you\'ve built sits on top of it.',
      },
      {
        k: 'p',
        t: 'This is also the part an AI can\'t do for you. It will build any mechanic you describe, quickly and well. It cannot tell you the mechanic is boring, because it isn\'t playing it and has no stake in whether the next thirty seconds are worth living through.',
      },
    ],
  },

  // ── LOG-014 · summary ──────────────────────────────────────────────────
  {
    key: 'LOG-014',
    slug: 'what-id-tell-someone-on-day-one',
    title: 'WHAT I’D TELL SOMEONE ON DAY ONE',
    dek: 'Everything above, compressed — minus the parts that only sound wise in retrospect.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['BEGINNINGS'],
    soWhat:
      'If you read one post here, this is the one. It\'s the advice I\'d hand to someone with an idea, no technical background, and a suspicion they\'re not allowed to try. You are allowed. Here is what will actually be hard, which is rarely what people expect.',
    takeaway:
      'The code was never the hard part. Deciding what should exist, and being honest about whether it\'s any good, is the whole job — and it was always available to you.',
    apply: [
      'Start with the smallest complete thing, not your best idea. A five-minute game someone finishes teaches you more than a masterpiece abandoned in month four.',
      'Play what you build the same day you build it. The gap between "it works" and "it\'s fun" only shows up when you play, and it never closes on its own.',
      'Keep records as you go. Write down what broke and why, in the moment — it is the only reason anything in this log is trustworthy months later.',
      'Publish before you feel ready. The version you\'re embarrassed by, in public, beats the perfect one nobody sees.',
    ],
    source: 'A summary of the posts above; each individual claim is sourced in its own post.',
    body: [
      {
        k: 'lead',
        t: 'I had one idea and no qualifications, and I assumed those two facts cancelled each other out. They didn\'t. Here\'s what I actually learned, in the order it mattered.',
      },

      { k: 'h', t: '1 · THE CODE IS NOT THE HARD PART ANYMORE' },
      {
        k: 'p',
        t: 'You can describe what you want in plain English and get a working version. What you cannot outsource is knowing what to ask for, and noticing when the answer is wrong. An AI will build a bad idea beautifully and never mention that it\'s bad.',
      },

      { k: 'h', t: '2 · SHOW THE PRICE BEFORE THEY PAY IT' },
      {
        k: 'p',
        t: 'A choice without a visible cost is a guess. Showing what each option costs turned my conversations from reading into deciding, with no new content at all. And make sure no option is free, or the others are scenery.',
      },

      { k: 'h', t: '3 · YOU ARE THE WORST JUDGE OF YOUR OWN DIFFICULTY' },
      {
        k: 'p',
        t: 'You know all the answers and can\'t un-know them. When I finally tested my driving level properly, the finding wasn\'t that it was too hard — it was that nobody could possibly lose. I\'d driven it dozens of times and read my own comfort as good design.',
      },

      { k: 'h', t: '4 · VERIFY THAT YOUR CHECKS CAN FAIL' },
      {
        k: 'p',
        t: 'Break anything automatic on purpose once, to confirm it notices. Mine reported success for weeks while examining zero files. A check you have never seen go red is decoration.',
      },

      { k: 'h', t: '5 · WHEN SOMETHING VANISHES, SUSPECT A NUMBER' },
      {
        k: 'p',
        t: 'My car disappeared mid-drive and left its shadow behind. The cause was a division by zero on the very first frame, producing a broken value that spread silently forever after. Wrong-looking means your logic is off; *missing* usually means a number stopped being a number.',
      },

      { k: 'h', t: '6 · TEST ON A BAD COMPUTER, EARLY' },
      {
        k: 'p',
        t: 'You\'ll design for the machine you own without noticing. People whose browser stutters don\'t complain — they close the tab. That failure is completely silent, which is why you have to go looking for it.',
      },

      { k: 'h', t: '7 · SOME MISTAKES LAND ON OTHER PEOPLE' },
      {
        k: 'p',
        t: 'My knockout effect was a strobe on fast displays, because it randomised the screen position on every drawn frame. Flashing can trigger seizures, nothing in your tools warns you, and the most dramatic second in my game was the most dangerous one. Drive whole-screen motion by time, never by frames.',
      },

      { k: 'h', t: '8 · CUT THE SENTENCE AFTER YOUR BEST LINE' },
      {
        k: 'p',
        t: 'It\'s always there, always explaining, always weaker than what it follows. My whole game ends on one unexplained line and it\'s the best decision in it.',
      },

      { k: 'h', t: 'AND THE ONE THAT ISN\'T A TECHNIQUE' },
      {
        k: 'p',
        t: 'I spent years assuming making a game required permission I\'d never been given. It doesn\'t. It requires an idea you can\'t drop, a willingness to play your own thing honestly, and a tolerance for being bad at something in public for a while.',
      },
      {
        k: 'quote',
        t: 'I\'m not a game developer. I made games anyway. Those two facts sit together more comfortably than I expected.',
      },
    ],
  },
]

// ── Backlog ──────────────────────────────────────────────────────────────
// Empty. Kept as a type + export so the index can show a backlog section
// again the moment there's something real to put in it — Blog.tsx renders
// nothing when this is empty rather than an awkward "0 items" header.

export type BacklogItem = {
  key: string
  title: string
  note: string
  status: 'NEXT UP' | 'DRAFTING' | 'BACKLOG' | 'ICEBOX'
  tags: string[]
}

export const BACKLOG: BacklogItem[] = []

export function postBySlug(slug: string | undefined): Post | undefined {
  return POSTS.find((p) => p.slug === slug)
}
