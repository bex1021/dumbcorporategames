# KPI 101.1 — Music Library ("Top Hits")

Original satirical "chart-toppers" for the Lunch Dash car radio. Each sounds like
a genuine radio hit; the lyrics are bleak corporate satire — same trick as the
CEO soundbites, set to a beat.

**How to generate:** paste the **Style prompt** into Suno's style/genre box and the
**Lyrics** (keep the `[Verse]` / `[Chorus]` tags) into the lyrics box. Render, then
drop the audio into `game/public/sounds/radio/music/` and tell Claude the filenames
to wire them into the rotation.

> ⚠️ **NEVER put instrument or production directions in the lyrics box.** Suno sings
> whatever is in there — an early draft had `(angular guitar riff, driving drums drop
> in)` as an intro cue and it came out sung, out loud, as a lyric. All production
> intent belongs in the **style box**. The only parentheses that may appear in lyrics
> are **backing vocals meant to be sung**, e.g. `(we are aligned)`.

> ⚠️ **Avoid the `[Intro]` and `[Outro]` tags in dance tracks.** Suno reads `[Intro]`
> as "generate an instrumental lead-in" and will happily spend 30+ seconds on it
> before the first word — and `[Outro]` does the same at the end. Open on `[Hook]`
> (or straight into `[Verse 1]`) instead, and keep any closing section to one or two
> lines. Repeating a line four times in a row also stretches that section.

The DJ intros/outros each track by its fake title + artist ("that was the new one
from Lil EBITDA…"), so the joke lands even before the song starts.

**Status:** only `rise-and-grind` has actually been rendered to audio. Songs 6 and 7
below are the current priority — they're wired into `radioLines.json` already, so
dropping `aligned.mp3` and `we-are-aligned.mp3` into
`public/sounds/radio/music/` is all that's needed to hear them. (Missing song files
decode to `null` and are skipped silently, so a half-finished library never breaks
the radio.)

**Why more than one song matters:** a Lunch Dash run is ~150 s and the radio does
NOT restart between retries — it keeps rolling. The 24 talk lines never repeat
inside a session, but with a single 2.6-minute song in rotation that song comes
back roughly every 3.5 minutes, so a player on their 3rd or 4th attempt hears it
two or three times. Three songs pushes the repeat gap past ten minutes, which
comfortably covers 3–4 tries.

---

## 6. "Aligned" — Velocity  ★ flagship
*The replacement for "Rise & Grind". A 100%-sincere 2010s uplift anthem whose
gang-vocal hook — "we're a-LIGNED" — sings the **Alignly motif** (6-1-7-5, A-C-B-G),
the same four notes hidden in Jira Run's theme and every phase segue. A square-wave
chiptune lead in the arrangement bridges to the 8-bit score, so it sounds like it
was written inside this game rather than licensed from outside it.*

**Style prompt:**
`Glossy 2010s corporate-motivation synth-pop, euphoric major-key hustle anthem, sincere and triumphant, bright female lead, huge gang-vocal chorus, four-on-the-floor 128 BPM, sidechained supersaws, square-wave chiptune lead, bright 8-bit arpeggios, punchy claps, big stadium reverb, radio-clean mix`

```
[Intro]
Whoa-oh-oh-oh
(we're aligned)
Whoa-oh-oh-oh
(let's align)

[Verse 1]
Alarm at four, I greet the dark
I love the commute, I love the parking
They called us all back, praise the lease
I'm only home when I'm here, this is peace

[Pre-Chorus]
My calendar's full and my heart is too
Circle back, loop me in, that's what winners do

[Chorus]
We're all aligned (aligned!)
Chasing the same bright star
We're all aligned (aligned!)
And I never ask how far
I'll give a hundred and ten,
then I'll dig up ten again
'Cause I'm the greatest asset they ever had
So we rise, aligned

[Verse 2]
Burnout's just passion that's running warm
Every breakdown's a growth platform
They said "we're a family," tender and true
And family is priceless, so the check's past due

[Pre-Chorus]
No such thing as off when you're living the brand
There's a Slack in my pocket and it's holding my hand

[Chorus]
We're all aligned (aligned!)
Chasing the same bright star
We're all aligned (aligned!)
And I never ask how far
I'll give a hundred and ten,
then I'll dig up ten again
'Cause I'm the greatest asset they ever had
So we rise, aligned

[Bridge]
Synergy, synergy, feel the alignment
I'm a person, and also a line-item assignment
Loving my job was a personal choice
Raise your hands to the sky if the mandate says rejoice
(you're doing fine)
(effective immediately)
(Whoa-oh-oh-oh)

[Chorus]
We're all aligned (aligned!)
Chasing the same bright star
We're all aligned (aligned!)
And I never ask how far
I'll give a hundred and ten,
then I'll dig up ten again
'Cause I'm the greatest asset they ever had
So we rise, aligned

[Outro]
We're all aligned (aligned!)
I'll rest when the roadmap's done
We're all aligned (aligned!)
Effective end of... none
Whoa-oh-oh-oh
(we're aligned)
```

**Save as:** `public/sounds/radio/music/aligned.mp3`

---

## 7. "We Are Aligned" — The Wellness Committee  ★ FRENCH HOUSE
*The contrast slot to Rise & Grind's 80s city pop: guitars instead of synths, and
a cooler, more detached voice.*

*Three drafts got here. Lounge muzak (78 BPM) and sunshine pop (92, then 120) were
both pleasant but kept running into the same wall — this is **driving music**, and
it has to carry several minutes of gameplay without dragging. The final brief was
also "chart-credible, but not pop and not hip hop", which rules out the sweet-and-
sincere register entirely.*

***Indie dance-rock solves all of it:** guitar-based (so it contrasts hard with
Rise & Grind), genuinely Top-50 plausible, and propulsive at 128 BPM. The vocal is
cool and detached rather than sweetly sincere, which actually sharpens the satire —
the singer sounds like she's **reporting** the layoff, not mourning it.*

**Style prompt (use this one — FRENCH HOUSE):**
`French house, filtered disco loop, Daft Punk and Stardust and Modjo influence, warm sidechained disco sample loop, phaser filter sweeps, funky muted disco guitar, deep punchy four-on-the-floor kick, crisp hi-hats, soulful looped female vocal hook, euphoric and hypnotic, 124 BPM, sunny late-90s French touch, warm analog compression`

*DANCE EDIT: French house is built on ONE vocal phrase looped hypnotically through
a filter, so this lyric is radically shorter and more repetitive than earlier drafts
— that repetition IS the form, not laziness. It also turns out to be the sharpest
version of the joke: "We are aligned" and "You're doing fine" chanted over and over,
euphorically, is corporate language doing exactly what corporate language does.
The breakdowns drop the filter so the two cruellest lines land in the clear.*

<details><summary>Superseded — indie dance-rock (good, but French house is more iconic)</summary>

`Indie dance-rock, angular and propulsive, tight funky guitar riffs, driving danceable drums, prominent melodic bassline, bright synth accents, faint 8-bit synth chime, cool detached female vocal with a big hooky chorus, Franz Ferdinand and Two Door Cinema Club influence, 128 BPM, energetic and wry, crisp modern production`
</details>

<details><summary>Superseded style prompts (kept for reference)</summary>

**Up-tempo sunshine pop, 120 BPM:**
`Up-tempo 60s sunshine pop, bright and buoyant, sunny major key, The Association and Sergio Mendes influence, driving tambourine and handclaps, punchy melodic bassline, jangly rhythm guitar, warm Rhodes piano, bright horn stabs, sweet sincere female lead vocal, rich close-harmony group backing vocals, faint 8-bit music-box chime, 120 BPM, joyful and breezy with a wistful undertow, vintage analog warmth`

**92 BPM sunshine pop (too slow for drive-time — right character, wrong pace):**
`60s sunshine pop, warm and immaculate, Carpenters and Burt Bacharach influence, lush orchestral pop arrangement, gentle strings, warm Rhodes piano, soft flugelhorn, brushed drums, sweet sincere female lead vocal, rich close-harmony backing vocals, faint 8-bit music-box chime, 92 BPM, sunny and wistful, vintage analog warmth`

**Lounge muzak (too sedated):**
`Deadpan corporate lounge muzak, easy-listening bossa nova, smooth jazz, warm vibraphone, Rhodes electric piano, muted trumpet, brushed drums, soft nylon guitar, breathy serene female vocal, faint 8-bit music-box chime, slow sedated tempo 78 BPM, elevator-music calm, vaporwave-adjacent, pleasant and eerie`
</details>

**Alternative up-tempo styles** (same lyrics, no changes needed — swap the style box):

- *60s girl group / Motown-pop, 122 BPM:*
  `60s girl group Motown pop, joyful and propulsive, driving tambourine on every beat, handclaps, punchy melodic Motown bassline, bright horn section stabs, jangly guitar, sweet female lead with big call-and-response backing group, faint 8-bit chime, 122 BPM, sunny and irresistible, vintage analog warmth`
- *Northern soul stomper, 128 BPM:*
  `Northern soul stomper, fast four-on-the-floor stomp, urgent driving beat, punchy brass stabs, rolling piano, propulsive bassline, passionate female lead vocal, soaring group backing vocals, tambourine, faint 8-bit chime, 128 BPM, euphoric and relentless, vintage 60s soul production`
- *Sunshine bossa-pop (Brasil '66), 118 BPM:*
  `Up-tempo 60s sunshine bossa pop, Sergio Mendes Brasil 66 influence, breezy latin groove, bright Rhodes piano, crisp bossa drums with tambourine, melodic bass, warm horn accents, sweet female lead with unison group harmony vocals, faint 8-bit chime, 118 BPM, sunny and sophisticated, vintage analog warmth`

```
[Hook]
Everything is fine
We are aligned
We are aligned
You're doing fine

[Verse 1]
Badge still works, you're part of the plan
Lights stay low, the coffee's warm
Nowhere you can't reach
No reason to go home

[Hook]
We are aligned
We are aligned
We are aligned
You're doing fine

[Breakdown]
The family's still here
It's just a little smaller
But you're doing fine
You're doing fine

[Verse 2]
We built an app to help you rest
It pings at eleven
You're our greatest asset
You're our greatest asset

[Hook]
We are aligned
We are aligned
We are aligned
You're doing fine

[Breakdown]
It isn't goodbye
It's just headcount
Take care of yourself
On your own time

[Hook]
We are aligned
We are aligned
We are aligned
You're doing fine

[Outro]
Everything is fine
This message repeats
```

**Save as:** `public/sounds/radio/music/we-are-aligned.mp3`

### Suno settings for both

- **Style Influence / Style Strength: HIGH (~85–100%)** so it commits to the genre.
- **Weirdness: LOW–MID (~10–30%)** so the vocal stays clean and the lyrics stay legible.
- Front-load the style box — Suno weights the opening words most.
- Expect **3–5 regenerations**; vocals are the lottery. Re-roll until the
  "a-LIGNED" hook lands clearly. If a take is 90% right, use *Extend* or
  *Replace Section* rather than re-rolling the whole track.
- Aim for **2:30–3:15** (radio length). Trim a repeated final chorus if it rambles.

---

## 1. "Rise & Grind" — Synergy  ★ RE-STYLED (v4 — CITY POP)
*Fourth genre, and the one to use. The others each missed in an instructive way,
so the reasoning is worth keeping:*

- *v1 (2010s dance-pop) — sounded licensed-in, not native to the game.*
- *v2 (80s synthwave) — bridged nicely to the chiptune score but read **too
  positive**. A euphoric chorus buries the lyrics, and the joke only works if you
  actually hear them.*
- *v3 (industrial) — made the bleakness audible, but overshot into oppressive.*
- ***v4 (city pop) — right, because of the one constraint the others ignored:
  this is DRIVING MUSIC.** It plays under several minutes of gameplay while the
  player is literally at the wheel with the radio on, so it has to stay pleasant
  and mid-energy. City pop is exactly that — breezy, glossy, sunlit — with a
  wistful melancholy under the sheen that lets the satire land softly instead of
  being shouted or celebrated. It's also, historically, Japanese drive-time
  music, and it shares the 80s synth palette that connects to Jira Run's score.*

*Every original line is intact, including the "baby" that v3 removed — city pop is
warm and casual, so it belongs again. The intro/outro now put the listener in the
car ("Sun on the windshield, radio on"), and the bridge turns wistful rather than
angry: the saddest thing in the song is the life she didn't take, and then the
light goes green and she drives on anyway.*

**Style prompt (v5 — BIG BEAT — use this one):**
`Big beat breakbeat, chunky funky drum breaks, Fatboy Slim and Chemical Brothers influence, fat filtered acid bassline, brass stabs, turntable scratches, block-rocking energy, attitude-heavy female vocal hook chopped and repeated, huge filter builds and drops, 128 BPM, late-90s big beat, punchy compressed drums, dirty and euphoric`

*DANCE EDIT: the lyric below is deliberately shorter and far more repetitive than
the earlier versions. Big beat lives on a chopped, repeated hook — verses become
rhythm, not storytelling — so the song is built around "rise and grind" as a chant
with builds and drops. The sharpest original lines survive; the rest was cut,
because a club track that tries to deliver four verses just sounds cluttered.*

<details><summary>Superseded style prompts (kept for reference)</summary>

**v3 — industrial (too dark):**
`Dark industrial synth-pop, cold and mechanical, minor key, menacing and hypnotic, distorted female vocal, deadpan monotone delivery, pounding four-on-the-floor industrial kick, metallic percussion, factory clang samples, gritty analog bass, detuned square-wave chiptune lead, EBM, Nine Inch Nails influence, 124 BPM, oppressive and relentless`

**v2 — 80s synthwave (too positive):**
`Glossy 80s synthwave pop anthem, Top-40 radio hit, euphoric sincere and triumphant, bright female lead vocal, punchy square-wave chiptune lead, arpeggiated analog synths, DX7 bells, gated-reverb snare, neon bassline, four-on-the-floor 118 BPM, huge gang-vocal chorus, stadium reverb, radio-clean mix`

**v1 — 2010s dance-pop:**
`Glossy high-energy female pop anthem, 2010s Top-40 radio, four-on-the-floor dance beat, huge bright synths, triumphant stadium chorus, confident and euphoric.`
</details>

```
[Hook]
Rise, rise, rise and grind

[Verse 1]
Alarm at five, I don't even blink
Coffee is my blood, no time to think
Sold the dream and I sold it cheap
Who needs a weekend, who needs to sleep

[Build]
No time to think
No time to think
No time, no time, no time to think

[Drop]
Rise and grind
Rise and grind
I'll rest when I'm dead, or the company dies
Rise and grind

[Verse 2]
Unpaid intern to unpaid friend
Passion is the paycheck, that's the trend
Family, family, warm and tight
Quarter goes red — thanks, goodnight

[Build]
Thanks, goodnight
Thanks, goodnight
Thanks, thanks, thanks, goodnight

[Drop]
Rise and grind
Rise and grind
I'll rest when I'm dead, or the company dies
Rise and grind

[Breakdown]
They gave me a title instead of a raise
A plaque with my name for the difficult days
I'm a self-starting flame
And they own the frame

[Build]
Rise
Rise
Rise and grind

[Drop]
Rise and grind
Rise and grind
I'll rest when I'm dead, or the company dies
Rise and grind

[Outro]
I'll rest when the roadmap's done
Rise and grind
```

**Save as:** `public/sounds/radio/music/rise-and-grind.mp3` — same filename, so the
new version simply replaces the old one. Nothing to re-wire.

**The DJ intro still works** — Matilda already reads *"A song about living the
dream. Someone's dream."* over it, and a deadpan anchor teeing up a menacing
track lands even better than it did over the pop version. No re-render needed.

---

## 2. "Greatest Asset" — Marcus Vale
*Smooth R&B slow jam — sounds like a seduction; it's your employer wooing you, right up to the layoff.*

**Style prompt:**
`Smooth 90s / 2000s R&B slow jam, silky male falsetto, sensual quiet-storm radio, slow tempo, warm Rhodes piano, soft finger snaps, lush and intimate.`

```
[Verse 1]
Girl, I look across this whole company
A hundred thousand faces, but I only see
You — my top performer, my ride-or-die
The reason for the numbers, the gleam in my eye

[Pre-Chorus]
So stay a little later, don't you go
I got somethin' to tell you that you already know

[Chorus]
You're my greatest asset, baby (greatest asset)
The finest line on all my books
You're my greatest asset, baby
Appreciatin' daily — girl, look at you appreciate

[Verse 2]
I'd never let you go... unless the market dips
Unless a spreadsheet somewhere curls its lips
It ain't you, it's the macro, it's the Fed, it's the vibe
Security's outside now — but baby, you'll survive
(you won't)

[Bridge]
And if I have to let you go
It's the hardest thing, I swear (so hard)
I'll cherish what we built together
As I quietly revoke your badge and chair

[Outro]
You'll always be... my greatest asset
(effective end of day)
```

---

## 3. "Shareholder Value" — Lil EBITDA
*Trap / hip-hop banger — flexing corporate nonsense like it's cash and status.*

**Style prompt:**
`Hard-hitting modern trap / hip-hop, booming 808s, rapid hi-hat rolls, dark ominous synth, aggressive braggadocio flow, heavy ad-libs, club banger.`

```
[Intro]
Yeah (yeah)
KPI, one-oh-one point one
(EBITDA!) skrrt

[Verse 1]
Buy the company, gut it, flip it, that's a lick
Layoffs on a Friday, watch the stock price tick (up!)
I don't sleep, I optimize, I never miss
Golden parachute strapped — catch me if I dip

[Chorus]
Shareholder value (value!)
That's the only love I know
Shareholder value (value!)
Buyback season, watch it grow
I don't make a product, I just make the numbers go
Up, up, up — while the workers go
(low)

[Verse 2]
Synergy (synergy!) — don't even know what it means
Slap it on a slide, watch it pump up the machine
Q4 in the bag, got the board on my team
Bonus in the bank — never seen the office, feel me?

[Chorus]
Shareholder value (value!)
That's the only love I know
Shareholder value (value!)
Buyback season, watch it grow
I don't make a product, I just make the numbers go
Up, up, up — while the workers go
(low)
```

---

## 4. "Sunday Scaries" — mold
*Sad bedroom indie-pop — burnout, the dread of Monday, quiet quitting.*

**Style prompt:**
`Melancholic lo-fi bedroom indie-pop, soft breathy female vocals, reverb-drenched, gentle fingerpicked guitar, hazy and dreamy, slow and sad.`

```
[Verse 1]
it's six p.m. on a sunday
and i can feel it comin' on
that little pit inside my stomach
knowin' the weekend's almost gone

[Pre-Chorus]
i haven't opened slack
but slack has opened me

[Chorus]
sunday scaries, here they come
countin' down the hours til i'm numb
i'm not quitting, i'm just... quiet
foldin' laundry, stagin' a riot
oh, sunday scaries
oh

[Verse 2]
they told me do the thing i love
so the love ran out of me
i loved it so efficiently
there's nothin' left to be

[Chorus]
sunday scaries, here they come
countin' down the hours til i'm numb
i'm not quitting, i'm just... quiet
foldin' laundry, stagin' a riot
oh, sunday scaries
oh

[Outro]
monday, monday
please be gentle
(it won't)
```

---

## 5. "Back to the Office" — Dale Rutherford
*Stomping country / Americana — the return-to-office mandate as a proud heartland anthem.*

**Style prompt:**
`Stomping modern country / Americana anthem, gravelly earnest male vocals, acoustic guitar, fiddle, big stadium drums, proud and rousing, radio country.`

```
[Verse 1]
Well I got the email Monday mornin'
Said the work-from-home is through
Pack your laptop, kiss the dog goodbye
There's a lanyard in it for you

[Pre-Chorus]
Two hours down the interstate
To a chair that ain't my own

[Chorus]
I'm goin' back to the office (back to the office!)
Where the coffee's always cold
Gonna drive a hundred miles
Just to sit on Zoom and grow old
They could've sent an email
But they leased a whole headquarters
So I'm goin' back, back, back to the office
Like my daddy and his fathers

[Verse 2]
"Culture, son, you can't build it on a screen"
That's what they told the lease
Fifteen years on the dotted line
So we're all here for the peace
(and the free snacks)

[Chorus]
I'm goin' back to the office (back to the office!)
Where the coffee's always cold
Gonna drive a hundred miles
Just to sit on Zoom and grow old
They could've sent an email
But they leased a whole headquarters
So I'm goin' back, back, back to the office
Like my daddy and his fathers
```
