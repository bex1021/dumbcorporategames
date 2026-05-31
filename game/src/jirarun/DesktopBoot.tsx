// Phase 2 opener — Leonard's desktop.
//
// The bridge from the standup (Phase 1) into Jira Run. You sit back down at
// your desk, your monitor lights up over the office, and three windows are
// open: Slack (still buzzing from this morning), Spotify (procrastination
// fuel), and Chrome on the Jira board (the actual work). Slack is on top —
// you have to click OVER to the Jira tab to start. That little act of
// choosing the work over the noise IS the "okay, lock in" beat.
//
// Pure 2D UI. The office shows behind the monitor (a blurred Phase-1
// screenshot) so it reads as "at your desk, in the office." Clicking
// "Update tickets" in the Jira tab calls onEnter() → the runner begins.

import { useState, useRef, useEffect, useLayoutEffect, type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { STARTER_PINGS, AMBIENT_POOL, type SlackTemplate } from '../content/slack'

type AppId = 'slack' | 'chrome' | 'spotify'

// ---- tiny self-contained UI sound (Web Audio, no assets) ----
const deskSfx = (() => {
  let ctx: AudioContext | null = null
  const ac = () => (ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)())
  function blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    try {
      const c = ac(); const t = c.currentTime
      const o = c.createOscillator(); const g = c.createGain()
      o.type = type; o.frequency.setValueAtTime(freq, t)
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02)
    } catch { /* ignore */ }
  }
  return {
    click: () => blip(420, 0.05, 'sine', 0.045, 620),
    key: () => blip(820 + Math.random() * 280, 0.02, 'square', 0.02),
    knock: () => { blip(330, 0.07, 'sine', 0.08); setTimeout(() => blip(300, 0.08, 'sine', 0.07), 95) },
    whoosh: () => blip(170, 0.42, 'sawtooth', 0.08, 1300),
  }
})()

// Escalating "are the tickets updated yet?" pings that arrive while you idle on
// the desktop — so resisting the distractions and locking in actually means
// something (the noise builds; you choose to silence it by getting to work).
const PRESSURE: { from: string; text: string; color: string }[] = [
  { from: 'Diane', text: 'hey — are your tickets up to date? 👀', color: '#a89876' },
  { from: 'Brent', text: "is the board current? can't tell what's actually in progress", color: '#6b7a8f' },
  { from: 'Exec', text: "looking at the board now… doesn't look updated?", color: '#b08a3a' },
  { from: 'Diane', text: "another nudge — board's still looking a little stale on my end 💚", color: '#a89876' },
  { from: 'Chad', text: "client's going to pull up the board in standup. is it updated?", color: '#3a4f7a' },
  { from: 'Exec', text: "circling back — board still isn't updated. can you refresh it today?", color: '#b08a3a' },
]

// A believable "prior session" Slack feed: the morning's starter pings plus a
// handful of ambient ones, oldest → newest, with fake "Xm ago" timestamps.
const SLACK_FEED: { msg: SlackTemplate; ago: string }[] = [
  ...STARTER_PINGS.map((m, i) => ({ msg: m, ago: `${48 - i * 6}m ago` })),
  { msg: AMBIENT_POOL[8], ago: '22m ago' }, // Priya: small change no longer small
  { msg: AMBIENT_POOL[0], ago: '14m ago' }, // Brent: staging crashed at 3am
  { msg: AMBIENT_POOL[18], ago: '9m ago' }, // Exec: status must stay GREEN
  { msg: AMBIENT_POOL[15], ago: '4m ago' }, // Diane: do you have 15 minutes
  { msg: AMBIENT_POOL[13], ago: 'just now' }, // Chad: Thursday demo still happening?
]

// Avatar dot color per sender (no Phase-1 coupling — just for flavor).
const DOT: Record<string, string> = {
  brent: '#6b7a8f', tasha: '#c47a9a', priya: '#7aa66c', chad: '#3a4f7a',
  diane: '#a89876', exec: '#b08a3a', system: '#8a9499', leonard: '#3a7bd5',
}

// Leonard's 4 un-updated tickets — these are the 4 updates you deposit in the
// run. Copy echoes the Phase-1 stakeholders for continuity.
const TICKETS = [
  { id: 'ALN-1842', title: "Define 'Premium'", col: 'To Do', who: 'Brent' },
  { id: 'ALN-1850', title: 'Make the design "pop" (clarify)', col: 'To Do', who: 'Tasha' },
  { id: 'ALN-1847', title: 'Dedupe the deduplication logic', col: 'In Progress', who: 'Brent' },
  { id: 'ALN-1851', title: 'Thursday demo → "target state"', col: 'In Progress', who: 'Chad' },
]

export function DesktopBoot({ onEnter, skipBoot = false }: { onEnter: () => void; skipBoot?: boolean }) {
  const [booted, setBooted] = useState(skipBoot) // returning from the run skips the "you survived standup" card
  const [focused, setFocused] = useState<AppId>('slack') // Slack grabs you first
  const [playing, setPlaying] = useState(false)
  const [chromeTab, setChromeTab] = useState<'jira' | 'news'>('jira') // lifted so the dock can force the Jira tab
  const [unread, setUnread] = useState(5)
  const [ping, setPing] = useState<{ from: string; text: string; color: string } | null>(null)
  const [entering, setEntering] = useState(false) // "diving into the board" flourish
  const [mins, setMins] = useState(0) // in-fiction minutes elapsed since 10:45

  const z = (app: AppId) => (focused === app ? 30 : app === 'slack' ? 20 : app === 'chrome' ? 15 : 10)
  const focus = (app: AppId) => setFocused(app)
  const dismissBoot = () => { deskSfx.click(); setBooted(true) }
  const launch = () => {
    if (entering) return
    deskSfx.click(); deskSfx.whoosh(); setEntering(true)
    window.setTimeout(onEnter, 430)
  }

  // Keyboard path: Enter/Space advances (boot → desktop → Jira board → run),
  // without hijacking typing in the Slack composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (entering) return
      e.preventDefault()
      if (!booted) return dismissBoot()
      if (focused === 'chrome' && chromeTab === 'jira') launch()
      else { setFocused('chrome'); setChromeTab('jira'); deskSfx.click() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, focused, chromeTab, entering])

  // Escalating pings while you dawdle on the desktop.
  const pressureIdx = useRef(0)
  useEffect(() => {
    if (!booted || entering) return
    const id = window.setInterval(() => {
      const i = pressureIdx.current
      if (i >= PRESSURE.length) { window.clearInterval(id); return }
      pressureIdx.current = i + 1
      setPing(PRESSURE[i]); setUnread((u) => u + 1); deskSfx.knock()
    }, 4500)
    return () => window.clearInterval(id)
  }, [booted, entering])

  // auto-dismiss the current notification toast
  useEffect(() => {
    if (!ping) return
    const t = window.setTimeout(() => setPing(null), 3800)
    return () => window.clearTimeout(t)
  }, [ping])

  // in-fiction clock creeps forward from 10:45 while you idle
  useEffect(() => {
    if (!booted || entering) return
    const id = window.setInterval(() => setMins((m) => Math.min(m + 1, 120)), 4000)
    return () => window.clearInterval(id)
  }, [booted, entering])

  const total = 10 * 60 + 45 + mins
  const clock = `${((Math.floor(total / 60) + 11) % 12) + 1}:${String(total % 60).padStart(2, '0')} ${Math.floor(total / 60) < 12 ? 'AM' : 'PM'}`

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
      style={{ background: '#0b0d12' }}
    >
      {/* Office backdrop — you're at your desk, in the office */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/screenshots/01-hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(5px) brightness(0.55) saturate(1)',
          transform: 'scale(1.08)',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 42%, transparent 38%, rgba(0,0,0,0.42))' }} />

      {/* The monitor sitting on the desk — zooms in as you "dive into the board" */}
      <div
        className="relative transition-[transform,opacity] ease-in"
        style={{
          width: 'min(94vw, 1180px)', height: 'min(84vh, 760px)',
          transitionDuration: '430ms',
          transform: entering ? 'scale(1.18)' : 'scale(1)',
          opacity: entering ? 0 : 1,
        }}
      >
        <div
          className="w-full h-full rounded-2xl overflow-hidden relative"
          style={{ border: '10px solid #15171c', boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 2px #2a2d35' }}
        >
          {/* ===== DESKTOP ===== */}
          <div
            className="absolute inset-0"
            style={{
              // macOS-style "Lake Tahoe" wallpaper — CSS recreation of the
              // classic clear turquoise water fading to deep teal with submerged
              // boulders. (Copyright-safe; drop a real royalty-free Tahoe photo
              // into /public/ and swap this for backgroundImage to use the photo.)
              background: [
                'radial-gradient(60% 42% at 50% 4%, rgba(255,255,255,0.18), transparent 60%)', // surface light
                'radial-gradient(38% 26% at 27% 74%, rgba(6,36,50,0.58), transparent 62%)',     // boulder
                'radial-gradient(31% 21% at 60% 88%, rgba(8,42,58,0.52), transparent 62%)',     // boulder
                'radial-gradient(24% 16% at 83% 70%, rgba(10,48,64,0.46), transparent 62%)',    // boulder
                'radial-gradient(20% 14% at 13% 92%, rgba(8,42,58,0.5), transparent 62%)',       // boulder
                'linear-gradient(180deg, #86dee2 0%, #43b8ca 28%, #1f87a6 58%, #0b485f 100%)',   // clear water → depth
              ].join(', '),
            }}
          >

            {/* Menu bar */}
            <div className="absolute top-0 inset-x-0 h-7 px-3 flex items-center justify-between text-[12px] text-white/90 bg-black/30 backdrop-blur-md z-40">
              <div className="flex items-center gap-4">
                <span className="font-semibold">●&nbsp; blockedOS</span>
                <span className="opacity-80 capitalize">{focused === 'chrome' ? 'Chrome' : focused === 'slack' ? 'Slack' : 'Spotify'}</span>
              </div>
              <div className="flex items-center gap-3 opacity-90 font-mono">
                <span>💚</span><span>▦</span><span>🔋</span><span className="tabular-nums">{clock}</span>
              </div>
            </div>

            {/* Desktop flavor files */}
            <div className="absolute top-10 right-3 flex flex-col gap-3 z-10 text-center">
              {['Q3_OKRs_FINAL_final.xlsx', 'do_not_open.pdf'].map((f) => (
                <div key={f} className="w-16 flex flex-col items-center gap-1 select-none">
                  <div className="w-10 h-12 rounded bg-white/85 shadow-md grid place-items-center text-lg">📄</div>
                  <div className="text-[9px] text-white leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{f}</div>
                </div>
              ))}
            </div>

            {/* ===== WINDOWS ===== */}
            {/* Chrome / Jira — sits behind Slack until you click over */}
            <Window
              title="Jira — Sprint Board · Chrome"
              focused={focused === 'chrome'}
              z={z('chrome')}
              onFocus={() => focus('chrome')}
              initial={{ fx: 0.08, fy: 0.14, fw: 0.6, fh: 0.74 }}
              revealed={booted}
            >
              <ChromeBrowser onEnter={launch} focused={focused === 'chrome'} tab={chromeTab} onTab={setChromeTab} />
            </Window>

            {/* Spotify — bottom-right */}
            <Window
              title="Spotify"
              focused={focused === 'spotify'}
              z={z('spotify')}
              onFocus={() => focus('spotify')}
              initial={{ fx: 0.63, fy: 0.42, fw: 0.33, fh: 0.46 }}
              revealed={booted}
            >
              <Spotify playing={playing} onToggle={() => setPlaying((p) => !p)} />
            </Window>

            {/* Slack — frontmost, the distraction */}
            <Window
              title="Slack — Alignly HQ"
              focused={focused === 'slack'}
              z={z('slack')}
              onFocus={() => focus('slack')}
              badge={unread}
              initial={{ fx: 0.5, fy: 0.09, fw: 0.46, fh: 0.68 }}
              revealed={booted}
            >
              <SlackApp />
            </Window>

            {/* Dock */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center z-40">
              <div className="flex items-end gap-3 px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20">
                <DockIcon label="Slack" color="#4A154B" glyph="#" active={focused === 'slack'} onClick={() => focus('slack')} badge={unread} />
                <DockIcon label="Chrome — Jira" color="#1a73e8" glyph="◎" active={focused === 'chrome'} onClick={() => { focus('chrome'); setChromeTab('jira') }} pulse />
                <DockIcon label="Spotify" color="#1DB954" glyph="♫" active={focused === 'spotify'} onClick={() => focus('spotify')} />
                <div className="w-px h-9 bg-white/25 mx-1" />
                <DockIcon label="Mail" color="#1f6feb" glyph="✉" onClick={() => setPing({ from: 'Mail', text: '1,204 unread. Bold of you to open this.', color: '#1f6feb' })} />
                <DockIcon label="Calendar" color="#d14343" glyph="▦" onClick={() => setPing({ from: 'Calendar', text: 'Next free slot: Q3 2027.', color: '#d14343' })} />
              </div>
            </div>

            {/* wayfinding — points down at the pulsing Chrome dock icon; clickable */}
            {focused !== 'chrome' && (
              <button
                onClick={() => { deskSfx.click(); focus('chrome'); setChromeTab('jira') }}
                className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-40 text-[11px] text-white bg-black/55 px-3 py-1.5 rounded-full backdrop-blur pointer-events-auto hover:bg-black/70 animate-bounce motion-reduce:animate-none"
              >
                open Chrome → your Jira board ↓
              </button>
            )}

            {/* notification toast — escalating pings + dock gags */}
            {ping && (
              <div
                key={ping.from + ping.text}
                className="absolute top-9 right-3 z-50 w-60 rounded-lg bg-white shadow-2xl border border-zinc-200 p-2.5 flex gap-2 items-start"
                style={{ animation: 'pingin 0.25s ease-out' }}
              >
                <div className="w-7 h-7 rounded-md shrink-0" style={{ background: ping.color }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-zinc-800">{ping.from} <span className="font-normal text-zinc-400">· Slack</span></div>
                  <div className="text-[11px] text-zinc-600 leading-snug">{ping.text}</div>
                </div>
                <style>{`@keyframes pingin{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
              </div>
            )}
          </div>
        </div>
        {/* monitor stand */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-28 h-3 rounded-b-xl bg-[#15171c]" />
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-44 h-3 rounded-full bg-black/40" />
      </div>

      {/* ===== BOOT MODAL (fades out to reveal the desktop) ===== */}
      <button
        onClick={dismissBoot}
        aria-hidden={booted}
        className={`absolute inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-500 ${booted ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-pointer'}`}
        style={{ background: 'rgba(6,8,12,0.82)' }}
      >
          <div className="max-w-md w-full text-center font-mono text-white">
            <div className="text-5xl mb-4">🟢</div>
            <h1 className="text-2xl font-black mb-3 tracking-tight" style={{ fontFamily: 'sans-serif' }}>
              You survived standup.
            </h1>
            <p className="text-white/75 text-sm leading-relaxed mb-6">
              It's 10:45 AM. You're back at your desk. Now update your Jira tickets —
              before someone asks why they're not updated.
            </p>
            <span className="inline-block px-6 py-3 rounded font-bold text-sm uppercase tracking-widest bg-white text-ink-900"
              style={{ color: '#0b0d12' }}>
              Update your tickets →
            </span>
            <div className="text-white/40 text-[11px] mt-3">(click anywhere or press Enter)</div>
          </div>
      </button>
    </div>
  )
}

// ---- generic OS window (drag it by the title bar, like a real window) ----
function Window({
  title, focused, z, onFocus, badge, initial, revealed = true, children,
}: {
  title: string; focused: boolean; z: number; onFocus: () => void; badge?: number
  initial: { fx: number; fy: number; fw: number; fh: number }; revealed?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  // Size + place relative to the desktop area on mount (keeps it responsive),
  // then it's free-floating px from there so dragging is pixel-exact.
  useLayoutEffect(() => {
    const p = ref.current?.offsetParent as HTMLElement | null
    const pw = p?.clientWidth ?? 1000
    const ph = p?.clientHeight ?? 700
    setBox({ x: initial.fx * pw, y: initial.fy * ph, w: initial.fw * pw, h: initial.fh * ph })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDown = (e: ReactPointerEvent) => {
    if (!box) return
    onFocus()
    drag.current = { sx: e.clientX, sy: e.clientY, ox: box.x, oy: box.y }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!drag.current || !box) return
    const p = ref.current?.offsetParent as HTMLElement | null
    const pw = p?.clientWidth ?? 99999
    const ph = p?.clientHeight ?? 99999
    // keep at least a sliver of the title bar grabbable on every edge
    const nx = Math.max(-(box.w - 90), Math.min(pw - 90, drag.current.ox + (e.clientX - drag.current.sx)))
    const ny = Math.max(0, Math.min(ph - 28, drag.current.oy + (e.clientY - drag.current.sy)))
    setBox({ ...box, x: nx, y: ny })
  }
  const onUp = (e: ReactPointerEvent) => {
    drag.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  return (
    <div
      ref={ref}
      onMouseDown={onFocus}
      className="absolute rounded-lg overflow-hidden flex flex-col bg-white transition-[opacity,transform,box-shadow] duration-300 motion-reduce:transition-none"
      style={{
        left: box?.x ?? 0, top: box?.y ?? 0, width: box?.w, height: box?.h, zIndex: z,
        visibility: box ? 'visible' : 'hidden',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'scale(1)' : 'scale(0.97)',
        outline: focused ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(0,0,0,0.25)',
        boxShadow: focused ? '0 24px 70px rgba(0,0,0,0.55)' : '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      {/* draggable title bar */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className={`h-8 px-3 flex items-center gap-2 shrink-0 select-none cursor-grab active:cursor-grabbing ${focused ? 'bg-zinc-100' : 'bg-zinc-200/80'}`}
      >
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[12px] text-zinc-600 font-medium truncate">{title}</span>
        {badge ? (
          <span className="ml-auto text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">{badge}</span>
        ) : null}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

// ---- dock icon ----
function DockIcon({
  label, color, glyph, active, onClick, badge, pulse,
}: {
  label: string; color: string; glyph: string; active?: boolean
  onClick?: () => void; badge?: number; pulse?: boolean
}) {
  return (
    <button onClick={() => { deskSfx.click(); onClick?.() }} className="group relative flex flex-col items-center" title={label}>
      <div
        className={`relative w-11 h-11 rounded-xl grid place-items-center text-white text-lg font-bold shadow-lg transition-transform group-hover:-translate-y-1 ${pulse ? 'animate-bounce motion-reduce:animate-none' : ''}`}
        style={{ background: color }}
      >
        {glyph}
        {badge ? (
          <span className="absolute -top-1 -right-1 text-[9px] font-bold text-white bg-red-500 rounded-full px-1">{badge}</span>
        ) : null}
      </div>
      <span className={`mt-0.5 w-1 h-1 rounded-full ${active ? 'bg-white' : 'bg-transparent'}`} />
    </button>
  )
}

const MAIN_CHANNEL = 'customer-happiness-portal-refresh'
type SlackChannel = { id: string; name: string; dm?: boolean; dot?: string }
const SLACK_CHANNELS: SlackChannel[] = [
  { id: MAIN_CHANNEL, name: MAIN_CHANNEL },
  { id: 'engineering', name: 'engineering' },
  { id: 'design', name: 'design' },
  { id: 'general', name: 'general' },
  { id: 'diane', name: 'Diane', dm: true, dot: '🟢' },
  { id: 'exec', name: 'Exec', dm: true, dot: '⚪' },
]
// Per-channel messages: the main channel shows the curated prior-session feed;
// the others pull their own ambient chatter so every channel has content.
function channelFeed(id: string): { msg: SlackTemplate; ago: string }[] {
  if (id === MAIN_CHANNEL) return SLACK_FEED
  if (id === 'diane') return AMBIENT_POOL.filter((m) => m.channel === 'DM' && m.npcId === 'diane').map((m) => ({ msg: m, ago: 'earlier' }))
  if (id === 'exec') return AMBIENT_POOL.filter((m) => m.channel === 'DM' && m.npcId === 'exec').map((m) => ({ msg: m, ago: 'earlier' }))
  return AMBIENT_POOL.filter((m) => m.channel === `#${id}`).map((m) => ({ msg: m, ago: 'earlier' }))
}

// ---- Slack app — clickable channels + a TYPEABLE composer ----
function SlackApp() {
  const [active, setActive] = useState(MAIN_CHANNEL)
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState<Record<string, { msg: SlackTemplate; ago: string }[]>>({})
  const ch = SLACK_CHANNELS.find((c) => c.id === active) ?? SLACK_CHANNELS[0]
  const channelTitle = ch.dm ? ch.name : `# ${ch.name}`
  const feed = [...channelFeed(active), ...(sent[active] || [])]
  const send = () => {
    const t = draft.trim()
    if (!t) return
    setSent((s) => ({
      ...s,
      [active]: [...(s[active] || []), { msg: { npcId: 'leonard', npcName: 'Leonard (you)', channel: active, text: t }, ago: 'now' }],
    }))
    setDraft('')
  }
  return (
    <div className="h-full flex bg-white text-zinc-800 text-[12px]">
      {/* aubergine workspace sidebar */}
      <div className="w-32 shrink-0 flex flex-col text-white/90" style={{ background: '#5a1d6b' }}>
        <div className="px-3 py-2 font-bold text-[13px] text-white border-b border-white/10 flex items-center justify-between">
          Alignly <span className="opacity-60 text-[10px]">▾</span>
        </div>
        <div className="px-2 py-2 space-y-1 overflow-y-auto">
          <div className="opacity-80">🧵&nbsp; Threads</div>
          <div className="opacity-80">📨&nbsp; DMs</div>
          <div className="opacity-80">📌&nbsp; Activity</div>
          <div className="pt-2 text-[10px] uppercase tracking-wide text-white/40">Channels</div>
          {SLACK_CHANNELS.filter((c) => !c.dm).map((c) => (
            <button
              key={c.id}
              onClick={() => { deskSfx.click(); setActive(c.id) }}
              title={`# ${c.name}`}
              className={`block w-full text-left rounded px-1.5 py-0.5 truncate transition ${active === c.id ? 'bg-white/25 text-white font-semibold' : 'text-white/75 hover:bg-white/10'}`}
            >
              #&nbsp;{c.name}
            </button>
          ))}
          <div className="pt-2 text-[10px] uppercase tracking-wide text-white/40">Direct messages</div>
          {SLACK_CHANNELS.filter((c) => c.dm).map((c) => (
            <button
              key={c.id}
              onClick={() => { deskSfx.click(); setActive(c.id) }}
              className={`block w-full text-left rounded px-1.5 py-0.5 truncate transition ${active === c.id ? 'bg-white/25 text-white font-semibold' : 'text-white/75 hover:bg-white/10'}`}
            >
              {c.dot}&nbsp; {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* channel header */}
        <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-200 shrink-0">
          <div className="font-bold text-[13px] text-zinc-800 truncate pr-2">{channelTitle}</div>
          <div className="text-zinc-400 text-[11px] shrink-0">{ch.dm ? 'DM' : '👤 12'}</div>
        </div>
        {/* messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {feed.map(({ msg, ago }, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-7 h-7 rounded-md shrink-0" style={{ background: DOT[msg.npcId] ?? '#8a9499' }} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-zinc-800">{msg.npcName}</span>
                  <span className="text-zinc-400 text-[10px]">{ago}</span>
                </div>
                <div className="text-zinc-700 leading-snug">{msg.text}</div>
                {i === 1 && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px]">
                    ✅ <span className="text-zinc-500">2</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {feed.length === 0 && (
            <div className="text-zinc-400 text-[11px] italic px-1">Nothing here. Suspiciously quiet.</div>
          )}
        </div>
        {/* composer — actually typeable */}
        <div className="px-3 pb-3 shrink-0">
          <div className="rounded-lg border border-zinc-300 focus-within:border-zinc-400 overflow-hidden">
            <div className="flex items-center gap-3 px-2.5 py-1 border-b border-zinc-200 text-zinc-500 text-[13px] select-none">
              <b>B</b><i>I</i><s>S</s><span>🔗</span><span>☰</span><span className="font-mono text-[11px]">{'</>'}</span>
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); send() } else if (e.key.length === 1) deskSfx.key() }}
              placeholder={ch.dm ? `Message ${ch.name}` : `Message #${ch.name}`}
              className="w-full px-3 py-2 outline-none text-[13px] text-zinc-800 placeholder:text-zinc-400"
            />
            <div className="flex items-center justify-between px-2 py-1 text-zinc-400 text-[14px] select-none">
              <div className="flex items-center gap-3">＋ 😀 @</div>
              <button
                onClick={send}
                className="rounded px-2 py-0.5 text-[13px] font-bold transition"
                style={{ background: draft.trim() ? '#007a5a' : '#e8e8e8', color: draft.trim() ? '#fff' : '#aab' }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Spotify mock ----
function Spotify({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <div className="h-full flex flex-col bg-[#121212] text-white p-4">
      <div className="text-[11px] uppercase tracking-widest text-white/40 mb-3">Focus · Playlist</div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-24 h-24 rounded-md grid place-items-center text-4xl"
          style={{ background: 'linear-gradient(135deg,#1DB954,#0a6b2f)' }}>🎧</div>
        <div className="text-center">
          <div className="text-sm font-bold">lock_in.mp3</div>
          <div className="text-white/50 text-[11px]">Alignly Focus Beats</div>
        </div>
        {/* equalizer */}
        <div className="flex items-end gap-1 h-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="w-1.5 rounded-sm bg-[#1DB954]"
              style={{ height: playing ? `${6 + ((i * 7 + 9) % 14)}px` : '4px', animation: playing ? `eq 0.6s ${i * 0.12}s ease-in-out infinite alternate` : 'none' }} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-5 text-xl">
        <span className="opacity-40">⏮</span>
        <button onClick={() => { deskSfx.click(); onToggle() }} className="w-11 h-11 rounded-full bg-white text-black grid place-items-center text-lg hover:scale-105 transition">
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="opacity-40">⏭</span>
      </div>
      <div className="text-center text-white/30 text-[9px] mt-2">▸ add your own focus track later</div>
      <style>{`@keyframes eq{from{transform:scaleY(0.4)}to{transform:scaleY(1)}}`}</style>
    </div>
  )
}

// ---- News content (original dry corporate satire) ----
const NEWS_LEAD = {
  kicker: 'Mergers & Acquisitions',
  title: "Alignly to Acquire Rival in All-Stock Deal; 5,000 Roles Deemed 'Redundant to Synergy'",
  deck: 'Leadership calls the layoffs "a recommitment to our people" — in a memo to the people being recommitted away.',
  body: 'The combined entity will "unlock efficiencies," a spokesperson said, declining to specify which efficiencies, or for whom. Shares rose 4% on the announcement. The 5,000 affected were unavailable for comment, having lost badge access at 9 a.m.',
}
const NEWS_SIDE = [
  { kicker: 'Technology', title: 'AI Now Capable of Saying "Let\'s Circle Back," Imperiling Project Managers' },
  { kicker: 'Labor', title: 'More Layoffs at Big-Tech Firm; All-Hands Scheduled to Process the All-Hands' },
  { kicker: 'Workplace', title: 'Return-to-Office Mandate Cites "Collaboration"; Parking Lot Remains Empty' },
  { kicker: 'Markets', title: 'Stocks Rally After CEO Says the Word "Discipline" Eleven Times' },
]
const NEWS_MORE = [
  { title: 'Startup Raises $40M to Solve Problem Created by Its Last $40M Raise', deck: 'Investors "thrilled," unable to explain what it does.' },
  { title: 'Firm Renames Layoffs "Involuntary Career Pivots" to Boost Engagement', deck: 'Engagement falls to record low; renaming continues.' },
  { title: 'Study: 100% of Standups Could Have Been an Email', deck: 'Findings to be presented at a mandatory two-hour standup.' },
  { title: 'Leaked Memo: "We Are a Family." Family to Be Restructured in Q3', deck: 'Severance described internally as "a really special chapter."' },
  { title: 'Exec Who Coined "Do More With Less" Departs With More, Does Less', deck: 'Praised for "visionary bandwidth management."' },
  { title: 'New Productivity Tool Requires Three Meetings to Configure', deck: 'A fourth meeting added to align on the three meetings.' },
]
const TICKER = [
  ['ALGN', '▼ 2.3%', false], ['SYNRGY', '▲ 0.1%', true], ['MORALE', '▼ 12%', false],
  ['MEETINGS', '▲ 8.4%', true], ['SEVRNCE', '▲ 31%', true], ['PTO', '▼ 4.0%', false],
] as const

// ---- Chrome window: a tabbed browser (Jira board + a WSJ-style news tab) ----
function ChromeBrowser({ onEnter, focused, tab, onTab }: { onEnter: () => void; focused: boolean; tab: 'jira' | 'news'; onTab: (t: 'jira' | 'news') => void }) {
  const url = tab === 'jira'
    ? 'alignly.atlassian.net/jira/software/board · SPRINT 14'
    : 'capitalstreetjournal.com/markets'
  return (
    <div className="h-full flex flex-col bg-white text-zinc-800">
      {/* tab strip */}
      <div className="flex items-stretch gap-1 px-2 pt-1.5 bg-zinc-200/70 shrink-0">
        <BrowserTab active={tab === 'jira'} onClick={() => onTab('jira')} icon="📋" label="Jira — Sprint Board" />
        <BrowserTab active={tab === 'news'} onClick={() => onTab('news')} icon="📰" label="Capital Street Journal" dot />
        <span className="self-center px-2 text-zinc-400">＋</span>
      </div>
      {/* address bar */}
      <div className="h-8 px-2 flex items-center gap-2 bg-zinc-100 border-b border-zinc-200 shrink-0">
        <div className="flex gap-1.5 text-zinc-400 text-sm">‹ › ⟳</div>
        <div className="flex-1 bg-white border border-zinc-300 rounded-full px-3 py-1 text-[11px] text-zinc-500 truncate">🔒 {url}</div>
      </div>
      {tab === 'jira' ? <JiraBoard onEnter={onEnter} focused={focused} /> : <NewsPage />}
    </div>
  )
}

function BrowserTab({ active, onClick, icon, label, dot }: { active: boolean; onClick: () => void; icon: string; label: string; dot?: boolean }) {
  return (
    <button
      onClick={() => { deskSfx.click(); onClick() }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg max-w-[170px] text-[11px] transition ${active ? 'bg-white text-zinc-800 font-medium' : 'bg-zinc-300/50 text-zinc-500 hover:bg-zinc-300/80'}`}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
      {dot && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
    </button>
  )
}

// ---- Jira board (the entry to the run) ----
function JiraBoard({ onEnter, focused }: { onEnter: () => void; focused: boolean }) {
  const cols = ['To Do', 'In Progress', 'Done'] as const
  return (
    <>
      <div className="px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-400">ALIGN board</div>
          <div className="text-sm font-bold text-zinc-800">Sprint 14 · 4 tickets need an update</div>
        </div>
        <div className="text-[11px] font-bold px-2 py-1 rounded" style={{ background: '#0052cc', color: 'white' }}>Leonard P.</div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-3 gap-2 p-3 bg-[#f4f5f7]">
        {cols.map((col) => (
          <div key={col} className="flex flex-col gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 px-1">
              {col} {col !== 'Done' && <span className="text-zinc-400">({TICKETS.filter((t) => t.col === col).length})</span>}
            </div>
            {TICKETS.filter((t) => t.col === col).map((t) => (
              <div key={t.id} className="bg-white rounded border border-zinc-200 p-2 shadow-sm">
                <div className="text-[12px] leading-snug text-zinc-800 mb-1.5">{t.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-400">{t.id}</span>
                  <span className="text-[9px] text-amber-700 bg-amber-100 rounded px-1 font-semibold">NEEDS UPDATE</span>
                </div>
              </div>
            ))}
            {col === 'Done' && <div className="text-[11px] text-zinc-400 italic px-1 py-2">…nothing yet. that's the problem.</div>}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-zinc-500 leading-tight">
          <span className="font-semibold text-zinc-700">Updating all 4 means entering the board.</span><br />
          ← → move · ↑/SPACE jump · ↓ slide · grab ⭐ · dodge ⬛ walls
        </div>
        <button
          onClick={onEnter}
          className={`shrink-0 px-5 py-2.5 rounded font-bold text-sm text-white transition ${focused ? 'animate-pulse' : ''}`}
          style={{ background: '#0052cc' }}
        >
          ▶ Update tickets
        </button>
      </div>
    </>
  )
}

// ---- a fake "stock photo" of a glass tech HQ (CSS, copyright-safe; drop a
// real royalty-free photo into /public and use <img> to swap it) ----
function OfficePhoto() {
  const tower = (s: CSSProperties) => (
    <div
      className="absolute bottom-0"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 8px), repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 10px), linear-gradient(180deg, #7a9cb6, #2b4055)',
        ...s,
      }}
    />
  )
  return (
    <figure className="mb-2">
      <div
        className="relative w-full h-32 overflow-hidden border border-zinc-300"
        style={{ background: 'linear-gradient(180deg, #bcd4e6 0%, #dfeaf1 65%, #c7cfc6 100%)' }}
      >
        {tower({ left: '5%', width: '15%', height: '55%', opacity: 0.6 })}
        {tower({ left: '76%', width: '19%', height: '64%', opacity: 0.65 })}
        {tower({ left: '30%', width: '40%', height: '86%' })}
        <div className="absolute" style={{ left: '30%', width: '40%', bottom: 0, height: '13%', background: '#1f2d3a' }} />
        <div className="absolute text-white/85 font-black tracking-[0.2em]" style={{ left: '33%', bottom: '4.5%', fontSize: '9px' }}>ALIGNLY</div>
        <div className="absolute bottom-0 inset-x-0" style={{ height: '7%', background: '#9aa39a' }} />
      </div>
      <figcaption className="text-[9px] text-zinc-500 italic mt-0.5">
        Alignly's new headquarters — the synergy is load-bearing. (CSJ / stock)
      </figcaption>
    </figure>
  )
}

// ---- WSJ-style news page (parody masthead "Capital Street Journal") ----
function NewsPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fbfaf6] text-zinc-900" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* masthead */}
      <div className="text-center px-4 pt-3 pb-1.5 border-b-[3px] border-double border-zinc-900">
        <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Tuesday Edition · Late Capitalism</div>
        <div className="text-[30px] leading-none font-black tracking-tight">Capital Street Journal</div>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest text-zinc-500 border-t border-zinc-300 pt-1">
          <span>Markets</span>·<span>Business</span>·<span>Tech</span>·<span>Workplace</span>·<span>Opinion</span>
        </div>
      </div>
      {/* markets ticker */}
      <div className="flex gap-4 px-3 py-1 bg-zinc-900 text-white text-[10px] font-mono whitespace-nowrap overflow-hidden">
        {TICKER.map(([sym, chg, up]) => (
          <span key={sym}>{sym} <span className={up ? 'text-green-400' : 'text-red-400'}>{chg}</span></span>
        ))}
      </div>
      {/* front page */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="col-span-2 pr-4 border-r border-zinc-300">
          <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5">{NEWS_LEAD.kicker}</div>
          <h1 className="text-[21px] leading-[1.1] font-black mb-1.5">{NEWS_LEAD.title}</h1>
          <div className="text-[12px] italic text-zinc-600 mb-2 leading-snug">{NEWS_LEAD.deck}</div>
          <OfficePhoto />
          <p className="text-[11px] leading-snug text-zinc-700 text-justify">{NEWS_LEAD.body}</p>
        </div>
        <div className="space-y-2.5">
          {NEWS_SIDE.map((h, i) => (
            <div key={i} className="border-b border-zinc-200 pb-2 last:border-0">
              <div className="text-[9px] uppercase tracking-widest text-zinc-400">{h.kicker}</div>
              <div className="text-[13px] font-bold leading-tight">{h.title}</div>
            </div>
          ))}
        </div>
      </div>
      {/* more headlines */}
      <div className="px-4 pb-5 grid grid-cols-3 gap-4 border-t border-zinc-300 pt-3">
        {NEWS_MORE.map((h, i) => (
          <div key={i} className="border-b border-zinc-100 pb-2">
            <div className="text-[12px] font-bold leading-tight mb-0.5">{h.title}</div>
            <div className="text-[10px] text-zinc-500 italic leading-snug">{h.deck}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
