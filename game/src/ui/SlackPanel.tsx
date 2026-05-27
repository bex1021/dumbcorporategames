// Collapsible right-side Slack panel. Two pieces:
//   1. A Slack-style "S" badge fixed to the right edge with unread count.
//   2. A sliding panel that slides in from the right when toggled.
//
// Content is the slackMessages feed in the store — populated by:
//   - startGame() (STARTER_PINGS)
//   - the AmbientSlackTicker (random ambient chatter every 25-45s)
//   - markHandled() (delayed-effect notifications, isDelayed=true)
//
// Doesn't lock PM movement when open (per user direction). Sits at z-30 —
// above the HUD/CopingBar (z-20) but below DialoguePanel/RecoveryPanel (z-40)
// so a dialogue properly covers the Slack panel.

import { NPCS } from '../config/constants'
import { useGameStore, type SlackMessage } from '../state/gameStore'

// NPC ids to chest-badge colors. We reuse the existing NPCS palette so the
// Slack avatar color matches the in-world chest badge.
function npcColor(npcId: string): string {
  if (npcId === 'system') return '#6b7280' // slate
  if (npcId === 'exec') return '#4a154b' // Slack-purple, for the Exec
  const npc = NPCS.find((n) => n.id === npcId)
  return npc?.color ?? '#888'
}

function npcInitial(name: string): string {
  return name.slice(0, 1).toUpperCase()
}

// Convert epoch ms → "5m ago" / "just now" / "32m ago"
function relativeTime(ms: number): string {
  const ageS = Math.floor((Date.now() - ms) / 1000)
  if (ageS < 30) return 'just now'
  if (ageS < 60) return '<1m ago'
  if (ageS < 3600) return `${Math.floor(ageS / 60)}m ago`
  return `${Math.floor(ageS / 3600)}h ago`
}

export function SlackPanel() {
  const messages = useGameStore((s) => s.slackMessages)
  const open = useGameStore((s) => s.slackOpen)
  const unread = useGameStore((s) => s.unreadSlack)
  const toggle = useGameStore((s) => s.toggleSlack)
  const phase = useGameStore((s) => s.phase)

  if (phase !== 'playing') return null

  return (
    <>
      {/* Floating "S" toggle button on the right edge */}
      <button
        onClick={toggle}
        className={`fixed top-1/2 -translate-y-1/2 z-30 transition-all flex items-center justify-center w-11 h-11 rounded-l-lg shadow-lg border border-r-0 ${
          open
            ? 'right-[380px] bg-[#222529] border-[#383a40]'
            : 'right-0 bg-[#4a154b] border-[#6b3a6c] hover:bg-[#5b1f5d]'
        }`}
        title={open ? 'Hide Slack' : 'Show Slack'}
        aria-label={open ? 'Hide Slack' : 'Show Slack'}
      >
        <span className="text-white text-lg font-black leading-none">S</span>
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-ink-900">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Sliding panel. Width caps at 380px desktop but shrinks to viewport
          on narrow screens so it doesn't blanket the whole game on mobile.
          Audit caught it covering the entire <640px viewport when open. */}
      <div
        className={`fixed top-0 right-0 h-full w-[min(380px,92vw)] z-30 bg-[#1a1d21] border-l border-[#383a40] shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#383a40] bg-[#222529] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-[#d1d2d3] text-sm font-semibold">Alignly</div>
            <div className="text-[#abadb1] text-[11px]">All channels</div>
          </div>
          <button
            onClick={toggle}
            className="text-[#abadb1] hover:text-[#d1d2d3] text-lg leading-none px-2"
            aria-label="Close Slack"
          >
            ✕
          </button>
        </div>

        {/* Messages feed — auto-scrolls newest into view via flex-col-reverse trick. */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <div className="text-[#abadb1] text-sm italic text-center mt-8">
              No messages yet. The day hasn&apos;t started getting weird.
            </div>
          ) : (
            messages.map((m) => <MessageRow key={m.id} msg={m} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#383a40] bg-[#222529] text-[#abadb1] text-[11px] flex-shrink-0">
          {messages.length} messages · {unread} unread
        </div>
      </div>
    </>
  )
}

function MessageRow({ msg }: { msg: SlackMessage }) {
  const color = npcColor(msg.npcId)
  const initial = npcInitial(msg.npcName)
  return (
    <div
      className={`flex items-start gap-2.5 px-2 py-1.5 rounded ${
        msg.isDelayed ? 'bg-amber-900/20 border border-amber-700/30' : ''
      }`}
    >
      {/* Avatar — colored square with initial */}
      <div
        className="w-9 h-9 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[#d1d2d3] text-sm font-semibold">{msg.npcName}</span>
          <span className="text-[#abadb1] text-[10px]">{msg.channel}</span>
          <span className="text-[#abadb1] text-[10px] ml-auto">
            {relativeTime(msg.timestamp)}
          </span>
        </div>
        <div className="text-[#d1d2d3] text-[13px] leading-snug mt-0.5 break-words whitespace-pre-line">
          {msg.text}
        </div>
      </div>
    </div>
  )
}
