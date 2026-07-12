// src/routes/Play.tsx — the campaign hub / level select (/play)
//
// An in-game "Alignly" screen (jira-board *inspired*, not the marketing site):
// a left-to-right PROGRESSION track — completed phases on the left, the one
// you're on next, then what's locked ahead, like a game's level path — plus a
// showcase of every achievement collected across both games.
//
// Level cards are intentionally light placeholders for now; the per-phase
// detail can be filled in later. The linear unlock gating and the "keep what's
// next a surprise" reveal (only the opener + cleared phases show their name)
// are unchanged from before.

import { Link } from 'react-router-dom'
import {
  CAMPAIGN,
  loadBeaten,
  isUnlocked,
  phaseLabel,
  type CampaignPhase,
  type PhaseId,
} from '../state/progress'
import { ACHIEVEMENTS, loadUnlocked } from '../content/achievements'
import { JR_ACHIEVEMENTS_CATALOG, loadJRUnlocked } from '../content/jrAchievements'
import { HrFileCode } from '../ui/HrFileCode'

type Tone = 'cleared' | 'current' | 'locked' | 'soon'

function toneOf(p: CampaignPhase, beaten: Set<PhaseId>): Tone {
  if (beaten.has(p.id)) return 'cleared'
  if (!isUnlocked(p, beaten)) return 'locked'
  if (p.route === null) return 'soon'
  return 'current'
}

export default function Play() {
  // Client-only SPA — reading localStorage at first render is safe and shows a
  // just-won phase/achievement immediately on return.
  const beaten = loadBeaten()
  const clearedCount = CAMPAIGN.filter((p) => beaten.has(p.id)).length

  const p1Earned = loadUnlocked()
  const p2Earned = loadJRUnlocked()
  const totalEarned = p1Earned.size + p2Earned.size
  const totalAchv = ACHIEVEMENTS.length + JR_ACHIEVEMENTS_CATALOG.length

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] text-[#172b4d] flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* ── Alignly top bar (in-game, not the studio site) ── */}
      <nav className="flex items-center justify-between px-4 sm:px-6 h-12 bg-white border-b border-[#dfe1e6] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-[5px] grid place-items-center text-white text-[13px] font-black" style={{ background: '#5e9a96' }}>A</span>
          <span className="font-semibold text-[15px]">Alignly</span>
          <span className="text-[#5e6c84] text-[13px] hidden sm:inline">· Career</span>
        </div>
        <div className="flex items-center gap-3 text-[#5e6c84]">
          <span className="text-[12px] hidden sm:inline">Probity · Verve · Wit</span>
          {/* LP = Leonard P. (canonical initials — matches his Jira assignee name) */}
          <span className="w-7 h-7 rounded-full grid place-items-center text-white text-[11px] font-bold" style={{ background: '#2a2f33' }}>LP</span>
        </div>
      </nav>

      {/* ── Header ── */}
      <div className="px-4 sm:px-6 pt-4 pb-3 flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="text-[12px] text-[#5e6c84]">Projects › Blocked › Career path</div>
          <div className="flex items-end justify-between gap-3 flex-wrap mt-1">
            <div>
              <h1 className="text-[24px] font-semibold leading-tight">Your onboarding path</h1>
              <p className="text-[13px] text-[#5e6c84] mt-0.5">Clear a phase to unlock the next. Cleared phases replay any time.</p>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider" style={{ background: '#e3fcef', color: '#006644', border: '1px solid #abf5d1' }}>
              {clearedCount} / {CAMPAIGN.length} phases shipped
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* ── PROGRESSION TRACK — done on the left → locked on the right ── */}
          <div className="flex items-stretch overflow-x-auto pb-3 pt-1">
            {CAMPAIGN.map((p, i) => {
              const tone = toneOf(p, beaten)
              return (
                <div key={p.id} className="flex items-stretch">
                  <PhaseNode phase={p} tone={tone} beaten={beaten} />
                  {i < CAMPAIGN.length - 1 && <Connector done={beaten.has(p.id)} />}
                </div>
              )
            })}
          </div>

          {/* ── ACHIEVEMENTS SHOWCASE ── */}
          <div className="mt-9">
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="text-[17px] font-semibold">Achievements</h2>
              <span className="text-[12px] text-[#5e6c84]">{totalEarned} / {totalAchv} collected</span>
            </div>
            <AchvGroup
              label="Pre-Standup Alignment"
              items={ACHIEVEMENTS.map((a) => ({ id: a.id, emoji: a.emoji, title: a.title, earned: p1Earned.has(a.id) }))}
            />
            <div className="mt-5">
              <AchvGroup
                label="Jira Run"
                items={JR_ACHIEVEMENTS_CATALOG.map((a) => ({ id: a.id, emoji: a.emoji, title: a.title, earned: p2Earned.has(a.id) }))}
              />
            </div>
          </div>

          {/* Export/import the whole day as one code — so "saves to this
              browser" no longer means "dies with a cookie clear." */}
          <HrFileCode />

          <p className="mt-7 text-[11px] text-[#5e6c84]">
            Progress saves to this browser · no account · back it up above before clearing cookies.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── One node on the progression track (placeholder level card) ──────────────
function PhaseNode({ phase, tone, beaten }: { phase: CampaignPhase; tone: Tone; beaten: Set<PhaseId> }) {
  // Reveal the name of cleared phases, the opener, AND the one you can play
  // right now (so the next step is obvious). Only truly locked/unbuilt phases
  // ahead stay a "???" surprise.
  const reveal = beaten.has(phase.id) || phase.requires === null || tone === 'current'
  const title = reveal ? phase.title : '???'
  const playable = tone === 'cleared' || tone === 'current'
  const dim = tone === 'locked' || tone === 'soon'
  const accent = tone === 'cleared' ? '#36b37e' : tone === 'current' ? '#0052cc' : '#c1c7d0'

  const card = (
    <div
      className={[
        'w-[210px] flex-shrink-0 rounded-lg bg-white border p-4 flex flex-col items-center text-center transition',
        playable ? 'hover:shadow-md cursor-pointer' : '',
        dim ? 'opacity-90' : '',
      ].join(' ')}
      style={{ borderColor: tone === 'current' ? '#0052cc' : '#dfe1e6', borderWidth: tone === 'current' ? 2 : 1 }}
    >
      {/* level chip */}
      <div className="flex items-center justify-between w-full text-[11px] font-medium text-[#5e6c84]">
        <span>ALGN-{phase.n}</span>
        <StatusPill tone={tone} />
      </div>

      {/* big phase number / status medallion */}
      <div
        className="mt-3 w-16 h-16 rounded-full grid place-items-center text-[26px] font-black"
        style={{ background: tone === 'cleared' ? '#e3fcef' : tone === 'current' ? '#deebff' : '#ebecf0', color: accent }}
      >
        {tone === 'cleared' ? '✓' : tone === 'locked' ? '🔒' : tone === 'soon' ? '🛠' : phase.n}
      </div>

      <div className={`mt-3 text-[15px] font-semibold leading-snug ${dim ? 'text-[#5e6c84]' : ''}`}>{title}</div>
      <div className="text-[10px] uppercase tracking-wider text-[#5e6c84] mt-0.5">{phase.label}</div>

      {/* action */}
      <div className="mt-3 w-full">
        {tone === 'current' && (
          <span className="block w-full py-1.5 rounded text-[13px] font-semibold text-white" style={{ background: '#0052cc' }}>
            {reveal ? '▶ Play' : '▶ Proceed'}
          </span>
        )}
        {tone === 'cleared' && (
          <span className="block w-full py-1.5 rounded text-[13px] font-semibold border" style={{ borderColor: '#dfe1e6', color: '#0052cc' }}>
            ↻ Replay
          </span>
        )}
        {tone === 'locked' && (
          <span className="block text-[11px] text-[#5e6c84]">Beat {phase.requires ? phaseLabel(phase.requires) : ''} to unlock</span>
        )}
        {tone === 'soon' && <span className="block text-[11px] text-[#5e6c84]">Coming soon</span>}
      </div>
    </div>
  )

  return playable && phase.route ? (
    <Link to={phase.route} className="block no-underline text-inherit">{card}</Link>
  ) : (
    card
  )
}

function Connector({ done }: { done: boolean }) {
  return (
    <div className="flex-shrink-0 self-center w-7 sm:w-10 flex items-center" aria-hidden>
      <div
        className="w-full h-[3px] rounded-full"
        style={{ background: done ? '#36b37e' : '#c1c7d0', opacity: done ? 1 : 0.6 }}
      />
    </div>
  )
}

function StatusPill({ tone }: { tone: Tone }) {
  const map: Record<Tone, { label: string; bg: string; fg: string }> = {
    cleared: { label: 'Done', bg: '#e3fcef', fg: '#006644' },
    current: { label: 'Now', bg: '#deebff', fg: '#0747a6' },
    locked: { label: 'Locked', bg: '#dfe1e6', fg: '#5e6c84' },
    soon: { label: 'Backlog', bg: '#dfe1e6', fg: '#5e6c84' },
  }
  const s = map[tone]
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

// ─── Achievement showcase group ──────────────────────────────────────────────
type AchvItem = { id: string; emoji: string; title: string; earned: boolean }

function AchvGroup({ label, items }: { label: string; items: AchvItem[] }) {
  const earned = items.filter((a) => a.earned).length
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#5e6c84]">{label}</span>
        <span className="text-[11px] text-[#5e6c84]">{earned}/{items.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {items.map((a) => (
          <div
            key={a.id}
            title={a.earned ? a.title : 'Locked — earn it in-game'}
            className="rounded-lg border p-2.5 flex flex-col items-center text-center transition"
            style={
              a.earned
                ? { background: '#fff7d6', borderColor: '#f5cd47' }
                : { background: '#f4f5f7', borderColor: '#dfe1e6' }
            }
          >
            <span className="text-[22px]" style={{ filter: a.earned ? 'none' : 'grayscale(1)', opacity: a.earned ? 1 : 0.45 }}>
              {a.emoji}
            </span>
            <span className={`mt-1 text-[10px] leading-tight font-medium ${a.earned ? 'text-[#172b4d]' : 'text-[#5e6c84]'}`}>
              {a.earned ? a.title : 'Locked'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
