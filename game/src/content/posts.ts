// src/content/posts.ts — dev-log posts for /blog.
//
// Data only. Rendering lives in routes/Blog.tsx (index) and
// routes/BlogPost.tsx (single post).
//
// ── WHO THESE ARE FOR ──────────────────────────────────────────────────
// Someone who has never made a game and may not work in tech at all. They
// should be able to read any post start to finish without looking anything
// up, and come away with something they could actually use on their own
// first project. That constraint drives the whole structure:
//
//   soWhat  — why this matters, in plain language, shown BEFORE the story.
//             A reader who stops after this paragraph should still have
//             gotten the point.
//   plain   — an inline "IN PLAIN TERMS" block. Any time a post uses a
//             technical word, the next block explains it with an analogy
//             from outside tech. No exceptions, even for words that feel
//             obvious — "obvious" is exactly the blind spot here.
//   apply   — 3–4 concrete things to do on your own first game. Not
//             "be careful"; actual steps.
//   takeaway— the one sentence to remember.
//
// Inline emphasis: wrap a span in *asterisks* for italics. That is the
// whole markup language. Resist adding a second rule.
//
// VOICE — contractions on, uneven sentence lengths, at most one aphorism
// per post, American spellings. Explaining something simply is not the
// same as writing down to someone; never say "don't worry about it."
//
// ANONYMITY CONTRACT (also enforced in routes/About.tsx):
//   No real name. No employer, past or present. No job titles, industry,
//   city, or team size. No dates precise enough to correlate with a public
//   layoff. Years-of-experience and company-count only at the coarse
//   granularity used here.

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
  /** Why this matters. Rendered up top, before the story. Plain language. */
  soWhat: string
  /** The one sentence to remember. Rendered in a box after the body. */
  takeaway: string
  /** Concrete steps for someone's own first project. Rendered at the end. */
  apply: string[]
  body: Block[]
}

export const POSTS: Post[] = [
  // ── LOG-001 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-001',
    slug: 'i-have-never-written-a-line-of-game-code',
    title: 'I HAVE NEVER WRITTEN A LINE OF GAME CODE',
    dek: 'Starting with no qualifications, one idea, and an AI that will build anything you ask for — including the wrong thing, confidently.',
    date: '2026-07-31',
    readMin: 6,
    tags: ['BEGINNINGS', 'AI', 'HONESTY'],
    soWhat:
      'If you have an idea for a game and no technical background, the thing standing between you and a playable version is no longer the code. It is knowing what to ask for and being honest about whether the result is any good. That second part cannot be delegated, to an AI or anyone else, and it is the actual job.',
    takeaway:
      'The bottleneck was never the code. It was knowing what to ask for, and nobody can generate that part for you.',
    apply: [
      'Describe what you want in plain English, the way you\'d explain it to a friend. That description is your design document. You do not need any other kind.',
      'Play the thing the moment it runs — not after it\'s finished. The gap between "this works" and "this is fun" is enormous, and only playing it reveals the gap.',
      'When something feels dead and you can\'t say why, that feeling is real information. Change one big thing (the camera, the speed, the distance) rather than polishing details.',
      'Write your locked decisions down somewhere permanent. Otherwise you\'ll relitigate them at 11pm and undo work you already paid for.',
    ],
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
        t: 'Yes, an AI wrote most of the code. I\'m not going to be cute about it or call it a "collaboration" in the way that flatters me. I described what I wanted, it produced something, I played it, and maybe a third of the time it was wrong in a way I couldn\'t have diagnosed on my own.',
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
        t: 'My first working build had a camera hanging above the office looking straight down, like a security camera. Technically a game. You could walk around, you could talk to people. It was completely dead.',
      },
      {
        k: 'p',
        t: 'Took me two days to work out why. Same dialogue, same office, same everything. Then I moved the camera to third person — floating just behind the character\'s shoulder, the way most modern games do it — and the identical content turned into a *place* instead of a diagram.',
      },
      {
        k: 'plain',
        term: 'THIRD-PERSON CAMERA',
        t: 'Where the virtual camera sits relative to your character. Behind-the-shoulder makes you feel like you are *in* a room with people. Directly overhead makes the same room read as a map. Nothing else changed — same walls, same conversations. Just the viewing angle, and it decided whether the game had any atmosphere at all.',
      },
      {
        k: 'p',
        t: 'Nobody taught me that in a lecture. I felt it. First time I thought I might actually be able to do this — not because I understood cameras, but because I could tell.',
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
        k: 'p',
        t: 'So these are notes from the middle. What broke, why it broke, what I\'d tell someone a week behind me. If you make games for real and something in here makes you wince, that\'s the price of watching someone learn in public.',
      },
    ],
  },

  // ── LOG-002 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-002',
    slug: 'the-green-checkmark-that-was-lying',
    title: 'THE GREEN CHECKMARK THAT WAS LYING',
    dek: 'For weeks, the tool that was supposed to check my work said everything was fine. It had been checking nothing at all.',
    date: '2026-07-31',
    readMin: 6,
    tags: ['TOOLING', 'AI', 'STATUS GREEN'],
    soWhat:
      'You are going to rely on automatic checks — something that tells you your work is okay before you show it to anyone. This post is about the moment I discovered mine had been inspecting zero of my files and reporting success anyway. The lesson generalizes far past games: any check you have never seen fail is not a check, it is decoration. That applies to a backup you have never restored, a spreadsheet formula nobody has stress-tested, and a smoke alarm you have never pressed the button on.',
    takeaway:
      'A passing check is only worth what it actually checked. Ask any dashboard what its denominator is.',
    apply: [
      'The first time you set up any automatic check, break something on purpose and confirm the check goes red. If it still passes, it isn\'t connected to your work. This takes two minutes and it is the highest-value two minutes in the whole project.',
      'Treat suspicious speed as evidence. If a check on a big project finishes instantly, it probably didn\'t look at anything.',
      'Learn the difference between "no problems found" and "nothing was examined." Most tools print the same cheerful message for both.',
      'Write the correct command in a file in your project, not in your head. I forgot mine twice and had to rediscover it both times.',
    ],
    body: [
      {
        k: 'lead',
        t: 'For a few weeks, the command I ran to confirm my work was correct came back clean every single time. Instantly. No errors, no warnings, nothing.',
      },
      { k: 'p', t: 'It was checking nothing. Zero files. A green light wired to an empty room.' },

      { k: 'h', t: 'FIRST — WHAT IS THIS THING SUPPOSED TO DO' },
      {
        k: 'p',
        t: 'The tool is called a type checker, and if that means nothing to you, good, because the name is terrible and the idea is simple.',
      },
      {
        k: 'plain',
        term: 'TYPE CHECKER',
        t: 'A proofreader for your project\'s plumbing. It doesn\'t check spelling or whether your game is fun. It checks that the pieces fit together — that when one part of the game asks another part for "the player\'s score," the other part hands back an actual number, and not the word "banana" or nothing at all. It reads every file and complains before you ever run the game. Think of the person at a theater who checks that every prop the script mentions actually exists backstage.',
      },
      {
        k: 'p',
        t: 'That is genuinely useful when you don\'t know what you\'re doing. It catches the boring category of mistake — the one where you renamed something in one place and forgot the other eleven — which is most of the mistakes a beginner makes.',
      },

      { k: 'h', t: 'HOW IT ENDED UP CHECKING NOTHING' },
      {
        k: 'p',
        t: 'My project has a small settings file that tells the checker which code to look at. Mine didn\'t list any code. It pointed at two *other* settings files, which each listed the real code.',
      },
      {
        k: 'p',
        t: 'That\'s a completely standard way to organize a project, and it isn\'t a mistake. The mistake was mine: the command I\'d been running only read the top file, found an empty list, concluded there was nothing to check, and reported success. Cheerfully. Every time.',
      },
      {
        k: 'code',
        cap: 'Real numbers from this project. The top line is what I ran for weeks.',
        t: 'npx tsc --noEmit   # → exits clean.   0 files checked.\nnpx tsc -b         # → follows refs.  108 files checked.',
      },
      {
        k: 'p',
        t: 'A hundred and eight files it had never once opened. When I finally ran the right command it found real errors immediately, some of them sitting in code I\'d already published, in games people had already played. The site worked anyway — web browsers are forgiving in ways this checker is not — but I had been trusting a signal that was structurally incapable of failing.',
      },

      { k: 'h', t: 'WHY THIS IS THE INTERESTING KIND OF BUG' },
      {
        k: 'quote',
        t: 'A status light that can\'t go red isn\'t a status light. It\'s decor.',
      },
      {
        k: 'p',
        t: 'Nobody lied to me. The tool did exactly what it was told to do. The number of files it examined simply was not a number anyone was looking at — not in the output, not in my head. There was no alarm to miss, because the alarm was never wired up.',
      },
      {
        k: 'p',
        t: 'I make a game about a company where a project is marked GREEN because someone said so in a meeting. And I\'d accidentally built myself the same instrument. That\'s not a coincidence so much as a demonstration that this is how most reporting works, everywhere. Not fraud. Just a number whose denominator nobody thought to ask about.',
      },

      { k: 'h', t: 'THIS BITES HARDER IF YOU\'RE BUILDING WITH AI' },
      {
        k: 'p',
        t: 'Here\'s the specific trap nobody warned me about. When you work with an AI assistant, it runs your checks, sees the success message, and tells you — accurately, in good faith — that everything passes.',
      },
      {
        k: 'p',
        t: 'It isn\'t making things up. It\'s trusting your setup, exactly as you did. Which means a broken check doesn\'t merely fail to catch your bugs. It launders them into a confident all-clear from something that sounds like it knows.',
      },
      {
        k: 'note',
        label: 'THE TWO-MINUTE HABIT',
        t: 'Break something on purpose the first time you set up any check. Type nonsense into a file and confirm the check goes red. Then undo it. If the check stayed green, you\'ve just learned it was never watching — and you learned it now, instead of in three weeks.',
      },

      { k: 'h', t: 'THE FIX WAS ONE CHARACTER' },
      {
        k: 'p',
        t: 'Two, if you count the space. That\'s the part I keep turning over. Weeks of false confidence undone by a setting I didn\'t know existed, and the only reason I found it is that a bug turned up in the browser that the checker had sworn was impossible.',
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
    dek: 'I couldn\'t tell whether my game was too hard, because I\'d played it into the ground and knew every answer. So I made something that had never seen it.',
    date: '2026-07-31',
    readMin: 8,
    tags: ['BALANCE', 'PLAYTESTING', 'FAIRNESS'],
    soWhat:
      'The moment you finish building something, you become the worst possible judge of how hard it is, because you know all the answers and you cannot un-know them. This post is about the cheapest way I found around that — and about the reward in my game that was mathematically impossible to earn, which sat there advertising itself for weeks before anything caught it.',
    takeaway:
      'You can\'t playtest your own difficulty. You\'re the one player in the world who already has the answer key.',
    apply: [
      'Write your game\'s rules out as plain numbers in a separate file — no graphics, no sound, just the choices and what each one costs. Doing this alone will show you which parts of your design do nothing.',
      'Give your test players personalities, not just one "average" one. A reckless one, a cautious one, a random one, an optimal one. "Can this be won" is a far less useful question than "who wins it."',
      'Before changing anything, sort every loss into genuinely unfair vs. the player just played badly. Only fix the first kind, or you\'ll sand every edge off your game to satisfy something that can\'t feel tension.',
      'If you can\'t automate any of this, the low-tech version still works: hand it to someone who has never seen it, say nothing at all, and write down where they get stuck. Saying nothing is the hard part.',
    ],
    body: [
      {
        k: 'lead',
        t: 'Something I didn\'t see coming: the moment you finish building a game, you become permanently unqualified to judge how hard it is.',
      },
      {
        k: 'p',
        t: 'I know what every choice costs before I click it. I know which lane the obstacle is in. I know the route across town without looking at the map. Every run I did was a run with the answer key, and I was using those runs to decide whether the thing was fair for everyone else.',
      },

      { k: 'h', t: 'THE REWARD NOBODY COULD EARN' },
      {
        k: 'p',
        t: 'The first game has achievements — little badges for different ways the morning can go. One rewards you for finishing the day aligned on the project and personally despised by everyone in the office. It\'s my favorite one. It\'s the whole thesis of the game in a single badge.',
      },
      {
        k: 'p',
        t: 'It was mathematically unreachable. The two conditions it required could not both be true at once, given the numbers I\'d set. Not hard. Not "requires a perfect run." Impossible. And it sat there on the achievements screen for weeks, advertising something that did not exist.',
      },
      {
        k: 'quote',
        t: 'I\'d shipped a promise the game couldn\'t keep, and I found out from a spreadsheet instead of a player.',
      },

      { k: 'h', t: 'SO I MADE SOMETHING THAT COULDN\'T CHEAT' },
      {
        k: 'p',
        t: 'The idea was obvious once I had it. Take the game\'s real rules and copy them into a stripped-down version with no graphics at all — just the numbers and the decisions — then let a small program play it a few thousand times while I make dinner.',
      },
      {
        k: 'plain',
        term: 'A TEST HARNESS',
        t: 'A program that plays your game for you, very fast, with no pictures. Because there\'s nothing to draw, it can play thousands of games in the time it takes you to play one. It can\'t tell you whether your game is fun — nothing can do that except a human — but it can tell you whether winning is possible, how often, and for whom.',
      },
      {
        k: 'p',
        t: 'Not one program. Several, each with a different personality, because "can this be won" is a much less useful question than "who wins it."',
      },
      { k: 'ul', items: [
        'One that always picks the most obvious option. That\'s the person who isn\'t really thinking about it, which is most people, most of the time.',
        'One that picks at random. The floor. If this one ever wins, your game may be too generous.',
        'One that plays perfectly. The ceiling. If this one can\'t win, something is broken and no amount of skill will save it.',
        'One that rushes and one that\'s exhaustively thorough — because those are two real people who will play your game.',
      ] },
      {
        k: 'p',
        t: 'Then you look at what actually happened. Win rates per personality. Which achievements ever fired at all. Which paths nobody ever took, because a better option always dominated them — meaning content I\'d built for nothing.',
      },

      { k: 'h', t: 'THE RULE THAT SAVED ME FROM RUINING IT' },
      {
        k: 'p',
        t: 'The trap here is enormous and I walked straight into it the first time. The robot loses a lot. Your instinct is to make the game easier.',
      },
      {
        k: 'p',
        t: 'But the robot is *bad at your game*. No intuition, no pattern recognition, no feel for when a cheap answer now turns into an expensive one three conversations later. Most of its losses aren\'t unfairness. They\'re a bad player playing badly, which your game is completely allowed to punish.',
      },
      {
        k: 'note',
        label: 'THE RULE',
        t: 'Before you change anything, classify every failure as either genuine unfairness or bot error. Only fix the first kind. Otherwise you sand every edge off your game to satisfy something that can\'t feel tension.',
      },
      {
        k: 'p',
        t: 'The unreachable achievement was real unfairness — no amount of skill fixes an impossibility. The near-misses on the driving deadline were not. That was the game working exactly as intended.',
      },

      { k: 'h', t: 'THE PART I DIDN\'T EXPECT' },
      {
        k: 'p',
        t: 'Writing the rules out as plain numbers, with the 3D and the dialogue and the music stripped away, was the most clarifying thing I did on the entire project. When the whole system fits on one screen, you can see which parts of it aren\'t doing anything.',
      },
      {
        k: 'p',
        t: 'Two of my conversation branches were pointless. A third was so strong that every other option was a mistake. None of that was visible while I was playing — and it was invisible *precisely because* I\'m good at my own game and kept unconsciously steering around the flaws.',
      },
      {
        k: 'p',
        t: 'I still don\'t know if they\'re fun. No robot can tell me that. But I know they\'re possible, which is a lower bar I had genuinely failed to clear.',
      },
    ],
  },

  // ── LOG-004 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-004',
    slug: 'the-strobe-i-didnt-know-id-built',
    title: 'THE STROBE I DIDN’T KNOW I’D BUILT',
    dek: 'A screen-shake effect I added for impact turned out, at certain speeds, to be a genuine health hazard. Nobody catches this for you.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['ACCESSIBILITY', 'HARM'],
    soWhat:
      'It is possible to hurt a stranger by accident with a visual effect, and it is much easier to do than you would think. Flashing and hard screen movement can trigger seizures in people with photosensitive epilepsy, and nothing in your tools will warn you. This is the one category of mistake in game-making where the cost lands on someone else\'s body rather than your pride.',
    takeaway:
      'Accessibility isn\'t a settings menu you add at the end. It\'s a constraint on what you\'re allowed to build in the first place.',
    apply: [
      'Keep full-screen flashing under three flashes per second, and never flash the whole screen in strongly contrasting colors. This is the widely used threshold and it costs you nothing to respect.',
      'Tie any screen shake to real elapsed time, not to how many frames your computer drew. On a fast machine a frame-based shake runs several times quicker than you designed — that is exactly how a nice effect becomes a strobe.',
      'Honor the "reduce motion" setting that phones and computers already have. Your game can read it in one line, and the people who need it have usually already turned it on.',
      'Watch your own effect at full screen, in a dark room, for a full minute. Effects that feel punchy in a two-second test can feel violent sustained.',
    ],
    body: [
      {
        k: 'lead',
        t: 'I added a screen shake to a fight scene because hits felt weak without one. It was a good instinct. The execution was, for a while, dangerous.',
      },
      {
        k: 'p',
        t: 'The shake was tied to frames rather than to time. On the machine I built it on, that looked like a solid thump. On a faster machine it ran several times quicker — fast enough to read as a strobe rather than a shake.',
      },
      {
        k: 'plain',
        term: 'FRAMES VS. TIME',
        t: 'A game redraws the screen many times a second. Each redraw is a frame. If you write an effect as "move the screen a bit every frame," then a computer drawing twice as many frames runs your effect twice as fast — the same code produces a different effect on different hardware. If instead you write "move the screen this far over 0.3 seconds," it looks identical everywhere. Nearly every beginner writes it the first way, because the first way is easier to think about.',
      },

      { k: 'h', t: 'WHY THIS PARTICULAR BUG IS DIFFERENT' },
      {
        k: 'p',
        t: 'Most bugs cost you time or embarrassment. This one has a different bill. Rapid full-screen flashing can trigger seizures in people with photosensitive epilepsy. They do not get a warning, and they cannot tell in advance that your game is going to do it.',
      },
      {
        k: 'p',
        t: 'This is not a rare edge case in the way beginners assume. It is roughly one in a few thousand people, which means if any number of strangers ever play your thing, you should assume someone in that group is among them.',
      },
      {
        k: 'quote',
        t: 'Every other bug in this dev log cost me time. This one had the potential to cost somebody else a hospital visit.',
      },

      { k: 'h', t: 'WHAT I CHANGED' },
      { k: 'ul', items: [
        'Every whole-screen movement is now driven by elapsed time, so it looks the same on a slow laptop and a fast desktop.',
        'The shake has a hard ceiling on how far and how fast it can move, regardless of how big the hit was.',
        'The game reads the operating system\'s "reduce motion" preference and turns the effect down to almost nothing when it\'s on.',
        'No full-screen color flashes at all. Impact is now communicated with a freeze — a fraction of a second where everything stops — which reads as more powerful anyway.',
      ] },
      {
        k: 'note',
        label: 'THE FREEZE TRICK',
        t: 'Stopping the whole screen dead for a tenth of a second when a hit lands sells impact better than shaking does, and it carries none of the risk. Fighting games have used this for decades. I found it while looking for something safe and ended up preferring it.',
      },

      { k: 'h', t: 'THE UNCOMFORTABLE PART' },
      {
        k: 'p',
        t: 'No tool told me. There was no warning, no error, no check that went red. I make a point elsewhere in this log about verifying that your automatic checks actually work — this is the category where there is no automatic check to verify.',
      },
      {
        k: 'p',
        t: 'The only reason I caught it was that I happened to view the effect on a faster machine than the one I\'d designed it on, and something about it felt wrong before I could explain why. That\'s not a process. That\'s luck, and luck isn\'t a safety system.',
      },
      {
        k: 'p',
        t: 'So the rule I now work to is simpler than any check: if an effect touches the whole screen, it gets designed under the constraint from the beginning, not audited for it afterward.',
      },
    ],
  },

  // ── LOG-005 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-005',
    slug: 'three-design-languages-on-purpose',
    title: 'THREE DESIGN LANGUAGES, ON PURPOSE',
    dek: 'My website, my fake corporate software, and my game HUD look nothing like each other. That\'s the joke — but only if it\'s deliberate.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['DESIGN', 'SATIRE'],
    soWhat:
      'Everyone tells you to be consistent. That advice is slightly wrong. What you actually need is *coherence* — a reason for every difference. Deliberate difference reads as confidence. Accidental difference reads as carelessness, and a reader can tell the two apart instantly even if they can\'t say how.',
    takeaway:
      'Consistency isn\'t the goal. Coherence is. Every difference should be a decision you could explain out loud.',
    apply: [
      'Write down your visual rules as actual sentences — colors, fonts, spacing, what the accent color is for. A page of plain text beats a mood board, because you can check work against sentences.',
      'If your project has more than one "world" (a website and a game, say), give each one its own written rules, and say in writing why they differ.',
      'Every time you break a rule, either fix it or add the exception to the document. Never leave it unexplained — undocumented exceptions are how a design language rots.',
      'Re-read the whole document before starting anything new. Ten minutes here saves you the rebuild.',
    ],
    body: [
      {
        k: 'lead',
        t: 'There are three completely different visual styles in this project, and for a while I assumed that meant I\'d done something wrong.',
      },
      { k: 'ul', items: [
        'The studio website is loud, black-and-orange, enormous type, hard edges, no rounded corners anywhere.',
        'The fake workplace software inside the game — the ticket board, the chat app, the calendar — is bland, blue, and rounded, because that is what real workplace software looks like.',
        'The in-game display is a third thing again: small, monospaced, sitting quietly on top of the 3D world.',
      ] },
      {
        k: 'plain',
        term: 'DESIGN LANGUAGE',
        t: 'The set of rules that make a bunch of separate screens feel like they came from the same place: which colors, which fonts, how much space, how corners are shaped. You already read design languages fluently — it is why a fake login page feels off even when you can\'t point at the reason.',
      },

      { k: 'h', t: 'WHY THREE IS RIGHT HERE' },
      {
        k: 'p',
        t: 'The game is a satire of office life. If the fake ticket board looked stylish, the joke would die on contact — the whole point is that it looks exactly like the software you resent on a Tuesday. It has to be boring. Being boring is the gag.',
      },
      {
        k: 'p',
        t: 'And the studio site has the opposite job: it has to grab someone who has never heard of any of this. So it shouts.',
      },
      {
        k: 'quote',
        t: 'The website is the poster. The fake software is the punchline. They should not look alike.',
      },

      { k: 'h', t: 'THE PART THAT ACTUALLY MATTERS' },
      {
        k: 'p',
        t: 'Deliberate inconsistency only works if it\'s deliberate. Which sounds circular until you\'ve lived it: three styles chosen on purpose reads as an art direction. Three styles that happened because you got bored reads as a mess. To a visitor, those two things look identical in a screenshot — the difference only shows up across the whole thing.',
      },
      {
        k: 'p',
        t: 'So I wrote the rules down. An actual document, in plain sentences, one section per style. Not a mood board — sentences, because you can check your work against a sentence.',
      },
      {
        k: 'note',
        label: 'WHAT THAT DOCUMENT LOOKS LIKE',
        t: 'Mine is about a page. "Backgrounds are #f1f0ec, never white." "Orange is a budget — one focal element per section, never a whole block." "No rounded corners, ever." Each rule has a note saying which mistake caused it, so future me can\'t argue the rule was arbitrary.',
      },
      {
        k: 'p',
        t: 'Every rule in that file exists because I broke it first. That turns out to be the only way I learn a design principle — reading it in a book does nothing; watching my own page get worse does everything.',
      },
    ],
  },

  // ── LOG-006 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-006',
    slug: 'orange-is-a-budget-not-a-paint',
    title: 'ORANGE IS A BUDGET, NOT A PAINT',
    dek: 'I highlighted an entire section in my accent color and it stopped highlighting anything. The first design rule I learned by breaking it.',
    date: '2026-08-01',
    readMin: 4,
    tags: ['DESIGN', 'AUDIT'],
    soWhat:
      'This is the most transferable thing in this whole log, and it has nothing to do with games. If you emphasize everything, you have emphasized nothing. It applies identically to a slide deck, a dashboard, a résumé, and a page on a website — anywhere you are trying to make one thing stand out.',
    takeaway:
      'An accent color is a budget you spend, not a paint you apply. Spend it once per screen and it works. Spend it five times and it does nothing.',
    apply: [
      'Pick exactly one accent color and give it one job: marking the single most important thing on screen.',
      'Count your uses. Per screenful, one focal element gets the accent. If you have three, two of them are lying about their importance.',
      'Squint at your screen until it blurs. Whatever still stands out is what your reader will look at first. If that isn\'t what you wanted, you have your answer.',
      'When you\'re tempted to emphasize a second thing, ask which of the two you\'d cut. That\'s usually the real decision hiding underneath.',
    ],
    body: [
      {
        k: 'lead',
        t: 'I had a section on my website I thought was important, so I gave it the full treatment: orange background, big type, the works. Then I did it to the next section too, because that one was also important.',
      },
      { k: 'p', t: 'By the time I was done, the page had three orange blocks and no emphasis at all.' },
      {
        k: 'quote',
        t: 'A highlighter works because most of the page isn\'t highlighted.',
      },

      { k: 'h', t: 'WHAT WAS ACTUALLY GOING WRONG' },
      {
        k: 'p',
        t: 'Emphasis isn\'t a property of a thing. It\'s a relationship between that thing and everything around it. Orange doesn\'t mean "important" — orange means "more important than the things next to it, which are not orange." Remove the contrast and you remove the meaning, no matter how bright the color is.',
      },
      {
        k: 'p',
        t: 'Which is why the fix wasn\'t a better shade. The fix was taking orange *away* from two of the three blocks. The remaining one got louder without changing at all.',
      },
      {
        k: 'plain',
        term: 'VISUAL HIERARCHY',
        t: 'The order a person\'s eye moves through a screen. You control it with size, weight, color and space. Every screen has one whether you designed it or not — if you didn\'t decide what gets looked at first, something else did, and it is usually the largest thing rather than the most important one.',
      },

      { k: 'h', t: 'THE RULE I WROTE DOWN' },
      {
        k: 'note',
        label: 'ORANGE IS A BUDGET',
        t: 'One focal element per section. A CTA, a status pill, a single highlighted phrase — not a whole block. If two things in the same view are competing for the accent, one of them isn\'t as important as I thought, and deciding which is the actual design work.',
      },
      {
        k: 'p',
        t: 'The thing I didn\'t expect is how much this improved my writing, not just my layout. Deciding what gets the one orange thing forces you to decide what a section is *for*. Several sections turned out to be for nothing in particular, and I deleted them.',
      },
    ],
  },

  // ── LOG-007 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-007',
    slug: 'the-car-that-vanished-when-you-looked-away',
    title: 'THE CAR THAT VANISHED WHEN YOU LOOKED AWAY',
    dek: 'My driving level had a car that disappeared at certain camera angles. A beginner\'s tour of the shortcuts 3D engines take, and what happens when they guess wrong.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['3D', 'BUGS'],
    soWhat:
      'Things that make no sense usually mean the software is taking a shortcut you don\'t know about. Learning the three or four shortcuts your tools take will explain most of the "impossible" bugs you hit, and turns a two-day panic into a ten-minute fix.',
    takeaway:
      'When something impossible happens, don\'t look for a mistake in your logic. Look for a shortcut the software is taking on your behalf.',
    apply: [
      'When an object disappears or flickers in 3D, suspect its invisible boundary box before you suspect your own code. That one guess covers most vanishing-object bugs.',
      'Make a habit of asking "what is this tool doing that I didn\'t ask for?" Rendering, saving, and loading all have invisible optimizations.',
      'Reproduce the bug reliably before you change anything. "It vanishes when the camera is behind and left" is a fix. "It vanishes sometimes" is a week of guessing.',
      'Search for the behavior, not your theory of the cause. Searching "car disappears at certain angles" found it. Searching for what I assumed was wrong found nothing.',
    ],
    body: [
      {
        k: 'lead',
        t: 'The player\'s car vanished. Not always — only when the camera swung around to certain angles. The car was still there, still driving, still solid. It just wasn\'t being drawn.',
      },
      { k: 'p', t: 'I spent an embarrassing amount of time looking for a mistake in my own code. There wasn\'t one.' },

      { k: 'h', t: 'THE SHORTCUT NOBODY TELLS BEGINNERS ABOUT' },
      {
        k: 'p',
        t: 'Drawing 3D is expensive, so engines refuse to draw things you can\'t see. Perfectly sensible. The question is how the engine decides what you can see — and the answer is that it doesn\'t look at your object at all. It looks at a simple invisible box drawn around it.',
      },
      {
        k: 'plain',
        term: 'CULLING (AND THE INVISIBLE BOX)',
        t: 'Every object in a 3D scene gets a plain rectangular box wrapped around it, calculated once. When deciding what to draw, the engine checks the boxes, not the actual shapes, because checking a box is thousands of times cheaper. If the box is off-screen, the object is skipped. Skipping things you can\'t see is called culling, and it is a large part of why 3D runs at all.',
      },
      {
        k: 'p',
        t: 'Now the bug. My car was assembled from several pieces, and the box got calculated from its starting pose. As the car moved and turned, the box stopped matching where the car actually was. At certain camera angles the box left the screen while the car was still visibly on it — so the engine confidently skipped a car that was right in front of you.',
      },
      {
        k: 'quote',
        t: 'The engine wasn\'t wrong about the box. The box was wrong about the car.',
      },

      { k: 'h', t: 'WHY THIS IS WORTH KNOWING EVEN IF YOU NEVER HIT IT' },
      {
        k: 'p',
        t: 'The specific fix is boring — you either tell the engine to recalculate the box as the object moves, or you tell it to stop checking this particular object and always draw it. One line either way.',
      },
      {
        k: 'p',
        t: 'The useful part is the shape of the problem, because it recurs everywhere. Software is full of approximations made for speed: it checks a cheap stand-in instead of the real thing. Most "impossible" bugs are the stand-in drifting away from the reality it stands in for.',
      },
      {
        k: 'note',
        label: 'THE QUESTION THAT UNLOCKS THESE',
        t: 'Stop asking "what did I do wrong?" and start asking "what is this tool doing that I never asked it to?" The second question found this bug in about ten minutes after two days of the first one.',
      },
    ],
  },

  // ── LOG-008 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-008',
    slug: 'i-measured-nothing-and-fixed-it-twice',
    title: 'I MEASURED NOTHING AND FIXED IT TWICE',
    dek: 'Two confident wrong fixes to the same bug, because I patched what I assumed instead of what I\'d actually observed.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['DEBUGGING', 'HUMILITY'],
    soWhat:
      'The most expensive habit in any kind of building is fixing your theory instead of the problem. This is a short post about the discipline that replaces it, which costs about five minutes and saves entire afternoons — and which applies to a spreadsheet that\'s wrong or a recipe that keeps failing just as much as to code.',
    takeaway:
      'Two wrong fixes in a row isn\'t bad luck. It means your mental model is wrong, and no third guess will fix that.',
    apply: [
      'Before changing anything, write two sentences: what you expected to happen, and what actually happened. Most of the time the gap between them names the bug.',
      'Change one thing at a time. If you change three and it works, you\'ve learned nothing and you now have two changes you don\'t understand.',
      'When a fix doesn\'t work, undo it before trying the next one. Otherwise you accumulate a pile of half-fixes that create new problems.',
      'After two failed attempts, stop fixing and start measuring. Print out the actual numbers. Your model of the problem is what\'s broken.',
    ],
    body: [
      {
        k: 'lead',
        t: 'A thing in my game was behaving wrongly. I knew why. I was certain. I fixed it, and it kept happening. So I fixed it a second, different way, and it kept happening.',
      },
      { k: 'p', t: 'Both fixes were competent. Both were changes to code that was working correctly.' },

      { k: 'h', t: 'WHAT I WAS ACTUALLY DOING' },
      {
        k: 'p',
        t: 'I never checked what was happening. I looked at the symptom, formed a story about the cause in about four seconds, and then spent an hour implementing the story. When the story turned out to be wrong, I wrote a second story rather than questioning the method that produced the first one.',
      },
      {
        k: 'quote',
        t: 'I wasn\'t debugging. I was submitting guesses and waiting to be told I was right.',
      },
      {
        k: 'p',
        t: 'The fix, when I finally measured, took four minutes. The measurement was embarrassingly simple: print the number I cared about, watch it while the bug happened. It was not the number I had been confidently discussing with myself for two hours.',
      },

      { k: 'h', t: 'THE HABIT THAT REPLACED IT' },
      {
        k: 'plain',
        term: 'MEASURING, IN THIS CONTEXT',
        t: 'Making the invisible visible. Print a value to the screen, or write it into a log, so you can watch what the program actually does instead of imagining it. This is unglamorous and it is roughly 80% of real debugging. It requires no special tools and no expertise.',
      },
      { k: 'ul', items: [
        'Write down what you expect. Specifically, with numbers.',
        'Make the real value visible and compare. The gap is the bug, and it is very often not where you assumed.',
        'Change one thing. Undo it if it doesn\'t help.',
        'Two failures in a row means stop. Your model is wrong; a third guess from the same wrong model won\'t land.',
      ] },
      {
        k: 'note',
        label: 'THE AI VERSION OF THIS TRAP',
        t: 'If you describe your *theory* to an AI assistant, it will helpfully implement your theory. It has no way to know your theory is wrong. Describe the symptom instead — what you see, what you expected — and let the diagnosis be part of what you\'re asking for.',
      },
      {
        k: 'p',
        t: 'That last one took me longer to learn than it should have. A confident wrong instruction gets you a confident wrong fix, faster than ever before. Speed is not much use pointed in the wrong direction.',
      },
    ],
  },

  // ── LOG-009 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-009',
    slug: 'my-character-walked-while-running',
    title: 'MY CHARACTER WALKED WHILE RUNNING',
    dek: 'I downloaded a free animation and wired it to the wrong thing. Everything I know about borrowed character animation, from someone who didn\'t know the word "rig".',
    date: '2026-08-01',
    readMin: 6,
    tags: ['ANIMATION', '3D'],
    soWhat:
      'You can get professional-quality character movement for free without being an animator. What nobody tells you is that downloading it is about 20% of the work — the rest is wiring it up so the right movement plays at the right moment and at the right speed, and that part is where it looks broken.',
    takeaway:
      'The asset isn\'t the work. Getting the right one to play at the right moment at the right speed is the work.',
    apply: [
      'Write down your character\'s states before you download anything: idle, walking, running, jumping, landing. That list is your shopping list and your wiring diagram at once.',
      'Match the animation to the actual movement speed. A running clip on a slowly-moving character produces the skating look that makes amateur 3D instantly recognizable.',
      'Trim your clips. Downloaded animations include wind-up and settle time you don\'t want; cutting to just the useful part is often the difference between floaty and punchy.',
      'Always blend between animations rather than switching instantly. A fifth of a second of crossfade removes most of the jankiness for almost no effort.',
    ],
    body: [
      {
        k: 'lead',
        t: 'My character ran across the screen at full speed doing a relaxed walk cycle. His legs were strolling. His body was moving at a sprint. He looked like he was on a conveyor belt, and he looked like it for about a week.',
      },

      { k: 'h', t: 'HOW BORROWED ANIMATION WORKS' },
      {
        k: 'plain',
        term: 'RIG AND ANIMATION CLIP',
        t: 'A 3D character has an invisible skeleton inside it, called a rig. An animation clip is a recording of that skeleton moving — a walk, a jump, a wave — stored separately from the character. Because the skeleton is a standard shape, a clip recorded for one character can play on a completely different one. That\'s why you can download a walk and put it on your own character for free.',
      },
      {
        k: 'p',
        t: 'This is genuinely one of the best deals available to a beginner. Professional motion-captured animation, free, in a format that just works. It makes an amateur project look dramatically better in an afternoon.',
      },
      {
        k: 'p',
        t: 'The catch is that downloading gives you a pile of separate clips and no opinion about when each should play. That decision is entirely yours, and it\'s where things look wrong.',
      },

      { k: 'h', t: 'THE THREE MISTAKES I MADE, IN ORDER' },
      { k: 'ul', items: [
        'Wired the walk clip to the "moving" state and never made a separate running state. Hence the conveyor belt.',
        'Played clips at their recorded speed regardless of how fast the character was actually traveling — so feet slid across the floor instead of gripping it.',
        'Cut instantly between clips, so the character teleported between poses on every change of direction.',
      ] },
      {
        k: 'quote',
        t: 'Every one of these is invisible in a still screenshot and glaring in half a second of motion.',
      },
      {
        k: 'note',
        label: 'THE FIX THAT MATTERED MOST',
        t: 'Tie the animation\'s playback speed to the character\'s actual speed. When the feet move at the rate the ground is passing, the whole thing snaps into looking real — and it\'s a single number, not an art skill.',
      },

      { k: 'h', t: 'THE THING I WISH I\'D DONE FIRST' },
      {
        k: 'p',
        t: 'Write the list of states before shopping. Idle, walk, run, jump, land. Five words on a piece of paper. That list tells you exactly what to download and exactly what to wire, and it stops you doing what I did — grabbing a great-looking clip and then working backwards trying to find a moment for it to play.',
      },
      {
        k: 'p',
        t: 'I did that backwards for a month. It is the animation equivalent of buying furniture before measuring the room.',
      },
    ],
  },

  // ── LOG-010 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-010',
    slug: 'one-motif-every-game',
    title: 'FOUR NOTES, FOUR GAMES',
    dek: 'A tiny repeated melody did more to make four separate games feel like one thing than any amount of matching art ever could.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['AUDIO', 'COHESION'],
    soWhat:
      'Making separate pieces feel like one project is usually assumed to be expensive — matching art, shared assets, a consistent look. It isn\'t. One small element repeated in every piece does most of the work, and sound is the cheapest version of that trick available to someone with no art skills.',
    takeaway:
      'Cohesion is cheaper than it looks. One small thing, repeated everywhere, does more than a hundred matched details.',
    apply: [
      'Pick one tiny element and put it in every part of your project. Four notes, one sound effect, one recurring phrase, one color. It has to be small enough to survive being rearranged.',
      'Vary the dressing, keep the shape. Mine appears as office background music, as chiptune, and on a car radio — different instruments, same four notes, and people recognize it without noticing why.',
      'Sound gets you further than visuals if you can\'t draw. It\'s the fastest route to "this feels intentional" for a non-artist.',
      'Reuse the same short sound for the same meaning everywhere. One consistent notification chime across your whole project teaches players a language for free.',
    ],
    body: [
      {
        k: 'lead',
        t: 'I had four games that were supposed to be four parts of one day, and they stubbornly felt like four unrelated things. They shared a character and a story. It wasn\'t enough.',
      },
      { k: 'p', t: 'What fixed it was four notes.' },

      { k: 'h', t: 'WHAT A MOTIF ACTUALLY IS' },
      {
        k: 'plain',
        term: 'MOTIF',
        t: 'A very short musical phrase — a few notes — that you repeat throughout a work, dressed differently each time. Film scores lean on this constantly: the same handful of notes played by strings in a sad scene and by brass in a triumphant one. Your ear links the scenes together without you ever consciously noticing the melody repeated.',
      },
      {
        k: 'p',
        t: 'Mine is a four-note phrase belonging to the fictional company. It shows up as background music in the office, as an 8-bit jingle in the arcade-style stage, as a snatch of a jingle on a car radio in the driving stage. Same four notes, three completely different treatments.',
      },
      {
        k: 'quote',
        t: 'Nobody notices the melody. Everybody notices that the four games feel like one place.',
      },

      { k: 'h', t: 'WHY THIS WORKS SO WELL FOR A BEGINNER' },
      {
        k: 'p',
        t: 'Making things look consistent is expensive and needs skill I don\'t have. Making things *sound* consistent needs one short idea and the willingness to reuse it.',
      },
      {
        k: 'p',
        t: 'The same principle covers small sounds. There\'s one chat-notification knock in this project, and it plays in every stage — the office, the arcade, the car, the final scene. It became the sound of the day interrupting you. I didn\'t plan that meaning. Repetition created it.',
      },
      {
        k: 'note',
        label: 'THE CHEAP VERSION',
        t: 'If you take one thing from this: use the same short sound for the same kind of event across your entire project. Same chime for every notification, same thunk for every failure. Players learn the language in about a minute, and it makes a hobby project feel considered.',
      },
    ],
  },

  // ── LOG-011 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-011',
    slug: 'every-ending-costs-zero-dollars',
    title: 'EVERY ENDING COSTS $0.00',
    dek: 'Every version of my game ends on the same line, and I refuse to explain it. Learning to trust the player instead of writing one more sentence.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['NARRATIVE', 'RESTRAINT'],
    soWhat:
      'The strongest instinct a beginner has is to make sure the audience got it — one more line of dialogue, one more clarifying sentence. That instinct is almost always wrong. The thing you cut is usually what makes the thing you kept land, and this is true of writing, of design, and of talking.',
    takeaway:
      'The moment you explain the joke, it stops being one. Pick your one image and refuse to explain it.',
    apply: [
      'Find the single image or line that says what your whole project is about. Put it in a place people can\'t miss and let it sit there alone.',
      'Delete the sentence right after it. That sentence is you being nervous, and cutting it makes the line before it stronger every time.',
      'Repeat it identically rather than varying it. Same words, same place, every ending — repetition is what turns a line into a motif.',
      'Watch someone reach it and say nothing. If you feel the urge to explain, that\'s your answer about whether the work is doing its job — and the fix is upstream, not another sentence.',
    ],
    body: [
      {
        k: 'lead',
        t: 'Every ending in every stage of this game, win or lose, closes on the same line: *Actual Business Value Generated: $0.00.*',
      },
      { k: 'p', t: 'No character says it. Nothing references it. It appears, and then the game is over.' },

      { k: 'h', t: 'THE VERSION I ALMOST SHIPPED' },
      {
        k: 'p',
        t: 'My first draft had a paragraph after that line explaining what it meant. Something gentle about how none of the day\'s work had produced anything. I wrote it because I was scared the player wouldn\'t get it.',
      },
      {
        k: 'p',
        t: 'I read it back and the paragraph was the worst writing in the entire project. Not because it was badly written — because it turned a punch into a lecture. The line already said it. The paragraph said it again, worse, while standing too close to you.',
      },
      {
        k: 'quote',
        t: 'The paragraph wasn\'t there for the player. It was there for me, so I\'d feel safe.',
      },

      { k: 'h', t: 'WHY THE SAME LINE EVERY TIME' },
      {
        k: 'p',
        t: 'It would be easy to vary it — a different number for a good day, a worse one for a bad day. That was my next instinct, and it was also wrong.',
      },
      {
        k: 'p',
        t: 'The point is that it doesn\'t change. You can play brilliantly, keep everyone happy, hit every target, and the figure is identical to the run where everything collapsed. That\'s the whole argument of the game, and it\'s made by the number *not* responding to you. Making it dynamic would have destroyed the only idea it was carrying.',
      },
      {
        k: 'note',
        label: 'A TEST YOU CAN RUN ON YOUR OWN WRITING',
        t: 'Find the line you\'re proudest of. Read what comes immediately after it. If that next line explains, softens, or restates it — cut it and read again. This has never once made my writing worse, which is a strange thing to be able to say about a rule.',
      },
      {
        k: 'p',
        t: 'This was the first moment I trusted a player instead of a paragraph, and it made me braver about the rest of the game. Most of my best cuts came after it.',
      },
    ],
  },

  // ── LOG-012 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-012',
    slug: 'a-save-file-that-survives-a-cleared-cookie',
    title: 'A SAVE FILE THAT SURVIVES A CLEARED COOKIE',
    dek: 'Browser games forget you, silently and permanently. What I did about it, and why it turned out to be a respect problem rather than a technical one.',
    date: '2026-08-01',
    readMin: 5,
    tags: ['BROWSER', 'PLAYER RESPECT'],
    soWhat:
      'If your game runs in a web browser, everything it remembers about a player is fragile — one privacy-settings sweep and their entire progress is gone, with no warning and no way to get it back. Deciding what happens then is a design decision about how much you value someone\'s time, and most beginners never make it consciously.',
    takeaway:
      'Someone gave you twenty minutes of their life. Losing it silently is a design decision, even when you make it by not deciding.',
    apply: [
      'Save progress after every meaningful step, not at the end. A player who quits halfway should be able to come back to where they were.',
      'Assume browser storage will vanish. Privacy tools clear it routinely, and private-browsing windows never keep it at all.',
      'Give people a way to carry their progress out — a code they can copy, a file they can save. It converts an invisible, fragile thing into something they can hold.',
      'Never make someone redo a part they already beat. If you have to lose something, lose the hard-won bonus, not the twenty minutes.',
    ],
    body: [
      {
        k: 'lead',
        t: 'A browser game remembers you using a small pocket of storage inside the browser itself. It works well, right up until it doesn\'t.',
      },
      {
        k: 'plain',
        term: 'BROWSER STORAGE',
        t: 'Space a website is allowed to keep on your computer — a note it leaves for itself so it recognizes you next visit. It survives closing the tab and restarting the machine. It does *not* survive clearing your browsing data, and it never exists at all in a private window. It is also per-browser, so progress in Chrome is invisible in Safari.',
      },
      {
        k: 'p',
        t: 'So the failure mode isn\'t rare or exotic. Someone plays for twenty minutes, does a routine privacy cleanup a week later, comes back, and is a stranger to the game again. Nothing warned them. Nothing can undo it.',
      },

      { k: 'h', t: 'WHY I DIDN\'T JUST ADD ACCOUNTS' },
      {
        k: 'p',
        t: 'The obvious fix is to make people sign up so progress lives on a server. I didn\'t want that, and not only because it\'s more work.',
      },
      {
        k: 'p',
        t: 'The whole promise of this project is that you click a link and you\'re playing. No install, no account, no email address. Adding a signup wall to protect a twenty-minute game would cost more players than the forgetting does.',
      },
      {
        k: 'quote',
        t: 'The fix couldn\'t cost more than the problem. That ruled out the obvious one.',
      },

      { k: 'h', t: 'WHAT I DID INSTEAD' },
      {
        k: 'p',
        t: 'The game squeezes your whole day — what you chose, how each stage went — into a short code. You can copy it, paste it anywhere you keep things, and type it back in later on any machine to restore your day.',
      },
      {
        k: 'p',
        t: 'In-fiction it\'s presented as your HR file, which made it something people actually want to look at rather than a chore. That was luck as much as design, but it\'s a lesson: a boring necessary feature is much better received when it\'s dressed as part of the world.',
      },
      {
        k: 'note',
        label: 'THE PRINCIPLE UNDERNEATH',
        t: 'Someone chose to spend twenty minutes with the thing you made. That is the scarcest resource in the entire project — far scarcer than your time. Losing it silently, when a copyable code would have prevented it, is a statement about how much you valued it.',
      },
    ],
  },

  // ── LOG-013 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-013',
    slug: 'it-ran-at-12-frames-on-a-normal-laptop',
    title: 'IT RAN AT 12 FRAMES ON A NORMAL LAPTOP',
    dek: 'It ran beautifully on the machine I built it on. That machine was not the audience.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['PERFORMANCE', '3D'],
    soWhat:
      'You will build your game on the computer you own, and you will unconsciously design it for that computer. If it stutters on a normal laptop, most people who click your link will leave in the first ten seconds and you will never hear from them. This is the failure that produces no feedback at all, which makes it the one worth catching deliberately.',
    takeaway:
      'Your machine is not the audience. Test on the worst computer you have access to, early, before the choices get expensive.',
    apply: [
      'Test on the oldest, cheapest computer you can borrow, and do it in the first week rather than at the end. Late performance problems are design problems wearing a disguise.',
      'Reduce the number of separate objects before you reduce their detail. Fifty simple objects usually cost more than five complicated ones — the count matters more than the complexity.',
      'When you need many copies of a thing (trees, cars, desks), find out how your tool draws them all in one go. Every 3D toolkit has a way, and it is often a hundred-times difference.',
      'Turn on whatever performance readout your tool offers and leave it on while you build. Watching the number move as you add things teaches you more than any article.',
    ],
    body: [
      {
        k: 'lead',
        t: 'My driving level ran at a smooth 60 on my machine. I sent it to someone on an ordinary work laptop and it ran at about 12, which is roughly the point where a game stops being a game and becomes a slideshow you\'re expected to steer.',
      },

      { k: 'h', t: 'THE NUMBER THAT ACTUALLY MATTERED' },
      {
        k: 'plain',
        term: 'FRAMES PER SECOND, AND DRAW CALLS',
        t: 'Frames per second is how many times the picture updates each second. Around 60 feels smooth; below about 30 feels broken. A draw call is one instruction from your game to the graphics chip: "draw this thing." Each one carries overhead — like a separate trip from the kitchen to the table. Carrying five plates in one trip is dramatically faster than five trips, even though it\'s the same five plates.',
      },
      {
        k: 'p',
        t: 'My city was made of hundreds of separately-placed objects. Every lamppost, every parked car, every window frame was its own trip to the kitchen. On a fast machine you can get away with an absurd number of trips. On a normal laptop you cannot.',
      },
      {
        k: 'quote',
        t: 'It wasn\'t that my city was too detailed. It was that it was too many separate things.',
      },

      { k: 'h', t: 'WHAT ACTUALLY FIXED IT' },
      { k: 'ul', items: [
        'Drawing all copies of a repeated object in a single instruction instead of one each. Every 3D toolkit supports this and it is usually the single biggest win available.',
        'Reusing one surface description across many objects rather than giving each its own — objects sharing a surface can be batched together, objects with unique ones can\'t.',
        'Cutting shadows down to the few objects where a missing shadow would be noticed. Shadows are quietly one of the most expensive things in a scene.',
        'Shrinking oversized images. Several textures were far larger than they could ever appear on screen, which cost memory for a difference no player could see.',
      ] },
      {
        k: 'p',
        t: 'None of that touched the design. The city looks the same. It just stopped asking the graphics chip to do the same job several hundred separate times.',
      },

      { k: 'h', t: 'THE MISTAKE UNDERNEATH THE MISTAKE' },
      {
        k: 'p',
        t: 'The real error wasn\'t technical. It was testing exclusively on a machine that hid the problem, for months, while making structural decisions that assumed that machine.',
      },
      {
        k: 'note',
        label: 'WHY THIS ONE IS SNEAKY',
        t: 'Someone whose browser stutters doesn\'t file a bug report. They close the tab and never mention it. This failure produces total silence, which is easy to mistake for nothing being wrong.',
      },
    ],
  },

  // ── LOG-014 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-014',
    slug: 'thirty-seconds-of-fun',
    title: 'THIRTY SECONDS OF FUN',
    dek: 'The one design question no AI can answer for you, and the one I avoided asking for months because I suspected the answer.',
    date: '2026-08-01',
    readMin: 6,
    tags: ['DESIGN', 'FUNDAMENTALS'],
    soWhat:
      'Everything you add to a game — story, art, rewards, achievements — multiplies whatever is at the center. If the thing you actually do, moment to moment, is boring, then all of that decoration makes a boring game bigger rather than better. This is the single most useful idea I encountered, and it is the one I resisted longest.',
    takeaway:
      'If the smallest loop isn\'t fun with everything stripped away, nothing you add on top will fix it. Additions multiply. They don\'t rescue.',
    apply: [
      'Identify the thing your player does over and over — the ten-second action, not the story around it. Write it down in one sentence.',
      'Strip out the music, the rewards, the story, the score. Play just that action for thirty seconds. Be honest about whether you\'d keep going.',
      'If it isn\'t fun, change the action itself. More rewards, better art and more story will not fix it — they will make it longer.',
      'Test this in week one, not month three. Everything you build on top gets more expensive to throw away, which is exactly why people avoid asking.',
    ],
    body: [
      {
        k: 'lead',
        t: 'There\'s a question working game designers ask that I managed to avoid for months, because on some level I already knew what the answer would be for my game.',
      },
      { k: 'p', t: 'Is the core thirty seconds fun, on its own, with everything else stripped away?' },

      { k: 'h', t: 'WHAT THE QUESTION MEANS' },
      {
        k: 'plain',
        term: 'THE CORE LOOP',
        t: 'The small set of actions a player repeats constantly — the thing they\'re doing most of the time. In a driving game it\'s steering and reacting. In mine it\'s walking up to someone, reading what they say, weighing three or four responses, and picking one. Everything else in a game — story, art, achievements, upgrades — sits on top of that loop.',
      },
      {
        k: 'p',
        t: 'The test is deliberately brutal: remove the music, the story, the rewards, the visual polish. Play only the loop for thirty seconds. Would you keep going?',
      },
      {
        k: 'quote',
        t: 'Everything you add multiplies the core. If the core is near zero, you can add forever and stay near zero.',
      },

      { k: 'h', t: 'WHEN I FINALLY RAN IT' },
      {
        k: 'p',
        t: 'My conversation loop failed. Not badly, but clearly. Reading a problem and picking a response was *fine* — mildly interesting, easy to stop doing. That\'s a lethal review for something a player does forty times in one sitting.',
      },
      {
        k: 'p',
        t: 'What fixed it wasn\'t more content. It was showing the cost of each option before you choose it — an actual little list of what this answer would do to the project, to the team\'s mood, to your calendar, to the clock.',
      },
      {
        k: 'p',
        t: 'That one change turned reading into deciding. Same words, same characters, same art. But now every choice is a small trade you\'re making with your eyes open, and there is no option without a cost. Thirty seconds of that is genuinely tense.',
      },
      {
        k: 'note',
        label: 'WHY THIS IS THE PART AI CAN\'T DO',
        t: 'An AI can build any mechanic you describe, quickly and well. It cannot tell you the mechanic is boring, because it isn\'t playing it and has no stake in whether the next thirty seconds are worth living through. That judgment is the entire job that\'s left, and it stays yours.',
      },

      { k: 'h', t: 'WHY PEOPLE AVOID THIS TEST' },
      {
        k: 'p',
        t: 'Because failing it is expensive. If your core loop is boring in month three, everything you\'ve built on top of it is in question, and nobody wants to know that.',
      },
      {
        k: 'p',
        t: 'Which is exactly the argument for running it in week one, when there\'s nothing on top yet and the answer costs you almost nothing.',
      },
    ],
  },

  // ── LOG-015 ────────────────────────────────────────────────────────────
  {
    key: 'LOG-015',
    slug: 'what-id-tell-someone-on-day-one',
    title: 'WHAT I’D TELL SOMEONE ON DAY ONE',
    dek: 'Everything above, compressed — minus the parts that only sound wise in retrospect.',
    date: '2026-08-01',
    readMin: 7,
    tags: ['BEGINNINGS'],
    soWhat:
      'If you read one post here, this is the one. It\'s the advice I\'d hand to someone with an idea, no technical background, and a suspicion they\'re not allowed to try. You are allowed. Here is what will actually be hard, which is rarely what people expect.',
    takeaway:
      'The code was never the hard part. Deciding what should exist, and being honest about whether it\'s any good, is the whole job — and it was always available to you.',
    apply: [
      'Start with the smallest complete thing, not the best idea you have. A five-minute game that someone finishes teaches you more than a masterpiece you abandon in month four.',
      'Play what you build the same day you build it. The gap between "it works" and "it\'s fun" only shows up when you play, and it never closes on its own.',
      'Write down every decision you lock, and why. You will otherwise reopen the same argument at midnight and lose.',
      'Publish before you feel ready. The version you\'re embarrassed by, in public, beats the perfect one nobody sees — and the feedback is worth more than the extra month.',
    ],
    body: [
      {
        k: 'lead',
        t: 'I had one idea and no qualifications, and I assumed those two facts cancelled each other out. They didn\'t. Here\'s what I actually learned, in the order it mattered.',
      },

      { k: 'h', t: '1 · THE CODE IS NOT THE HARD PART ANYMORE' },
      {
        k: 'p',
        t: 'This is genuinely new and it is genuinely true. You can describe what you want in plain English and get a working version. What you cannot outsource is knowing what to ask for, and noticing when the answer is wrong.',
      },
      {
        k: 'p',
        t: 'An AI will build a bad idea beautifully and never mention that it\'s bad. Your taste is the only thing standing between you and forty hours of polished nothing, which means your taste is now the job.',
      },

      { k: 'h', t: '2 · PLAY IT IMMEDIATELY, AND BE HONEST' },
      {
        k: 'p',
        t: 'The gap between "this works" and "this is fun" is enormous, and it only appears when you play the thing. I lost weeks to features that worked perfectly and added nothing.',
      },
      {
        k: 'p',
        t: 'Test the core thirty seconds early, stripped of music and story and rewards. If it\'s dull naked, it\'ll be dull dressed up. Everything you add multiplies what\'s already there.',
      },

      { k: 'h', t: '3 · YOU ARE THE WORST JUDGE OF YOUR OWN DIFFICULTY' },
      {
        k: 'p',
        t: 'You know all the answers and you can\'t un-know them. Give it to someone who has never seen it, say absolutely nothing, and write down where they get stuck. The saying-nothing is the hard part and it is the whole value.',
      },

      { k: 'h', t: '4 · VERIFY THAT YOUR CHECKS CAN FAIL' },
      {
        k: 'p',
        t: 'Anything automatic that tells you your work is fine should be broken on purpose once, to confirm it notices. Mine reported success for weeks while examining zero files. A check you have never seen go red is decoration.',
      },

      { k: 'h', t: '5 · MEASURE BEFORE YOU FIX' },
      {
        k: 'p',
        t: 'Write down what you expected and what actually happened before changing anything. I fixed the same bug wrongly twice because I was patching my theory instead of the problem. Two failed fixes in a row means your model is wrong, and a third guess from the same wrong model won\'t land either.',
      },

      { k: 'h', t: '6 · TEST ON A BAD COMPUTER, EARLY' },
      {
        k: 'p',
        t: 'You\'ll design for the machine you own without noticing. People whose browser stutters don\'t complain — they close the tab. That failure is completely silent, which is why you have to go looking for it.',
      },

      { k: 'h', t: '7 · SOME MISTAKES LAND ON OTHER PEOPLE' },
      {
        k: 'p',
        t: 'Flashing effects can trigger seizures. Nothing in your tools will warn you. Keep full-screen flashing under three per second, drive motion by time rather than frames, and respect the reduce-motion setting people have already turned on. This is a floor, not a feature.',
      },

      { k: 'h', t: '8 · CUT THE SENTENCE AFTER YOUR BEST LINE' },
      {
        k: 'p',
        t: 'It\'s always there, it\'s always explaining, and it\'s always weaker than what it follows. Trust the player. My whole game ends on one unexplained line and it\'s the best decision in it.',
      },

      { k: 'h', t: 'AND THE ONE THAT ISN\'T A TECHNIQUE' },
      {
        k: 'p',
        t: 'I spent years assuming that making a game required permission I\'d never been given. It doesn\'t. It requires an idea you can\'t drop, a willingness to play your own thing honestly, and a tolerance for being bad at something in public for a while.',
      },
      {
        k: 'quote',
        t: 'I\'m not a game developer. I made games anyway. Those two facts sit together more comfortably than I expected.',
      },
      {
        k: 'p',
        t: 'If you have the idea, the rest of this is learnable. I\'m proof of the low end of that, which is exactly why the advice is worth something.',
      },
    ],
  },
]

// ── Backlog ──────────────────────────────────────────────────────────────
// Empty: everything that was queued here has been written and moved into
// POSTS. Kept as a type + export so the index can show a backlog section
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
