// src/content/posts.ts — dev-log posts for /blog.
//
// Data only. Rendering lives in routes/Blog.tsx (index) and
// routes/BlogPost.tsx (single post). Posts are authored as typed blocks
// rather than markdown so we don't ship a parser or use
// dangerouslySetInnerHTML for what is, ultimately, six block types.
//
// Inline emphasis: wrap a span in *asterisks* and the renderer italicises
// it. That is the whole markup language. Resist adding a second rule.
//
// VOICE (applies here and in routes/About.tsx):
//   Contractions on. Sentence lengths uneven — short fragments are fine,
//   so are run-ons. At most one aphorism per post; if every paragraph
//   lands a neat closing line it stops sounding like a person. Not every
//   thought has to resolve. American spellings. Prefer a period over an
//   em-dash when either would work.
//
// ANONYMITY CONTRACT (applies here and in routes/About.tsx):
//   No real name. No employer, past or present. No job titles, industry,
//   city, or team size. No dates precise enough to correlate with a
//   public layoff. Years-of-experience and company-count are fine at the
//   granularity used here; anything narrower is not.
//
// The BACKLOG at the bottom is deliberately public — an unwritten-posts
// list rendered as a Jira backlog is on-theme, and it commits the author
// to shipping them.

export type Block =
  | { k: 'p'; t: string }
  | { k: 'lead'; t: string }
  | { k: 'h'; t: string }
  | { k: 'quote'; t: string }
  | { k: 'ul'; items: string[] }
  | { k: 'code'; t: string; cap?: string }
  | { k: 'note'; label: string; t: string }

export type Post = {
  /** In-fiction ticket key. Also shown on the index card. */
  key: string
  slug: string
  title: string
  /** One-line hook for the index card. Sentence case. */
  dek: string
  /** ISO date — rendered as e.g. 2026-07-31. Keep coarse; no times. */
  date: string
  readMin: number
  tags: string[]
  /** The single sentence someone should leave with. Rendered in a box. */
  takeaway: string
  body: Block[]
}

export const POSTS: Post[] = [
  // ── LOG-001 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-001',
    slug: 'i-have-never-written-a-line-of-game-code',
    title: 'I HAVE NEVER WRITTEN A LINE OF GAME CODE',
    dek: 'Starting a dev log with no qualifications, one idea, and an AI that will write anything you ask it to — including the wrong thing, confidently.',
    date: '2026-07-31',
    readMin: 6,
    tags: ['BEGINNINGS', 'AI', 'HONESTY'],
    takeaway:
      'The bottleneck was never the code. It was knowing what to ask for, and nobody can generate that part for you.',
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
        t: 'Yes, an AI wrote most of the code. I\'m not going to be cute about it, and I\'m not going to call it a "collaboration" in the way that flatters me. I described what I wanted, it produced something, I played it, and maybe a third of the time it was wrong in a way I couldn\'t have diagnosed on my own.',
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

      { k: 'h', t: 'THE FIRST THING THAT WENT WRONG' },
      {
        k: 'p',
        t: 'My first working build had a camera hanging above the office looking straight down. Technically a game. You could walk around, you could talk to people. It was completely dead.',
      },
      {
        k: 'p',
        t: 'Took me two days to work out why. Same dialogue, same office, same everything. Then I moved the camera to third person, over the shoulder, and the identical content turned into a *place* instead of a diagram.',
      },
      {
        k: 'note',
        label: 'LOCKED DECISION',
        t: 'Third-person follow camera. Never top-down, never isometric. This is written into the project brief now so no future version of me relitigates it at 11pm.',
      },
      {
        k: 'p',
        t: 'Nobody taught me that in a lecture. I felt it. First time I thought I might actually be able to do this — not because I understood cameras, but because I could tell.',
      },

      { k: 'h', t: 'WHY A DEV LOG, AND WHY ANONYMOUS' },
      {
        k: 'p',
        t: 'Anonymous because I still have the job. That\'s the whole reason. No mystique, just an employment contract and a healthy respect for it.',
      },
      {
        k: 'p',
        t: 'A dev log because when I started I went looking for writing by people in exactly my position — no experience, no team, no engine knowledge, building anyway — and mostly found professionals explaining shader math, or threads insisting AI had made game development trivial. The first assumed I knew things. The second was lying.',
      },
      {
        k: 'p',
        t: 'So these are notes from the middle. What broke, why it broke, what I\'d tell someone a week behind me.',
      },
      {
        k: 'p',
        t: 'Fair warning: I\'ll use the wrong word for things. If you make games for real and something in here makes you wince, that\'s the price of watching someone learn in public.',
      },
    ],
  },

  // ── LOG-002 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-002',
    slug: 'the-green-checkmark-that-was-lying',
    title: 'THE GREEN CHECKMARK THAT WAS LYING',
    dek: 'My type checker passed for weeks. It had been checking zero files. A lesson about status theater I did not expect to find in a terminal.',
    date: '2026-07-31',
    readMin: 5,
    tags: ['TOOLING', 'AI', 'STATUS GREEN'],
    takeaway:
      'A passing check is only worth what it actually checked. Ask any dashboard what its denominator is.',
    body: [
      {
        k: 'lead',
        t: 'For a few weeks, the command I ran to confirm my code was correct came back clean every single time. Instantly. No errors, no warnings, nothing.',
      },
      { k: 'p', t: 'It was checking nothing. Zero files. A green light wired to an empty room.' },

      { k: 'h', t: 'HOW IT HAPPENED' },
      {
        k: 'p',
        t: 'The project has a config file that tells the type checker which code to look at. Mine pointed at two other config files instead of listing any code itself, which is a completely normal way to set this up. But the command I\'d been running only read the top file, found nothing listed, and reported success.',
      },
      {
        k: 'code',
        cap: 'What I had been running, vs. the one that actually inspects the project',
        t: 'npx tsc --noEmit   # → passes instantly. Checked 0 files.\nnpx tsc -b         # → follows the references. Found real errors.',
      },
      {
        k: 'p',
        t: 'A pile of errors, first time I ran it properly. Some had been sitting there over a week, in code I\'d shipped, in games people had played. The site worked anyway (browsers forgive things a type checker won\'t) but I\'d been running on a signal that literally could not fail.',
      },

      { k: 'h', t: 'THE PART THAT MADE ME LAUGH, THEN NOT LAUGH' },
      {
        k: 'quote',
        t: 'A status light that can\'t go red isn\'t a status light. It\'s decor.',
      },
      {
        k: 'p',
        t: 'I make a game about a company where the project is GREEN because someone said so in a meeting, and I\'d accidentally built myself the same instrument. Nobody lied. The tool did exactly what it was told to do. How many files it checked simply wasn\'t a number anyone looked at.',
      },
      {
        k: 'p',
        t: 'Which is how most of it works, in games and offices both. Not fraud. Just a metric whose denominator nobody thought to ask about.',
      },

      { k: 'h', t: 'IF YOU ARE BUILDING WITH AI' },
      {
        k: 'p',
        t: 'This is the failure mode nobody warned me about. The AI runs your check, sees the success message, and tells you — accurately, in good faith — that everything passes. It\'s reading the same lying dashboard you are.',
      },
      {
        k: 'p',
        t: 'It\'s not hallucinating. It\'s trusting your setup. So a broken check doesn\'t just miss your bugs. It launders them into a confident all-clear.',
      },
      { k: 'ul', items: [
        'Break something on purpose the first time you set up any check. If it still passes, it isn\'t connected to anything.',
        'Learn the difference between "no errors found" and "no files examined." Most tools don\'t distinguish these in their output.',
        'A suspiciously fast check is data. Instant success on a big project usually means it didn\'t look.',
        'Write the correct command down somewhere permanent, not in your head. I forgot mine twice.',
      ] },

      { k: 'h', t: 'THE FIX WAS ONE CHARACTER' },
      {
        k: 'p',
        t: 'Two, if you count the space. That\'s the bit I keep turning over. Weeks of false confidence undone by a flag I didn\'t know existed, and the only reason I found it is that a bug turned up in the browser that the checker had sworn was impossible.',
      },
      {
        k: 'p',
        t: 'I didn\'t find it by being clever. I found it because reality disagreed with the dashboard and I believed reality.',
      },
      {
        k: 'note',
        label: 'DEADPAN CORNER',
        t: 'The project status remained GREEN throughout. It was, in fairness, always going to.',
      },
    ],
  },

  // ── LOG-003 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-003',
    slug: 'i-built-a-robot-to-play-my-own-game',
    title: 'I BUILT A ROBOT TO PLAY MY OWN GAME',
    dek: 'I could not tell whether my game was too hard, because I had played it into the ground and knew every answer. So I made something that had never seen it before.',
    date: '2026-07-31',
    readMin: 7,
    tags: ['BALANCE', 'PLAYTESTING', 'FAIRNESS'],
    takeaway:
      'You can\'t playtest your own difficulty. You\'re the one player in the world who already has the answer key.',
    body: [
      {
        k: 'lead',
        t: 'Something I didn\'t see coming: the moment you finish building a game, you become permanently unqualified to judge how hard it is.',
      },
      {
        k: 'p',
        t: 'I know which coworker is lying. I know which lane the obstacle is in. I know the route across town without looking at the map. Every run I did was a run with the answer key, and I was using those runs to decide whether the thing was fair.',
      },

      { k: 'h', t: 'THE ACHIEVEMENT NOBODY COULD GET' },
      {
        k: 'p',
        t: 'The first game has achievements — different ways the morning can go. One of them rewards you for finishing the day aligned on the project and personally despised by everyone in the office. It\'s my favorite one. It\'s the whole thesis of the game in a single badge.',
      },
      {
        k: 'p',
        t: 'It was mathematically unreachable. The two conditions couldn\'t both be true given the numbers I\'d set. Not hard. Not "requires a perfect run." Impossible. And it sat there on the achievements screen for weeks, advertising something that didn\'t exist.',
      },
      {
        k: 'quote',
        t: 'I\'d shipped a promise the game couldn\'t keep, and I found out from a spreadsheet instead of a player.',
      },

      { k: 'h', t: 'SO I MADE SOMETHING THAT COULDN\'T CHEAT' },
      {
        k: 'p',
        t: 'The idea was obvious once I had it. Pull the game\'s real rules out into a version with no graphics — just the numbers and the decisions — then let a program play it a few thousand times while I make dinner.',
      },
      {
        k: 'p',
        t: 'Not one program. Several, each with a different personality, because "can this be won" is a much less useful question than "who wins it."',
      },
      { k: 'ul', items: [
        'One that always picks the most obvious option. The person who isn\'t really thinking about it.',
        'One that picks at random. The floor. If this one ever wins, the game might be too generous.',
        'One that plays optimally. The ceiling. If this one can\'t win, something is broken.',
        'One that rushes everything, and one that\'s exhaustively thorough, because those are two real people who will play this.',
      ] },
      {
        k: 'p',
        t: 'Then you run it and look at what actually happened. Win rates per personality. Which achievements ever fired. Which paths nobody ever took because a better option dominated them, which means dead content I\'d built for nothing.',
      },

      { k: 'h', t: 'THE RULE THAT SAVED ME FROM RUINING IT' },
      {
        k: 'p',
        t: 'The trap here is enormous and I walked straight into it the first time. The bot loses a lot. Your instinct is to make the game easier.',
      },
      {
        k: 'p',
        t: 'But the bot is *bad at your game*. No intuition, no pattern recognition, no sense that the guy by the printer is obviously stalling. Most of its losses aren\'t unfairness. They\'re a bad player playing badly, which your game is allowed to punish.',
      },
      {
        k: 'note',
        label: 'THE RULE',
        t: 'Before you change anything, classify every failure as either genuine unfairness or bot error. Only fix the first kind. Otherwise you sand every edge off your game to satisfy something that can\'t feel tension.',
      },
      {
        k: 'p',
        t: 'The unreachable achievement was real unfairness — no amount of skill fixes that. The near-misses on the driving deadline weren\'t. That was the game working.',
      },

      { k: 'h', t: 'WHAT I DIDN\'T EXPECT' },
      {
        k: 'p',
        t: 'Writing the rules out as plain numbers, with the 3D and the dialogue and the music stripped off, was the most clarifying thing I did on the whole project. When the whole system fits on one screen you can see which parts of it aren\'t doing anything.',
      },
      {
        k: 'p',
        t: 'Two of my dialogue branches were pointless. A third was strong enough that every other option was a mistake. None of that was visible while I was playing, and it was invisible precisely because I\'m good at my own game and kept unconsciously steering around the flaws.',
      },
      {
        k: 'p',
        t: 'I still don\'t know if they\'re fun. No bot can tell me that. But I know they\'re possible, which is a lower bar I\'d genuinely failed to clear.',
      },
    ],
  },
]

// ── Backlog ──────────────────────────────────────────────────────────────
// Posts that exist as a lesson learned but not yet as prose. Rendered on
// /blog as a Jira-style backlog table. Move an item up into POSTS when
// it's written and delete the row.

export type BacklogItem = {
  key: string
  title: string
  /** The one thing the post is actually about. Sentence case. */
  note: string
  /** Rough shape of the post, for the author's own benefit. */
  status: 'NEXT UP' | 'DRAFTING' | 'BACKLOG' | 'ICEBOX'
  tags: string[]
}

export const BACKLOG: BacklogItem[] = [
  {
    key: 'LOG-004',
    title: 'THE STROBE I DIDN\'T KNOW I\'D BUILT',
    note: 'A whole-screen shake effect turned out, at certain frame rates, to be a photosensitivity hazard. Nobody catches this for you. Accessibility is a design constraint, not a settings menu.',
    status: 'NEXT UP',
    tags: ['ACCESSIBILITY', 'HARM'],
  },
  {
    key: 'LOG-005',
    title: 'THREE DESIGN LANGUAGES, ON PURPOSE',
    note: 'The studio site, the fake workplace software, and the in-game HUD look nothing alike, and that\'s the joke. How to run deliberate inconsistency without it turning into actual inconsistency.',
    status: 'NEXT UP',
    tags: ['DESIGN', 'SATIRE'],
  },
  {
    key: 'LOG-006',
    title: 'ORANGE IS A BUDGET, NOT A PAINT',
    note: 'I highlighted a whole section in the accent color and it stopped highlighting anything. First design rule I learned by breaking it.',
    status: 'DRAFTING',
    tags: ['DESIGN', 'AUDIT'],
  },
  {
    key: 'LOG-007',
    title: 'THE CAR THAT VANISHED WHEN YOU LOOKED AWAY',
    note: 'The engine decided my player\'s car was off-screen and stopped drawing it. A beginner\'s tour of why 3D engines skip things, and what happens when they guess wrong.',
    status: 'BACKLOG',
    tags: ['3D', 'BUGS'],
  },
  {
    key: 'LOG-008',
    title: 'I MEASURED NOTHING AND FIXED IT TWICE',
    note: 'Two wrong fixes in a row on the same bug, because I patched what I assumed instead of what I\'d observed. The most expensive habit I had to unlearn.',
    status: 'BACKLOG',
    tags: ['DEBUGGING', 'HUMILITY'],
  },
  {
    key: 'LOG-009',
    title: 'MY CHARACTER WALKED WHILE RUNNING',
    note: 'Downloading a free animation and wiring it to the wrong state. Everything you need to know about borrowed character animation, from someone who didn\'t know the word "rig".',
    status: 'BACKLOG',
    tags: ['ANIMATION', '3D'],
  },
  {
    key: 'LOG-010',
    title: 'ONE MOTIF, EVERY GAME',
    note: 'A four-note theme that turns up in the office ambience, the runner\'s chiptune, and the car radio. How a tiny bit of repetition made separate projects feel like one continuous morning.',
    status: 'BACKLOG',
    tags: ['AUDIO', 'COHESION'],
  },
  {
    key: 'LOG-011',
    title: 'EVERY ENDING COSTS $0.00',
    note: 'Every game ends on a receipt for nothing. Picking one image and refusing to explain it — the first time I trusted the player instead of writing another line of dialogue.',
    status: 'BACKLOG',
    tags: ['NARRATIVE', 'RESTRAINT'],
  },
  {
    key: 'LOG-012',
    title: 'A SAVE FILE THAT SURVIVES A CLEARED COOKIE',
    note: 'Browser games forget you. Encoding the whole morning into a short code the player can copy, and what that taught me about respecting someone\'s twenty minutes.',
    status: 'BACKLOG',
    tags: ['BROWSER', 'PLAYER RESPECT'],
  },
  {
    key: 'LOG-013',
    title: 'IT RAN AT 12 FRAMES ON A NORMAL LAPTOP',
    note: 'It ran beautifully on the machine I built it on. That machine was not the audience. Draw calls, explained by someone who had to have them explained.',
    status: 'BACKLOG',
    tags: ['PERFORMANCE', '3D'],
  },
  {
    key: 'LOG-014',
    title: 'THIRTY SECONDS OF FUN',
    note: 'The design question an AI can\'t answer for you: what\'s the smallest loop that\'s enjoyable on its own, before any story or reward is bolted on? Mine wasn\'t, for a long time.',
    status: 'BACKLOG',
    tags: ['DESIGN', 'FUNDAMENTALS'],
  },
  {
    key: 'LOG-015',
    title: 'WHAT I\'D TELL SOMEONE ON DAY ONE',
    note: 'The whole thing compressed into the advice I actually wish I\'d had, minus the parts that only sound good in retrospect.',
    status: 'ICEBOX',
    tags: ['BEGINNINGS'],
  },
]

export function postBySlug(slug: string | undefined): Post | undefined {
  return POSTS.find((p) => p.slug === slug)
}
