// Two-beat intro flow:
//   Beat 1: Slack DM popup from Exec (corporate buzzwords).
//           Click / space / enter dismisses to Beat 2.
//   Beat 2: Jira Epic detail page for CHP-200 Customer Happiness Portal
//           Refresh — full project brief, linked stakeholder tickets,
//           sidebar with Owner / Sprint / Status / controls, and the
//           "Start sprint →" CTA that enters the game.
//
// Audio: audio.start() fires on the very first user gesture (clicking
// through the Slack DM), satisfying browser autoplay policy. The Slack
// knock plays on dismissal of the DM since that's a "notification cleared"
// moment.
//
// Tickets data is shared with the Sprint Retrospective ending so the
// same 5 stakeholders move across the board based on what happens.

import { useEffect, useState } from 'react'
import { useGameStore } from '../state/gameStore'
import { audio } from '../audio/AudioManager'
import { EPIC, TICKETS } from '../content/tickets'

const FADE_OUT_MS = 500

type Step = 0 | 1 // 0 = Slack DM, 1 = Jira Epic page

export function IntroScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const [step, setStep] = useState<Step>(0)
  const [fading, setFading] = useState(false)

  const advance = () => {
    if (fading) return
    audio.start()
    if (step === 0) {
      // Slack DM dismiss → Jira Epic page. Play the knock as if the user
      // just clicked the notification.
      audio.play('slack')
      setStep(1)
      return
    }
    // Already on the Jira page; pressing space/enter here also starts.
    enter()
  }

  const enter = () => {
    if (fading) return
    audio.start()
    setFading(true)
    setTimeout(() => startGame(), FADE_OUT_MS)
  }

  // Space / Enter advances both beats; the explicit "Start sprint" button
  // on the Jira page also fires enter().
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, fading])

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-[500ms] ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {step === 0 ? (
        <SlackDMScreen onDismiss={advance} />
      ) : (
        <JiraEpicScreen onStart={enter} />
      )}
    </div>
  )
}

// ============================================================
//  Beat 1: Slack DM from Exec
// ============================================================

function SlackDMScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className="absolute inset-0 flex items-center justify-center bg-ink-900 cursor-pointer p-6"
    >
      <div
        className="w-full max-w-4xl bg-[#1a1d21] border border-[#383a40] rounded-md shadow-2xl overflow-hidden flex flex-col"
        style={{ height: 560 }}
      >
        {/* Top app bar — workspace name + DM title + active indicator */}
        <div className="flex items-stretch bg-[#19171d] border-b border-[#383a40] flex-shrink-0">
          {/* Workspace switcher column (top icon) */}
          <div className="w-12 flex items-center justify-center py-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-[#4a154b] flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
          </div>
          {/* Workspace name */}
          <div
            className="flex items-center gap-1.5 px-4 border-r border-[#383a40] flex-shrink-0"
            style={{ width: 220 }}
          >
            <span className="text-white text-sm font-bold">alignly</span>
            <span className="text-[#abadb1] text-[10px]">▾</span>
          </div>
          {/* Channel/DM title bar */}
          <div className="flex items-center gap-2 px-4 flex-1 min-w-0">
            <span className="text-[#abadb1] text-base">@</span>
            <div className="text-[#d1d2d3] text-sm font-bold truncate">Exec</div>
            <span className="text-[#2ebb77] text-[10px]">●</span>
            <span className="text-[#abadb1] text-xs">Active</span>
            <div className="ml-auto text-[#abadb1] text-xs flex-shrink-0">
              Wed 8:58 AM
            </div>
          </div>
        </div>

        {/* Body: workspace switcher + sidebar + main pane */}
        <div className="flex flex-1 min-h-0">
          {/* Workspace switcher column — 2 stacked icons */}
          <div className="w-12 bg-[#19171d] border-r border-[#383a40] flex flex-col items-center py-2 gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-[#4a154b] flex items-center justify-center text-white font-bold text-sm ring-2 ring-white">
              A
            </div>
            <div className="w-8 h-8 rounded-md bg-[#1a1d21] border border-[#383a40] flex items-center justify-center text-[#abadb1] text-base">
              +
            </div>
          </div>

          {/* Channels + DMs sidebar */}
          <div
            className="bg-[#19171d] border-r border-[#383a40] py-3 px-2 flex-shrink-0 overflow-y-auto"
            style={{ width: 220 }}
          >
            <SidebarSection label="Channels">
              <SidebarItem prefix="#" text="general" unread />
              <SidebarItem prefix="#" text="engineering" />
              <SidebarItem prefix="#" text="design" />
              <SidebarItem prefix="#" text="random" />
              <SidebarItem prefix="#" text="alignment-ops" />
            </SidebarSection>
            <SidebarSection label="Direct messages" className="mt-3">
              <SidebarItem prefix="●" prefixColor="#2ebb77" text="Exec" active />
              <SidebarItem prefix="○" text="Brent" />
              <SidebarItem prefix="○" text="Tasha" />
              <SidebarItem prefix="○" text="Priya" />
              <SidebarItem prefix="○" text="Chad" />
              <SidebarItem prefix="○" text="Diane (HR)" />
            </SidebarSection>
          </div>

          {/* Main DM pane */}
          <div className="flex-1 flex flex-col bg-[#1a1d21] min-w-0">
            {/* "Today" divider */}
            <div className="flex items-center gap-3 px-5 pt-3 flex-shrink-0">
              <div className="flex-1 border-t border-[#383a40]" />
              <div className="text-[#abadb1] text-[11px] font-semibold px-2 py-0.5 border border-[#383a40] rounded-full bg-[#19171d]">
                Today
              </div>
              <div className="flex-1 border-t border-[#383a40]" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded bg-[#4a154b] flex items-center justify-center text-[#f1f1f1] text-sm font-bold flex-shrink-0">
                  E
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-white text-[15px] font-bold">
                      Exec
                    </span>
                    <span className="text-[#abadb1] text-[11px]">8:58 AM</span>
                  </div>
                  <div className="text-[#d1d2d3] text-[14px] leading-relaxed space-y-2">
                    <p>Hey 👋 standup&apos;s at 10:15. Before then, three quick things:</p>
                    <ul className="space-y-0.5 pl-1">
                      <li>• Sync 1:1 with all 5 stakeholders.</li>
                      <li>• Surface — and clear — any blockers.</li>
                      <li>• Keep project status <span className="font-bold text-[#2ebb77]">GREEN</span>.</li>
                    </ul>
                    <p>There are no blockers, to be clear. Please confirm there are no blockers.</p>
                    <p className="text-[#f4b800]">Non-negotiable. Thx! 🙏</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pl-12 text-[#abadb1] text-xs italic">
                Exec is typing…
              </div>
            </div>

            {/* Message input (decorative — never actually used) */}
            <div className="px-3 pb-3 flex-shrink-0">
              <div className="bg-[#222529] border border-[#565856] rounded-md px-3 py-2 text-[#abadb1] text-sm flex items-center gap-2">
                <span className="text-base">+</span>
                <span className="flex-1">Message Exec</span>
                <span className="text-[#565856] text-[11px]">⏎</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 text-beige-300 text-xs font-mono tracking-wider opacity-70">
        space · enter · click to continue
      </div>
    </div>
  )
}

// Slack sidebar "Channels" / "Direct messages" group with collapsing chevron.
function SidebarSection({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1 px-2 mb-0.5 text-[#abadb1] text-[11px]">
        <span>▾</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

// Single channel or DM row in the sidebar.
function SidebarItem({
  prefix,
  prefixColor,
  text,
  active = false,
  unread = false,
}: {
  prefix: string
  prefixColor?: string
  text: string
  active?: boolean
  unread?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center gap-2 px-2 py-1 rounded text-[13px] cursor-default',
        active
          ? 'bg-[#1164a3] text-white font-medium'
          : unread
          ? 'text-white font-medium'
          : 'text-[#abadb1]',
      ].join(' ')}
    >
      <span
        className="text-[12px] w-3 text-center flex-shrink-0"
        style={prefixColor ? { color: prefixColor } : undefined}
      >
        {prefix}
      </span>
      <span className="truncate">{text}</span>
      {unread && (
        <span className="ml-auto w-4 h-4 rounded-full bg-[#cd2553] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          3
        </span>
      )}
    </div>
  )
}

// ============================================================
//  Beat 2: Jira Epic detail page
// ============================================================

function JiraEpicScreen({ onStart }: { onStart: () => void }) {
  // Story points total — small flavor calc, still used in the title bar.
  const totalPoints = TICKETS.reduce((sum, t) => sum + t.storyPoints, 0)

  // Single-column, centered layout. The previous version had a 2-column
  // dashboard feel with a wide Linked Issues table — now everything stacks
  // in a narrow max-w-2xl container so the briefing reads as a focused
  // mission card, not a project management dashboard.
  return (
    <div className="absolute inset-0 bg-[#f4f5f7] text-[#172b4d] flex flex-col overflow-hidden">
      <JiraNav />

      {/* Header strip — breadcrumb + title + status pills */}
      <div className="px-6 pt-3 pb-2 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="text-[12px] text-[#5e6c84]">
            Projects › {EPIC.title} › <span className="text-[#172b4d]">{EPIC.key}</span>
          </div>
          <div className="flex items-baseline gap-3 mt-0.5 flex-wrap">
            <span className="text-[#42526e] text-base" title="Epic">
              ⚡
            </span>
            <h1 className="text-[20px] font-semibold text-[#172b4d]">
              {EPIC.title}
            </h1>
            <span className="text-[12px] text-[#5e6c84] font-mono">
              {EPIC.key}
            </span>
            <span className="ml-1 flex items-center gap-2">
              <StatusPill label="In Progress" tone="progress" />
              <StatusPill label="🟢 GREEN" tone="done" />
              <span className="text-[12px] text-[#5e6c84]">· {totalPoints} pts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Single-column centered body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-3 pt-1">
          {/* Mission card — the only thing you actually need to know */}
          <div className="bg-white border border-[#dfe1e6] rounded p-4 text-[13px] leading-snug">
            <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] uppercase tracking-widest text-[#5e6c84]">Phase 1 of 3</span>
              <span className="text-[14px] font-semibold text-[#172b4d]">Pre-Standup Alignment</span>
            </div>
            <p className="text-[#42526e]">
              Sync all 5 stakeholders before the 10:15 standup. Don&apos;t walk in with surprises.
              Don&apos;t walk in with the truth, either. Find the third option.
            </p>
            <div className="mt-2 px-2.5 py-1.5 rounded bg-[#e3fcef] border border-[#abf5d1] text-[12px] flex items-start gap-2">
              <span className="leading-none mt-0.5 text-[#006644]">◎</span>
              <div className="text-[#172b4d]">
                <span className="text-[#006644] font-semibold">Goal:</span>{' '}
                Talk to all 5. Keep your meters out of the red.
              </div>
            </div>
          </div>

          {/* Controls — one compact line */}
          <div className="bg-white border border-[#dfe1e6] rounded px-3 py-2 text-[12px] font-mono text-[#42526e] flex flex-wrap gap-x-4 gap-y-1">
            <span><span className="text-[#5e6c84]">W S</span> move</span>
            <span><span className="text-[#5e6c84]">A D</span> turn</span>
            <span><span className="text-[#5e6c84]">E</span> talk</span>
            <span><span className="text-[#5e6c84]">1–4</span> choose</span>
          </div>

          {/* CTA */}
          <div>
            <button
              onClick={onStart}
              className="w-full px-4 py-3 rounded bg-[#0052cc] text-white text-[14px] font-medium hover:bg-[#0747a6] transition shadow-sm"
            >
              Start sprint →
            </button>
            <div className="text-center mt-1.5 text-[11px] text-[#5e6c84]">
              space · enter · click button
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Reused Atlassian-style helpers ----

function JiraNav() {
  return (
    <div className="flex items-center gap-4 px-4 h-12 bg-white border-b border-[#dfe1e6]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[#0052cc] text-white flex items-center justify-center text-xs font-bold">
          A
        </div>
        <span className="text-[#172b4d] text-sm font-semibold">Alignly</span>
      </div>
      <div className="hidden md:flex items-center gap-4 text-[13px] text-[#42526e]">
        <span className="hover:text-[#172b4d] cursor-default">Your work</span>
        <span className="hover:text-[#172b4d] cursor-default">Projects</span>
        <span className="hover:text-[#172b4d] cursor-default">Filters</span>
        <span className="hover:text-[#172b4d] cursor-default">Dashboards</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:block px-3 py-1 rounded border border-[#dfe1e6] text-[13px] text-[#5e6c84] bg-white">
          Search
        </div>
        <div className="w-7 h-7 rounded-full bg-[#0052cc] text-white flex items-center justify-center text-[11px] font-bold">
          LC
        </div>
      </div>
    </div>
  )
}


type StatusTone = 'progress' | 'done' | 'todo' | 'blocked'
const STATUS_STYLE: Record<StatusTone, { bg: string; fg: string }> = {
  progress: { bg: '#deebff', fg: '#0747a6' },
  done: { bg: '#e3fcef', fg: '#006644' },
  todo: { bg: '#dfe1e6', fg: '#42526e' },
  blocked: { bg: '#ffebe6', fg: '#bf2600' },
}

function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const s = STATUS_STYLE[tone]
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {label}
    </span>
  )
}


