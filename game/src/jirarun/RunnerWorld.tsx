// Jira Run — the in-Canvas world + game loop.
//
// Forward auto-run (Leonard.z increases), behind-the-back camera, 3-lane
// dodge + jump + slide, obstacle spawn/cull, collision → death, Kanban
// BOARD gates → deposit an update + level up. Per-frame state lives in a
// single ref (G) so we never churn React; React state holds only the
// rendered obstacle list (updated a few times/sec on spawn/cull).

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { AnimationClip } from 'three'
import { LANES, TOKEN_Y, PAL, LEVEL_DISTANCE, runwayForLevel, isMovingOverhang, bannerSweepX, type Obstacle, type ObstacleKind, type Token } from './runnerConfig'
import { Sim, multForCombo, type DeathCause } from './simulation'

const LEONARD_URL = '/models/Player_Idle.glb' // hosts the mesh we render
const RUN_URL = '/models/Player_run.glb' // real Mixamo running clip (anim-only, ~73KB)
const JUMP_URL = '/models/Player_jump.glb' // real Mixamo running-jump clip (anim-only)
useGLTF.preload(LEONARD_URL)
useGLTF.preload(RUN_URL)
useGLTF.preload(JUMP_URL)
// Real run clip now — slight speed-up so the stride cadence reads at game
// pace (we drive forward motion ourselves; this is purely cosmetic tempo).
const RUN_TIMESCALE = 1.2

// Shared jump signal: the game loop sets this each frame from grounded
// state; LeonardModel reads it to crossfade Run ↔ Jump. Module-level mutable
// (same pattern as playerState) so we don't thread props through Suspense.
const runnerAnim = { jumping: false, z: 0 }

// ─────────────────────────────────────────────────────────────────────────
// 8-bit corporate hellscape — COSMETIC backdrop + obstacle labels only.
// Nothing here touches the rules engine (simulation.ts); collisions and
// difficulty are unchanged. Three layers tile forward like the floor:
//   · BurndownSkyline   — far horizon: bar-graph "buildings" that go UP
//   · BackdropCards      — mid parallax: giant drifting Jira ticket cards
//   · FloorRungs         — near: transverse board-cell lines (speed sense)
// plus satirical labels stamped on the obstacles.
//
// All flat sign/card planes are rotated π about Y to face the behind-camera
// (which looks toward +Z); their canvas textures are pre-mirrored (repeat.x
// = -1 about center) so the text still reads left-to-right.
// ─────────────────────────────────────────────────────────────────────────

function makeTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Draws wrapped text and returns the number of lines rendered.
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number): number {
  const words = text.split(' ')
  let line = ''
  let lines = 0
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lh)
      line = words[i]
      lines++
      if (lines >= maxLines - 1) {
        // last allowed line — dump the remainder, trimmed with an ellipsis
        let rest = words.slice(i).join(' ')
        while (ctx.measureText(rest + '…').width > maxW && rest.length) rest = rest.slice(0, -1)
        ctx.fillText(rest + (rest.length < words.slice(i).join(' ').length ? '…' : ''), x, y + lines * lh)
        return lines + 1
      }
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, y + lines * lh)
  return lines + 1
}

// ---- Floating Jira cards (mid parallax layer) ----
type CardDef = { key: string; title: string; status: 'BLOCKED' | 'AT RISK' | 'ON TRACK'; pts: number }
const STATUS_COLOR: Record<CardDef['status'], string> = {
  BLOCKED: '#de350b', 'AT RISK': '#ffab00', 'ON TRACK': '#36b37e',
}
const TICKET_CARDS: CardDef[] = [
  { key: 'ALN-1842', title: "Define 'Premium'", status: 'BLOCKED', pts: 8 },
  { key: 'ALN-1847', title: 'Dedupe the deduplication logic', status: 'AT RISK', pts: 13 },
  { key: 'ALN-1850', title: 'Make the design "pop"', status: 'AT RISK', pts: 5 },
  { key: 'ALN-1851', title: 'Thursday demo → "target state"', status: 'BLOCKED', pts: 21 },
  { key: 'ALN-1863', title: 'Circle back re: synergy', status: 'ON TRACK', pts: 3 },
  { key: 'ALN-1871', title: 'Align on the alignment', status: 'BLOCKED', pts: 8 },
  { key: 'ALN-1888', title: 'Q3 OKR pre-sync (recurring)', status: 'AT RISK', pts: 2 },
  { key: 'ALN-1902', title: 'Boil the ocean (spike)', status: 'ON TRACK', pts: 40 },
]

function drawCard(ctx: CanvasRenderingContext2D, card: CardDef) {
  const W = 256, H = 168
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = STATUS_COLOR[card.status]; ctx.fillRect(0, 0, 12, H) // left status stripe
  ctx.strokeStyle = '#c1c7d0'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  // ticket key
  ctx.fillStyle = '#5e6c84'
  ctx.font = 'bold 22px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(card.key, 26, 16)
  // title (≤2 lines)
  ctx.fillStyle = '#172b4d'
  ctx.font = 'bold 25px "Helvetica Neue", Arial, sans-serif'
  wrapText(ctx, card.title, 26, 50, W - 44, 30, 2)
  // status pill
  const pillY = H - 44
  ctx.fillStyle = STATUS_COLOR[card.status]; ctx.fillRect(26, pillY, 150, 30)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 17px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.status, 36, pillY + 16)
  // points chip
  ctx.fillStyle = '#dfe1e6'
  ctx.beginPath(); ctx.arc(W - 36, H - 28, 22, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#172b4d'
  ctx.font = 'bold 22px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(card.pts), W - 36, H - 28)
}

let _cardTex: THREE.Texture[] | null = null
function cardTextures(): THREE.Texture[] {
  if (!_cardTex) _cardTex = TICKET_CARDS.map((c) => makeTex(256, 168, (ctx) => drawCard(ctx, c)))
  return _cardTex
}

// ---- Obstacle labels (the satire, stamped on each hazard) ----
function drawLabel(ctx: CanvasRenderingContext2D, text: string) {
  const W = 512, H = 96
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(9,30,66,0.88)'; ctx.fillRect(6, 16, W - 12, 64) // navy plaque
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(6, 16, W - 12, 64)
  let fs = 42
  ctx.font = `bold ${fs}px "IBM Plex Mono", ui-monospace, monospace`
  while (ctx.measureText(text).width > W - 48 && fs > 16) {
    fs -= 2; ctx.font = `bold ${fs}px "IBM Plex Mono", ui-monospace, monospace`
  }
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, 48)
}

const _labelTex: Record<string, THREE.Texture> = {}
function labelTexture(text: string): THREE.Texture {
  if (!_labelTex[text]) _labelTex[text] = makeTex(512, 96, (ctx) => drawLabel(ctx, text))
  return _labelTex[text]
}

// ---- Slack messages (the "got a sec? / quick sync" jump-blocks) ----
type SlackMsg = { from: string; color: string; text: string; time: string }
const SLACK_MSGS: SlackMsg[] = [
  { from: 'Brent', color: '#6b7a8f', text: 'got a sec? 👀', time: '10:42 AM' },
  { from: 'Diane', color: '#a8896f', text: 'quick q — you around?', time: '10:44 AM' },
  { from: 'Chad', color: '#3a4f7a', text: 'super quick sync?', time: '10:45 AM' },
  { from: 'Priya', color: '#4a8f6f', text: 'sorry to ping! real quick', time: '10:46 AM' },
]
// The Slack pinwheel mark (4 rounded color blocks).
function drawSlackMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const c = ['#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A']
  const u = s * 0.46, g = s * 0.08
  const pos: [number, number][] = [[0, 0], [u + g, 0], [0, u + g], [u + g, u + g]]
  pos.forEach((p, i) => { ctx.fillStyle = c[i]; ctx.fillRect(x + p[0], y + p[1], u, u) })
}
// The whole card IS a deep-aubergine Slack desktop notification, so the
// jump-block reads as the notification itself (not a blue box with a panel).
function drawSlack(ctx: CanvasRenderingContext2D, m: SlackMsg) {
  const W = 340, H = 150
  ctx.fillStyle = '#3F0E40'; ctx.fillRect(0, 0, W, H) // deep Slack aubergine
  ctx.strokeStyle = '#7a4d7c'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  // header: Slack mark + app name + "now"
  drawSlackMark(ctx, 20, 18, 30)
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 23px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('Slack', 66, 33)
  ctx.fillStyle = '#b9a3ba'; ctx.font = '17px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('now', 138, 35)
  // sender avatar + name
  ctx.fillStyle = m.color; ctx.fillRect(20, 66, 40, 40)
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 22px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(m.from[0], 40, 87)
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(m.from, 72, 66)
  // message
  ctx.fillStyle = '#e9d9ea'; ctx.font = '23px "Helvetica Neue", Arial, sans-serif'
  wrapText(ctx, m.text, 72, 96, W - 92, 26, 2)
}
let _slackTex: THREE.Texture[] | null = null
function slackTextures(): THREE.Texture[] {
  if (!_slackTex) _slackTex = SLACK_MSGS.map((m) => makeTex(340, 150, (c) => drawSlack(c, m)))
  return _slackTex
}

// ---- Outlook invites (the town halls / lunch & learns slide-banners) ----
type Invite = { title: string; time: string }
const OUTLOOK_MTGS: Invite[] = [
  { title: 'Town Hall (Mandatory)', time: 'Today · 12:00–1:00 PM' },
  { title: 'Lunch & Learn: Synergy', time: 'Today · 12:30 PM · Recurring' },
  { title: 'All-Hands — Q3 Review', time: 'Today · 3:00–4:30 PM' },
  { title: 'Mandatory Training', time: 'Today · 2:00 PM · Recurring' },
]
function drawOutlook(ctx: CanvasRenderingContext2D, m: Invite) {
  const W = 420, H = 150
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#0F6CBD'; ctx.fillRect(0, 0, W, 40) // Outlook blue header
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('📅  Meeting invitation', 16, 21)
  ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#242424'; ctx.textBaseline = 'top'
  ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(m.title, 16, 52)
  ctx.fillStyle = '#555'; ctx.font = '19px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(m.time, 16, 84)
  const btn = (x: number, w: number, c: string, t: string) => {
    ctx.fillStyle = c; ctx.fillRect(x, 112, w, 28)
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = 'bold 16px "Helvetica Neue", Arial, sans-serif'
    ctx.fillText(t, x + w / 2, 127); ctx.textAlign = 'left'
  }
  btn(16, 96, '#107C41', 'Accept')
  btn(120, 110, '#8a8a8a', 'Tentative')
  btn(238, 96, '#C50F1F', 'Decline')
}
let _outlookTex: THREE.Texture[] | null = null
function outlookTextures(): THREE.Texture[] {
  if (!_outlookTex) _outlookTex = OUTLOOK_MTGS.map((m) => makeTex(420, 150, (c) => drawOutlook(c, m)))
  return _outlookTex
}

// ---- Gantt charts (floating in the sky) ----
const GANTT_TITLES = [
  'Q3 ROADMAP', 'PROJECT PHOENIX', 'INITIATIVE: ALIGNMENT',
  'FY25 PLANNING', 'WORKSTREAM: SYNERGY', 'PROGRAM: NORTH STAR',
]
function drawGantt(ctx: CanvasRenderingContext2D, title: string, k: number) {
  const W = 440, H = 240
  ctx.fillStyle = '#0b1f3a'; ctx.fillRect(0, 0, W, H) // dark panel — reads against the sky
  ctx.strokeStyle = '#2684ff'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#173a6b'; ctx.fillRect(0, 0, W, 40)
  ctx.fillStyle = '#cfe2ff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 22px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(title, 14, 21)
  // week gridlines
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2
  for (let i = 1; i < 8; i++) {
    const x = 60 + i * 46
    ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, H - 12); ctx.stroke()
  }
  // task rows + bars
  const colors = ['#36b37e', '#ffab00', '#0052cc', '#8777d9', '#ff5630']
  ctx.textBaseline = 'middle'
  for (let r = 0; r < 5; r++) {
    const y = 58 + r * 34
    ctx.fillStyle = '#9fb4d8'; ctx.font = '14px "IBM Plex Mono", ui-monospace, monospace'
    ctx.fillText('TASK-' + (k * 5 + r + 1), 10, y + 10)
    const bx = 70 + ((r * 37 + k * 23) % 130)
    const bw = 70 + ((r * 53 + k * 17) % 150)
    ctx.fillStyle = colors[r % colors.length]; ctx.fillRect(bx, y, bw, 18)
  }
  // "today" line
  ctx.strokeStyle = '#de350b'; ctx.lineWidth = 3
  const tx = W * 0.52
  ctx.beginPath(); ctx.moveTo(tx, 44); ctx.lineTo(tx, H - 12); ctx.stroke()
  ctx.fillStyle = '#de350b'; ctx.textBaseline = 'top'
  ctx.font = 'bold 13px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText('TODAY', tx + 5, 48)
}
let _ganttTex: THREE.Texture[] | null = null
function ganttTextures(): THREE.Texture[] {
  if (!_ganttTex) _ganttTex = GANTT_TITLES.map((t, k) => makeTex(440, 240, (c) => drawGantt(c, t, k)))
  return _ganttTex
}

// ---- More app-window faces, mixed into the drifting backdrop ----
// Each is a 256×168 "window snippet" so they slot into the same card wall as
// the Jira tickets. Distinct header colors keep them readable as different
// apps even small + distant.

function drawCalendar(ctx: CanvasRenderingContext2D) {
  const W = 256, H = 168
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#dadce0'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#1a73e8'; ctx.fillRect(0, 0, W, 30) // Google-Calendar blue
  ctx.fillStyle = '#fff'; ctx.font = 'bold 17px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('📅  Calendar — Today', 12, 16)
  ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 2
  for (let i = 1; i < 5; i++) { const x = 20 + i * 46; ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x, H - 8); ctx.stroke() }
  const ev = (x: number, y: number, w: number, h: number, c: string, t: string) => {
    ctx.fillStyle = c; ctx.fillRect(x, y, w, h)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Helvetica Neue", Arial, sans-serif'; ctx.textBaseline = 'middle'
    ctx.fillText(t, x + 5, y + h / 2)
  }
  ev(22, 44, 42, 38, '#039be5', 'Sync')
  ev(68, 58, 42, 64, '#7986cb', '1:1')
  ev(114, 46, 42, 30, '#e67c73', 'Standup')
  ev(160, 70, 42, 48, '#33b679', 'Focus')
  ev(114, 86, 42, 26, '#9e9e9e', 'Declined')
  ctx.strokeStyle = '#ea4335'; ctx.lineWidth = 3 // "now" line
  ctx.beginPath(); ctx.moveTo(14, 102); ctx.lineTo(W - 12, 102); ctx.stroke()
}

function drawExcel(ctx: CanvasRenderingContext2D) {
  const W = 256, H = 168
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#c8c8c8'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#107C41'; ctx.fillRect(0, 0, W, 26) // Excel green
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('Q3_FORECAST_final_v7.xlsx', 10, 14)
  ctx.fillStyle = '#f3f3f3'; ctx.fillRect(0, 26, W, 22)
  ctx.fillStyle = '#444'; ctx.font = '13px "IBM Plex Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle'
  ctx.fillText('fx  =SUM(B2:B9)', 10, 38)
  const cols = 5, rows = 4, x0 = 8, y0 = 54, cw = (W - 16) / cols, ch = (H - 62) / rows
  ctx.lineWidth = 1; ctx.textAlign = 'center'
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * cw, y = y0 + r * ch, t = r * 5 + c
    ctx.fillStyle = t % 7 === 0 ? '#ffd6d6' : t % 5 === 0 ? '#d6f5dd' : '#ffffff'
    ctx.fillRect(x, y, cw - 2, ch - 2)
    ctx.strokeStyle = '#e0e0e0'; ctx.strokeRect(x, y, cw - 2, ch - 2)
    const ref = r === 1 && c === 2
    ctx.fillStyle = ref ? '#d32f2f' : '#333'
    ctx.font = 'bold 12px "IBM Plex Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle'
    ctx.fillText(ref ? '#REF!' : String((t * 37) % 900 + 10), x + cw / 2 - 1, y + ch / 2)
  }
  ctx.textAlign = 'left'
}

function drawChrome(ctx: CanvasRenderingContext2D) {
  const W = 256, H = 168
  ctx.fillStyle = '#dee1e6'; ctx.fillRect(0, 0, W, H) // chrome chrome
  ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 8, 128, 26) // active tab
  ctx.fillStyle = '#5f6368'; ctx.font = '12px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('Jira — Sprint Board', 16, 21)
  ctx.fillStyle = '#bdc1c6'; ctx.fillRect(140, 10, 80, 22) // 2nd tab
  ctx.fillStyle = '#9aa0a6'; ctx.fillText('+ 46 tabs', 150, 21)
  ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 40, W - 16, 24) // address bar
  ctx.fillStyle = '#1a73e8'; ctx.font = '13px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText('🔒 aligned.atlassian.net', 16, 52)
  ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 70, W - 16, H - 78) // page
  ctx.fillStyle = '#e8eaed'
  ctx.fillRect(20, 84, W - 44, 14); ctx.fillRect(20, 108, W - 90, 14); ctx.fillRect(20, 132, W - 70, 14)
}

function drawEmail(ctx: CanvasRenderingContext2D) {
  const W = 256, H = 168
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#dadce0'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#d93025'; ctx.fillRect(0, 0, W, 28) // inbox red
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('📧  Inbox (1,482)', 12, 15)
  const rows = [
    { b: true, f: 'Brent', t: 'RE: RE: RE: quick question' },
    { b: true, f: 'no-reply', t: '[EXTERNAL] Action required' },
    { b: false, f: 'Diane', t: 'Out of Office: I am OOO' },
    { b: true, f: 'Updates', t: "You're now subscribed!" },
  ]
  rows.forEach((r, i) => {
    const y = 38 + i * 31
    if (r.b) { ctx.fillStyle = '#1a73e8'; ctx.fillRect(9, y + 9, 6, 6) }
    ctx.fillStyle = r.b ? '#202124' : '#5f6368'
    ctx.font = `${r.b ? 'bold ' : ''}12px "Helvetica Neue", Arial, sans-serif`; ctx.textBaseline = 'middle'
    ctx.fillText(r.f, 24, y + 4)
    ctx.fillStyle = r.b ? '#202124' : '#80868b'
    ctx.fillText(r.t.slice(0, 30), 24, y + 20)
    ctx.strokeStyle = '#f1f3f4'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(8, y + 28); ctx.lineTo(W - 8, y + 28); ctx.stroke()
  })
}

// Combined drifting-backdrop pool: Jira tickets + the four app windows.
let _winTex: THREE.Texture[] | null = null
function backdropWindowTextures(): THREE.Texture[] {
  if (!_winTex) {
    _winTex = [
      ...cardTextures(),
      makeTex(256, 168, drawCalendar),
      makeTex(256, 168, drawExcel),
      makeTex(256, 168, drawChrome),
      makeTex(256, 168, drawEmail),
    ]
  }
  return _winTex
}

// ---- More slide-under banners (mixed with the Outlook invites) ----
function drawCookie(ctx: CanvasRenderingContext2D) {
  const W = 420, H = 150
  ctx.fillStyle = '#202124'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#5f6368'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#e8eaed'; ctx.font = 'bold 23px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('🍪 We value your privacy', 16, 22)
  ctx.fillStyle = '#9aa0a6'; ctx.font = '16px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('We and our 900 partners store cookies…', 16, 56)
  const btn = (x: number, w: number, c: string, fg: string, t: string) => {
    ctx.fillStyle = c; ctx.fillRect(x, 96, w, 32)
    ctx.fillStyle = fg; ctx.font = 'bold 16px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + w / 2, 112); ctx.textAlign = 'left'
  }
  btn(16, 150, '#1a73e8', '#fff', 'Accept All')
  btn(178, 200, '#3c4043', '#e8eaed', 'Manage Preferences')
}
function drawExternal(ctx: CanvasRenderingContext2D) {
  const W = 420, H = 150
  ctx.fillStyle = '#fff8e1'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#f9a825'; ctx.fillRect(0, 0, W, 8)
  ctx.strokeStyle = '#f9a825'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = '#7a5b00'; ctx.font = 'bold 23px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('⚠️  [EXTERNAL] EMAIL', 16, 26)
  ctx.fillStyle = '#5d4a10'; ctx.font = '17px "Helvetica Neue", Arial, sans-serif'
  wrapText(ctx, 'This message came from outside the org. Do not click links unless you trust the sender.', 16, 62, W - 32, 24, 3)
}

// Combined slide-under banner pool: Outlook invites + cookie + external.
let _bannerTex: THREE.Texture[] | null = null
function bannerTextures(): THREE.Texture[] {
  if (!_bannerTex) {
    _bannerTex = [
      ...outlookTextures(),
      makeTex(420, 150, drawCookie),
      makeTex(420, 150, drawExternal),
    ]
  }
  return _bannerTex
}

// ════════════════════════════════════════════════════════════════════════
// HERO STRUCTURE — the skyscraper-sized Jira ticket. The whole tower's facade
// is a full Jira ISSUE DETAIL PAGE (portrait, so it maps to a skyscraper).
// High-res so it stays crisp when you run right up to it.
// ════════════════════════════════════════════════════════════════════════
const TICKET_PAGE_W = 768
const TICKET_PAGE_H = 1728
export const TICKET_PAGE_ASPECT = TICKET_PAGE_W / TICKET_PAGE_H // ≈ 0.444

type TicketPage = {
  key: string; title: string; statusLabel: string; status: string
  pts: number; desc: string; comments: { who: string; color: string; text: string }[]
}
const TICKET_PAGES: TicketPage[] = [
  {
    key: 'ALN-1842', title: "Define 'Premium'", statusLabel: 'BLOCKED', status: '#de350b', pts: 8,
    desc: 'Stakeholders aligned that the tier should feel "premium." Definition of premium is pending a definition of "feel." See thread (47 replies).',
    comments: [
      { who: 'Diane', color: '#a8896f', text: 'Per my last email — can we get this updated today?' },
      { who: 'Exec', color: '#b08a3a', text: 'is this one updated yet? 👀' },
    ],
  },
  {
    key: 'ALN-1851', title: 'Thursday demo → "target state"', statusLabel: 'IN PROGRESS', status: '#0052cc', pts: 21,
    desc: 'Demo the target state. Target state is itself a dependency we are actively managing. Do not show the current state under any circumstances.',
    comments: [
      { who: 'Chad', color: '#3a4f7a', text: "client's pulling this up in standup. is it green?" },
      { who: 'Brent', color: '#6b7a8f', text: 'blocked on ALN-1842 until someone updates it' },
    ],
  },
  {
    key: 'ALN-1847', title: 'Dedupe the deduplication logic', statusLabel: 'BLOCKED', status: '#de350b', pts: 13,
    desc: 'The deduplication logic is producing duplicates. The duplicates are also duplicated. Proposed fix introduces a third copy for triangulation.',
    comments: [
      { who: 'Priya', color: '#4a8f6f', text: 'quick FYI: the small change is no longer small' },
      { who: 'Diane', color: '#a8896f', text: 'gentle nudge 💚' },
    ],
  },
]

function drawTicketPage(ctx: CanvasRenderingContext2D, p: TicketPage) {
  const W = TICKET_PAGE_W, H = TICKET_PAGE_H
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  // left status spine baked into the page
  ctx.fillStyle = p.status; ctx.fillRect(0, 96, 14, H - 96)
  // ---- top app bar (Jira/Alignly) ----
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, 96)
  ctx.fillStyle = '#0052cc'; ctx.fillRect(28, 26, 44, 44)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 32px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A', 50, 49)
  ctx.fillStyle = '#172b4d'; ctx.textAlign = 'left'; ctx.font = 'bold 30px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('Alignly', 88, 49)
  ctx.fillStyle = '#5e6c84'; ctx.font = '24px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('Your work    Projects    Filters    Dashboards', 230, 50)
  ctx.strokeStyle = '#dfe1e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 96); ctx.lineTo(W, 96); ctx.stroke()
  // ---- breadcrumb + key ----
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#5e6c84'; ctx.font = '24px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('Projects / Customer Happiness Portal Refresh / Sprint 14', 48, 124)
  ctx.fillStyle = '#5e6c84'; ctx.font = 'bold 30px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(p.key, 48, 168)
  // ---- summary (huge) ----
  ctx.fillStyle = '#172b4d'; ctx.font = 'bold 68px "Helvetica Neue", Arial, sans-serif'
  wrapText(ctx, p.title, 48, 214, W - 96, 76, 2)
  // ---- status pill + story points ----
  const pillY = 384
  ctx.fillStyle = p.status; ctx.fillRect(48, pillY, 300, 56)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textBaseline = 'middle'; ctx.fillText(p.statusLabel, 70, pillY + 29)
  ctx.fillStyle = '#dfe1e6'; ctx.fillRect(372, pillY, 260, 56)
  ctx.fillStyle = '#172b4d'; ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(`${p.pts} story points`, 392, pillY + 29)
  // ---- details panel ----
  let y = 488
  ctx.fillStyle = '#f4f5f7'; ctx.fillRect(48, y, W - 96, 230)
  ctx.textBaseline = 'top'
  const field = (label: string, val: string, fy: number) => {
    ctx.fillStyle = '#5e6c84'; ctx.font = '22px "Helvetica Neue", Arial, sans-serif'; ctx.fillText(label, 72, fy)
    ctx.fillStyle = '#172b4d'; ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'; ctx.fillText(val, 320, fy)
  }
  field('Assignee', 'Leonard P.', y + 28)
  field('Reporter', 'Exec', y + 78)
  field('Sprint', 'Sprint 14 (overdue)', y + 128)
  field('Labels', 'needs-update · q3-alignment', y + 178)
  // ---- description ----
  y = 760
  ctx.fillStyle = '#5e6c84'; ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('Description', 48, y)
  ctx.fillStyle = '#172b4d'; ctx.font = '30px "Helvetica Neue", Arial, sans-serif'
  wrapText(ctx, p.desc, 48, y + 44, W - 96, 42, 5)
  // ---- activity / comments ----
  y = 1060
  ctx.fillStyle = '#5e6c84'; ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('Activity', 48, y)
  let cy = y + 50
  p.comments.forEach((c) => {
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(74, cy + 26, 26, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.who[0], 74, cy + 27)
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillStyle = '#172b4d'; ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif'; ctx.fillText(c.who, 118, cy)
    ctx.fillStyle = '#42526e'; ctx.font = '28px "Helvetica Neue", Arial, sans-serif'
    const lines = wrapText(ctx, c.text, 118, cy + 38, W - 166, 38, 3)
    cy += 60 + lines * 38 + 24
  })
}

let _pageTex: THREE.Texture[] | null = null
function ticketPageTextures(): THREE.Texture[] {
  if (!_pageTex) _pageTex = TICKET_PAGES.map((p) => makeTex(TICKET_PAGE_W, TICKET_PAGE_H, (c) => drawTicketPage(c, p)))
  return _pageTex
}

// ---- Binary data-stream lane borders (the glowing 1s/0s along the track) ----
function drawBinary(ctx: CanvasRenderingContext2D) {
  const W = 512, H = 128
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H)
  ctx.font = 'bold 22px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const cols = 22, rows = 4
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = (c * 7 + r * 13 + r * c) % 3 === 0 ? '1' : '0'
      const bright = (c * 3 + r * 5) % 4 === 0
      ctx.fillStyle = bright ? '#7dffb4' : '#1d6b40'
      ctx.fillText(d, (c + 0.5) * (W / cols), (r + 0.5) * (H / rows))
    }
  }
}
let _binTex: THREE.CanvasTexture | null = null
function binaryTexture(): THREE.CanvasTexture {
  if (!_binTex) {
    _binTex = makeTex(512, 128, drawBinary)
    _binTex.wrapS = THREE.RepeatWrapping
    _binTex.wrapT = THREE.RepeatWrapping
    _binTex.repeat.set(30, 1)
  }
  return _binTex
}

// ---- Office-window facade map (so tinted towers read as buildings, not blocks) ----
function drawWindowMap(ctx: CanvasRenderingContext2D) {
  const W = 256, H = 512
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H)
  const cols = 5, rows = 12, mx = 12, my = 12
  const cw = (W - mx * 2) / cols, ch = (H - my * 2) / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = (r * 5 + c * 3 + (r % 3)) % 4 !== 0 // ~75% lit
      ctx.fillStyle = on ? '#ffffff' : '#2a2a2a'
      ctx.fillRect(mx + c * cw + 2, my + r * ch + 2, cw - 5, ch - 5)
    }
  }
}
let _winMap: THREE.Texture | null = null
function windowMapTexture(): THREE.Texture {
  if (!_winMap) _winMap = makeTex(256, 512, drawWindowMap)
  return _winMap
}

// ---- The deposit gate: a giant "TICKET n UPDATED ✓" Jira card ----
const GATE_W = 512
const GATE_H = 300
function drawUpdatedTicket(ctx: CanvasRenderingContext2D, n: number) {
  const W = GATE_W, H = GATE_H
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#36b37e'; ctx.fillRect(0, 0, 16, H) // DONE-green spine
  ctx.strokeStyle = '#36b37e'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6)
  // ticket key + DONE pill
  ctx.fillStyle = '#5e6c84'; ctx.font = 'bold 30px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('ALN-184' + n, 44, 28)
  ctx.fillStyle = '#36b37e'; ctx.fillRect(W - 156, 28, 116, 42)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DONE', W - 98, 50)
  // big green check
  const cx = 108, cy = 168, r = 58
  ctx.fillStyle = '#36b37e'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(cx - 28, cy + 2); ctx.lineTo(cx - 6, cy + 26); ctx.lineTo(cx + 32, cy - 26); ctx.stroke()
  // headline
  ctx.fillStyle = '#172b4d'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 48px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('TICKET ' + n, 196, 148)
  ctx.fillStyle = '#006644'; ctx.font = 'bold 42px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('UPDATED', 196, 198)
  // footer
  ctx.fillStyle = '#5e6c84'; ctx.font = '22px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(`UPDATE ${n} OF 4  ·  SPRINT ${n} COMPLETE`, W / 2, H - 24)
}
const _gateTex: Record<number, THREE.Texture> = {}
function updatedGateTexture(n: number): THREE.Texture {
  if (!_gateTex[n]) _gateTex[n] = makeTex(GATE_W, GATE_H, (c) => drawUpdatedTicket(c, n))
  return _gateTex[n]
}

// ---- The "problem hole" (gap) — a swirling rabbit-hole / can of worms ----
// A vortex of red rings + falling ticket debris, painted on the floor over a
// black void. Reads as "a pit of problems you jump over."
function drawHole(ctx: CanvasRenderingContext2D) {
  const W = 256, H = 256, cx = W / 2, cy = H / 2
  ctx.clearRect(0, 0, W, H)
  // spiral of red dashes sucking inward
  ctx.strokeStyle = '#ff5630'; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath()
  for (let a = 0; a < Math.PI * 6.5; a += 0.18) {
    const rr = 10 + a * 5.4
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr
    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()
  // glowing rim
  ctx.strokeStyle = '#de350b'; ctx.lineWidth = 12
  ctx.beginPath(); ctx.arc(cx, cy, W / 2 - 12, 0, Math.PI * 2); ctx.stroke()
  // a few ticket fragments tumbling in
  ctx.fillStyle = '#cdd9f0'
  for (let i = 0; i < 6; i++) {
    const a = i * 1.27, rr = 40 + i * 13
    ctx.save(); ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); ctx.rotate(a)
    ctx.fillRect(-8, -6, 16, 12); ctx.restore()
  }
}
let _holeTex: THREE.Texture | null = null
function holeTexture(): THREE.Texture {
  if (!_holeTex) _holeTex = makeTex(256, 256, drawHole)
  return _holeTex
}
const GAP_THEMES = ['SCOPE CREEP', 'RABBIT HOLE', 'CAN OF WORMS', 'OUT OF SCOPE']

// ---- The dependency wall (the "purple block") — a clear BLOCKED barrier ----
const WALL_WAITING = ['Legal', 'Approval', 'Sign-off', 'Security', 'the other team']
function drawStripes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  for (let i = -h; i < w + h; i += 28) {
    ctx.fillStyle = ((i / 28) | 0) % 2 === 0 ? '#1c1330' : '#f5c518'
    ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 14, y); ctx.lineTo(x + i + 14 - h, y + h); ctx.lineTo(x + i - h, y + h); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}
function drawBlocker(ctx: CanvasRenderingContext2D, who: string) {
  const W = 256, H = 384
  ctx.fillStyle = '#3d2f6b'; ctx.fillRect(0, 0, W, H) // dependency purple
  drawStripes(ctx, 0, 0, W, 40)
  drawStripes(ctx, 0, H - 40, W, 40)
  // no-entry sign
  const cx = W / 2, cy = 154, r = 62
  ctx.strokeStyle = '#ff5b5b'; ctx.lineWidth = 16; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - r * 0.68, cy - r * 0.68); ctx.lineTo(cx + r * 0.68, cy + r * 0.68); ctx.stroke()
  // BLOCKED
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 50px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('BLOCKED', W / 2, 256)
  ctx.fillStyle = '#cbbff0'; ctx.font = '20px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText('Waiting on:', W / 2, 300)
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(who, W / 2, 330)
}
const _blockerTex: Record<string, THREE.Texture> = {}
function blockerTexture(who: string): THREE.Texture {
  if (!_blockerTex[who]) _blockerTex[who] = makeTex(256, 384, (c) => drawBlocker(c, who))
  return _blockerTex[who]
}

// Pick the run's seed: ?seed=N in the URL replays an exact obstacle layout
// (used to reproduce a run the playtest harness flagged); otherwise random.
function readSeed(): number {
  try {
    const q = new URLSearchParams(window.location.search).get('seed')
    if (q != null && q !== '') {
      const n = Number(q)
      if (Number.isFinite(n)) return n >>> 0
    }
  } catch { /* ignore */ }
  return Math.floor(Math.random() * 0xffffffff)
}

export type HudState = { updates: number; level: number; distance: number; score: number; mult: number }
export type Checkpoint = { level: number; updates: number; score: number }

type Props = {
  running: boolean
  // Where this run begins — start of the current sprint. On a fresh game it's
  // {1,0,0}; after a death it's the last sprint the player banked, so retries
  // resume the sprint instead of starting the whole phase over.
  start: Checkpoint
  onHud: (h: HudState) => void
  onDeposit: (n: number) => void
  onToken: () => void
  onCheckpoint: (c: Checkpoint) => void
  onDeath: (result: { score: number; updates: number; cause: DeathCause }) => void
  onWin: (result: { score: number; updates: number; dodged: { slack: number; worms: number; invites: number; walls: number } }) => void
}

export function RunnerWorld({ running, start, onHud, onDeposit, onToken, onCheckpoint, onDeath, onWin }: Props) {
  const { camera, scene } = useThree()

  // ---- the shared rules engine (single source of truth for gameplay) ----
  // Created once per mount (the parent remounts us via key on every new run /
  // retry), seeded from `start` so a retry resumes the current sprint.
  const seedRef = useRef(readSeed())
  const simRef = useRef<Sim | null>(null)
  if (!simRef.current) simRef.current = new Sim(seedRef.current, start)

  // React only renders the obstacle/token *lists*; we re-sync them from the sim
  // when its version counters change (a few times/sec on spawn/cull), never
  // per-frame.
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const lastObsV = useRef(-1)
  const lastTokV = useRef(-1)
  const hudAccum = useRef(0)

  const leonardRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const pillarsRef = useRef<THREE.Group>(null)
  const floorRef = useRef<THREE.Group>(null)
  // Backdrop layers (cosmetic) — each tiles forward to look endless.
  const cardsRef = useRef<THREE.Group>(null)
  const rungsRef = useRef<THREE.Group>(null)
  const skylineRef = useRef<THREE.Group>(null)
  const ganttRef = useRef<THREE.Group>(null)
  // Gated "mountains of files" canyon walls — two tiles leapfrog (seamless),
  // hidden below ground until they rise into view near gate 1.
  const fileWallARef = useRef<THREE.Group>(null)
  const fileWallBRef = useRef<THREE.Group>(null)
  // Per-sprint LANDSCAPES. Each biome rises/sinks based on each element's WORLD
  // position relative to the gate boundaries (not a global level snap), so the
  // next landscape grows on the horizon ahead while you're still in the current
  // one — "running through different landscapes per sprint":
  //   Sprint 1 (start→gate1): corporate ticket-tower canyon (cardsRef + gantt)
  //   Sprint 2 (gate1→gate2): file-mountain canyon (fileWallA/B)
  //   Sprint 3+ (gate2→…):    macOS Tahoe desktop — rocks, lake, clutter
  // levelStartZRef = world-z where the CURRENT sprint began (last gate crossed),
  // so boundaries compute correctly on fresh runs AND mid-sprint retries. A
  // mid-sprint start (retry / ?sprint= shortcut) begins at z=0 already inside
  // its sprint, so seed it negative — the previous landscape is fully sunk and
  // this sprint's landscape is fully up from the first frame (no start overlap).
  const levelStartZRef = useRef(start.level > 1 ? -85 : 0)
  const tahoeARef = useRef<THREE.Group>(null)
  const tahoeBRef = useRef<THREE.Group>(null)
  const waterARef = useRef<THREE.Group>(null)
  const waterBRef = useRef<THREE.Group>(null)
  const clutterARef = useRef<THREE.Group>(null)
  const clutterBRef = useRef<THREE.Group>(null)
  // lights — recoloured per sprint (warm gold in the Antelope canyon)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  // FINISH LINE — the giant office screen + the "leap through it" win cinematic
  const winScreenRef = useRef<THREE.Group>(null)
  const flashRef = useRef<THREE.Mesh>(null) // full-screen white burst at the punch-through
  const winCineRef = useRef({ active: false, t: 0, fromX: 0, fromZ: 0, fromCamZ: 0, screenZ: 0 })
  // tally of hazards SURVIVED (passed behind), for the end-screen achievements
  const statsRef = useRef({ slack: 0, worms: 0, invites: 0, walls: 0 })
  const countedRef = useRef<Set<number>>(new Set())

  // ---- input ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const sim = simRef.current
      if (!running || !sim || !sim.state.alive || sim.state.won) return
      switch (e.key) {
        // Camera is BEHIND Leonard looking +Z, so world +X renders on the
        // player's LEFT. Left/A nudges toward the higher lane index (+1) to
        // feel correct on screen, and Right/D toward the lower (-1).
        case 'ArrowLeft': case 'a': case 'A':
          sim.nudgeLane(1); e.preventDefault(); break
        case 'ArrowRight': case 'd': case 'D':
          sim.nudgeLane(-1); e.preventDefault(); break
        case 'ArrowUp': case 'w': case 'W': case ' ':
          sim.jump(); e.preventDefault(); break
        case 'ArrowDown': case 's': case 'S':
          sim.slide(); e.preventDefault(); break
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [running])

  // Dev-only: expose the live sim so a flagged seed can be inspected/driven
  // from the browser console (and so an in-browser bot could pilot it). Never
  // ships to production.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __JIRARUN__?: unknown }
    w.__JIRARUN__ = {
      seed: seedRef.current,
      sim: simRef.current,
      state: () => simRef.current?.state,
      left: () => simRef.current?.nudgeLane(1),
      right: () => simRef.current?.nudgeLane(-1),
      jump: () => simRef.current?.jump(),
      slide: () => simRef.current?.slide(),
    }
    return () => { delete w.__JIRARUN__ }
  }, [])

  useFrame((_, dtRaw) => {
    const sim = simRef.current
    if (!sim || !running) return
    const dt = Math.min(dtRaw, 0.05) // clamp huge frames (tab refocus)

    // ── FINISH-LINE cinematic: Leonard leaps THROUGH the giant office screen ──
    // Runs after the win is banked (sim is won/frozen). Glides + arcs him into
    // the screen while the camera dives in; at the end → onWin (the office screen).
    const cine = winCineRef.current
    if (cine.active) {
      cine.t += dt
      const p = Math.min(1, cine.t / WIN_CINE_DUR)
      const e = 1 - Math.pow(1 - p, 2.4) // strong ease — punch toward the screen
      const sz = cine.screenZ
      // Leonard ROCKETS up and forward INTO the office screen — he rises to the
      // screen's centre height (not a hop back to the floor), so he's clearly
      // leaping THROUGH the glass into the office.
      const lx = cine.fromX * (1 - e)
      const ly = e * 8.0 // up to the screen centre (H/2 = 8)
      if (leonardRef.current) leonardRef.current.position.set(lx, ly, cine.fromZ + (sz - 1.0 - cine.fromZ) * e)
      runnerAnim.jumping = true
      // Camera DIVES IN behind him and rises to the screen's centre, ending
      // dead-level right in front of the office so it FILLS the frame — the
      // browser-tab world behind is fully occluded, so you've clearly EMERGED
      // into the office (no more tabs around the edges).
      camera.position.set(lx * 0.15, 3.4 + (8 - 3.4) * e, cine.fromCamZ + ((sz - 2.8) - cine.fromCamZ) * e)
      camera.lookAt(0, 8, sz)
      // Burst of white as we punch through — handed straight to the WinScreen's
      // own white flash, so it reads as one continuous "pop into the office".
      if (flashRef.current) {
        const op = clamp01((p - 0.7) / 0.3)
        ;(flashRef.current.material as THREE.MeshBasicMaterial).opacity = op
        flashRef.current.visible = op > 0.001
        flashRef.current.position.set(camera.position.x, camera.position.y, camera.position.z + 0.6)
      }
      if (p >= 1) { cine.active = false; onWin({ score: sim.state.score, updates: sim.state.updates, dodged: { ...statsRef.current } }) }
      return
    }

    if (!sim.state.alive || sim.state.won) return

    // Advance the shared rules engine, then react to what it reports.
    const events = sim.step(dt)
    for (const e of events) {
      if (e.type === 'token') onToken()
      else if (e.type === 'deposit') onDeposit(e.updates)
      else if (e.type === 'checkpoint') { onCheckpoint({ level: e.level, updates: e.updates, score: e.score }); levelStartZRef.current = sim.state.z }
      else if (e.type === 'win') {
        // kick off the finish-line cinematic (onWin fires when it completes)
        const c = winCineRef.current
        c.active = true; c.t = 0
        c.fromX = sim.state.x; c.fromZ = sim.state.z; c.fromCamZ = sim.state.z - 6.6
        c.screenZ = winScreenRef.current ? winScreenRef.current.position.z : sim.state.z + 14
        runnerAnim.jumping = true
      }
      else if (e.type === 'death') onDeath({ score: sim.state.score, updates: sim.state.updates, cause: e.cause })
    }

    // Re-sync the React-rendered lists only when the sim actually changed them.
    if (sim.state.obsVersion !== lastObsV.current) {
      lastObsV.current = sim.state.obsVersion
      setObstacles(sim.state.obstacles.slice())
    }
    if (sim.state.tokVersion !== lastTokV.current) {
      lastTokV.current = sim.state.tokVersion
      setTokens(sim.state.tokens.slice())
    }

    // ---- transforms (read-only view of sim state) ----
    const s = sim.state
    runnerAnim.z = s.z // shared so obstacles can self-animate by distance (Slack pop-in)
    if (leonardRef.current) leonardRef.current.position.set(s.x, s.y, s.z)
    // tally hazards survived (passed behind us) for the end-screen achievements
    {
      const counted = countedRef.current, st = statsRef.current
      for (const o of s.obstacles) {
        if (o.kind === 'board' || o.z >= s.z - 0.5 || counted.has(o.id)) continue
        counted.add(o.id)
        if (o.kind === 'block') st.slack++
        else if (o.kind === 'gap') st.worms++
        else if (o.kind === 'overhang') st.invites++
        else if (o.kind === 'wall') st.walls++
      }
    }
    // Drive the animation state machine: airborne → Jump clip, else Run.
    runnerAnim.jumping = !s.grounded
    if (modelRef.current) modelRef.current.scale.y = s.sliding ? 0.5 : 1 // slide squash
    // camera follows behind, slight lateral lean toward lane
    camera.position.set(s.x * 0.35, 3.4, s.z - 6.6)
    camera.lookAt(s.x * 0.18, 1.0, s.z + 12)
    // FINISH LINE: stand the giant office screen just past the final (gate-4)
    // green gate, so it looms ahead as you close out Sprint 4.
    if (winScreenRef.current) {
      const finalGate = s.level >= 4 ? s.obstacles.find((o) => o.kind === 'board') : undefined
      winScreenRef.current.visible = !!finalGate
      if (finalGate) winScreenRef.current.position.z = finalGate.z + 11
    }
    // tile the side pillars + floor so the world looks infinite
    if (pillarsRef.current) pillarsRef.current.position.z = Math.floor((s.z - 16) / 8) * 8
    if (floorRef.current) floorRef.current.position.z = s.z
    // backdrop layers: cards + floor rungs tile forward; the burndown skyline
    // rides along at a fixed forward offset so it always sits on the horizon.
    if (cardsRef.current) cardsRef.current.position.z = Math.floor((s.z - 24) / 24) * 24
    if (rungsRef.current) rungsRef.current.position.z = Math.floor((s.z - 30) / 6) * 6
    if (skylineRef.current) skylineRef.current.position.z = s.z
    if (ganttRef.current) ganttRef.current.position.z = Math.floor((s.z - 10) / 22) * 22

    // ════ Per-sprint landscapes ════
    // gz(L) = world-z where sprint L begins (= gate L-1 crossed). Built from the
    // current sprint's start + each sprint's span, so boundaries are right on
    // fresh runs AND mid-sprint retries. Each landscape rises/sinks by each
    // element's OWN world-z, so the NEXT one grows on the horizon ahead before
    // you reach its gate, then sinks behind as you pass into it.
    //   S1 corporate towers → S2 file canyon → S3 desktop →
    //   S4 REVERSES: desktop → canyon again → OFFICE (emerge from the computer).
    const cur = s.level
    const startZ = levelStartZRef.current
    const gz = (L: number) => {
      let z = startZ
      if (L > cur) for (let k = cur; k < L; k++) z += levelSpan(k)
      else if (L < cur) for (let k = L; k < cur; k++) z -= levelSpan(k)
      return z
    }
    const bFile = gz(2) // gate 1 — file canyon begins
    const bDesk = gz(3) // gate 2 — desktop begins
    const bGate3 = gz(4) // gate 3 — final sprint begins (start the journey home)
    const inS4 = cur >= 4
    const s4len = levelSpan(4)
    // Sprint 4 UNWINDS the journey back out: desktop → canyon → the Sprint-1
    // corporate tower world (Jira boards + browser-tab buildings) → cross the
    // final gate → emerge to the OFFICE (handled by the win SCREEN, not 3D).
    const bCanyonBack = bGate3 + 0.30 * s4len // file canyon returns
    const bTowersBack = bGate3 + 0.62 * s4len // Sprint-1 corporate towers return for the final stretch

    // per-landscape "up" amount at a world-z (1 = at rest, 0 = parked underground).
    // Sprint 4 reverses with a SHORTER lead so each leg reads inside one sprint.
    const upCorp = (z: number) =>
      Math.max(1 - sinkAt(z, bFile), inS4 ? riseAtL(z, bTowersBack, REV_LEAD) : 0)
    const upCanyon = (z: number) => {
      const fwd = riseAt(z, bFile) * (1 - sinkAt(z, bDesk)) // Sprint 2
      return inS4 ? Math.max(fwd, riseAtL(z, bCanyonBack, REV_LEAD) * (1 - sinkAt(z, bTowersBack))) : fwd
    }
    const upDesk = (z: number) => (inS4 ? riseAt(z, bDesk) * (1 - sinkAt(z, bCanyonBack)) : riseAt(z, bDesk))

    // leapfrog the tiling layers (two tiles each; recycle stays behind the cam)
    const fwBase = Math.floor((s.z - 24) / FILEWALL_LEN) * FILEWALL_LEN
    if (fileWallARef.current) fileWallARef.current.position.z = fwBase
    if (fileWallBRef.current) fileWallBRef.current.position.z = fwBase + FILEWALL_LEN
    const deBase = Math.floor((s.z - 26) / DESK_LEN) * DESK_LEN
    for (const r of [tahoeARef, clutterARef, waterARef]) if (r.current) r.current.position.z = deBase
    for (const r of [tahoeBRef, clutterBRef, waterBRef]) if (r.current) r.current.position.z = deBase + DESK_LEN

    bandLayer(cardsRef.current, upCorp) // ticket-tower / Jira-board world (S1 + S4 return)
    bandLayer(ganttRef.current, upCorp)
    bandLayer(fileWallARef.current, upCanyon)
    bandLayer(fileWallBRef.current, upCanyon)
    for (const r of [tahoeARef, tahoeBRef, clutterARef, clutterBRef, waterARef, waterBRef]) bandLayer(r.current, upDesk)
    // the lake always shimmers, so you see it glinting as it rises in the distance
    const wt = waterTexture(); wt.offset.y -= dt * 0.07; wt.offset.x += dt * 0.012

    // sky + fog + light, blended by which landscape(s) you're standing in. This
    // handles the forward journey AND Sprint 4's reverse home automatically.
    const wCorp = upCorp(s.z), wCanyon = upCanyon(s.z), wDesk = upDesk(s.z)
    const skyCol = blendBiome(_skyScratch, SKY_NAVY, SKY_CANYON, SKY_TAHOE, wCorp, wCanyon, wDesk)
    if ((scene.background as THREE.Color)?.isColor) (scene.background as THREE.Color).copy(skyCol)
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog
      fog.color.copy(skyCol)
      const open = wDesk / (wCorp + wCanyon + wDesk || 1) // only the open lake widens the vista
      fog.near = 55 + 16 * open
      fog.far = 125 + 70 * open
    }
    if (ambientRef.current) {
      ambientRef.current.color.copy(blendBiome(_ambScratch, AMB_CORP, AMB_CANYON, AMB_DESK, wCorp, wCanyon, wDesk))
      ambientRef.current.intensity = blend3n(AMB_I, wCorp, wCanyon, wDesk)
    }
    if (dirRef.current) {
      dirRef.current.color.copy(blendBiome(_dirScratch, DIR_CORP, DIR_CANYON, DIR_DESK, wCorp, wCanyon, wDesk))
      dirRef.current.intensity = blend3n(DIR_I, wCorp, wCanyon, wDesk)
    }

    // stream the binary lane-border digits toward the camera
    binaryTexture().offset.x -= dt * 0.5

    // throttled HUD push
    hudAccum.current += dt
    if (hudAccum.current > 0.12) {
      hudAccum.current = 0
      onHud({
        updates: s.updates, level: s.level, distance: Math.floor(s.z),
        score: s.score, mult: multForCombo(s.combo),
      })
    }
  })

  return (
    <>
      {/* Moody deep-navy void (not flat bright blue) so the giant colorful
          towers pop; fog pushed far back so the built-out world reads as
          expansive rather than a near wall. */}
      <color attach="background" args={[PAL.skyTop]} />
      <fog attach="fog" args={[PAL.skyTop, 55, 125]} />
      <ambientLight ref={ambientRef} intensity={1.0} />
      <directionalLight ref={dirRef} position={[6, 18, -4]} intensity={0.95} />

      {/* Floor + lane lines — follow Leonard so they read as endless */}
      <group ref={floorRef}>
        {/* Wide dark "ground" extending out to the towers, so the world has
            land in every direction instead of a blue void below the skyline. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <planeGeometry args={[160, 320]} />
          <meshStandardMaterial color="#0a1526" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[11, 260]} />
          <meshStandardMaterial color={PAL.floor} />
        </mesh>
        {[-1.15, 1.15].map((x) => (
          <mesh key={x} position={[x, 0.02, 0]}>
            <boxGeometry args={[0.05, 0.02, 260]} />
            <meshStandardMaterial color={PAL.grid} emissive={PAL.grid} emissiveIntensity={0.6} />
          </mesh>
        ))}
        {/* outer borders: streaming-binary data walls (computer-themed lane
            edges — the 1s and 0s scroll past as you run). */}
        {[-3.55, 3.55].map((x) => (
          <mesh key={'bin' + x} position={[x, 0.62, 0]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <planeGeometry args={[260, 1.25]} />
            <meshBasicMaterial
              map={binaryTexture()}
              transparent
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        {/* slim glowing base rail beneath each data wall */}
        {[-3.62, 3.62].map((x) => (
          <mesh key={'rail' + x} position={[x, 0.05, 0]}>
            <boxGeometry args={[0.1, 0.1, 260]} />
            <meshStandardMaterial color="#33e0a0" emissive="#33e0a0" emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>

      {/* ---- The built-out world (cosmetic corporate hellscape) ---- */}
      {/* A canyon of GIANT corporate-app towers flanking the track — tickets,
          spreadsheets, calendars, inboxes as monster-scale buildings. Replaces
          the old flat card-wall + burndown skyline. */}
      <group ref={cardsRef}><BuildingCanyon /></group>
      {/* Gated jagged file-mountain canyon walls (rise in near gate 1) */}
      <group ref={fileWallARef}><FileWalls /></group>
      <group ref={fileWallBRef}><FileWalls /></group>
      {/* DESKTOP (macOS Tahoe) biome — parked below ground, rises in at the
          3rd-gate run (Sprint 3+): granite rocks, a shimmering lake, and the
          stray files everyone leaves cluttering their desktop. */}
      <group ref={waterARef}><LakeWater /></group>
      <group ref={waterBRef}><LakeWater /></group>
      <group ref={tahoeARef}><TahoeRocks /></group>
      <group ref={tahoeBRef}><TahoeRocks /></group>
      <group ref={clutterARef}><DesktopClutter /></group>
      <group ref={clutterBRef}><DesktopClutter /></group>
      {/* Huge Gantt charts looming overhead like billboards. */}
      <group ref={ganttRef}><GanttSky /></group>
      {/* FINISH LINE — giant office screen just past the final gate (Sprint 4) */}
      <group ref={winScreenRef} visible={false}><GiantOfficeScreen /></group>
      {/* white burst pinned in front of the camera at the punch-through moment */}
      <mesh ref={flashRef} visible={false} renderOrder={999}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Near: transverse board-cell lines for the speed/“on a board” feel. */}
      <group ref={rungsRef}><FloorRungs /></group>

      {/* Obstacles */}
      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} obstacle={o} />
      ))}

      {/* ⭐ Story-point tokens */}
      {tokens.map((t) => (
        <TokenMesh key={t.id} token={t} />
      ))}

      {/* Leonard */}
      <group ref={leonardRef}>
        <group ref={modelRef}>
          <Suspense fallback={<FallbackLeonard />}>
            <LeonardModel />
          </Suspense>
        </group>
      </group>
    </>
  )
}

// ---- Leonard (idle mesh + real Mixamo run/jump clips) ----
// Mount the Idle GLB's scene (the mesh) and retarget the run + running-jump
// clips onto it by bone name (drei useAnimations). Run loops by default;
// while airborne (runnerAnim.jumping) we crossfade to the Jump clip and back.
// Root motion is stripped from both so our own physics drives position.
function LeonardModel() {
  const group = useRef<THREE.Group>(null)
  const idle = useGLTF(LEONARD_URL)
  const run = useGLTF(RUN_URL)
  const jump = useGLTF(JUMP_URL)
  const clips = useMemo(() => {
    const out: AnimationClip[] = []
    const r = pickClip(run.animations)
    const j = pickClip(jump.animations)
    if (r) out.push(stripRootMotion(r, 'Run'))
    if (j) out.push(stripRootMotion(j, 'Jump'))
    return out
  }, [run.animations, jump.animations])
  const { actions } = useAnimations(clips, group)
  const wasJumping = useRef(false)

  useEffect(() => {
    const runA = actions['Run']
    if (runA) { runA.reset().play(); runA.timeScale = RUN_TIMESCALE }
    return () => { Object.values(actions).forEach((a) => a?.stop()) }
  }, [actions])

  // Crossfade Run ↔ Jump on the shared signal (edge-triggered).
  useFrame(() => {
    const j = runnerAnim.jumping
    if (j === wasJumping.current) return
    wasJumping.current = j
    const runA = actions['Run']
    const jumpA = actions['Jump']
    if (j) {
      jumpA?.reset().fadeIn(0.1).play()
      runA?.fadeOut(0.1)
    } else {
      runA?.reset().fadeIn(0.15).play()
      jumpA?.fadeOut(0.15)
    }
  })

  // 0.01 = Mixamo cm→m correction (matches Phase 1 Player.tsx). Without it
  // Leonard renders ~100× and the camera ends up inside his shoe.
  // rotation.y = 0 faces him +Z (away from the behind-camera) so we see his
  // back as he runs into the screen.
  return <primitive ref={group} object={idle.scene} rotation={[0, 0, 0]} scale={0.01} />
}

// Pick the first non-empty clip from a GLB (Mixamo names them "mixamo.com").
function pickClip(animations: AnimationClip[]): AnimationClip | null {
  return animations.find((c) => c.tracks.length > 0) ?? null
}
// Clone, rename, and drop the root-motion position track so Leonard runs in
// place (our z-motion drives him forward). Same logic as Phase 1's Player.tsx.
function stripRootMotion(clip: AnimationClip, name: string): AnimationClip {
  const cloned = clip.clone() as AnimationClip
  cloned.name = name
  cloned.tracks = cloned.tracks.filter((t) => {
    if (!t.name.endsWith('.position')) return true
    return !/(?:mixamorig\d*Hips|Hips|Root|Armature)\.position$/.test(t.name)
  })
  return cloned
}
function FallbackLeonard() {
  return (
    <mesh position={[0, 0.9, 0]} castShadow>
      <capsuleGeometry args={[0.3, 1.0, 4, 8]} />
      <meshStandardMaterial color={PAL.leonardClash} />
    </mesh>
  )
}

// ---- Backdrop layer components (all cosmetic) ----

// A flat card/sign plane that faces the behind-camera (rotated π; its texture
// is pre-mirrored in makeTex so the text reads correctly).
function SignPlane({ tex, position, scale, tilt = 0 }: {
  tex: THREE.Texture; position: [number, number, number]; scale: [number, number]; tilt?: number
}) {
  return (
    <mesh position={position} rotation={[0, Math.PI + tilt, 0]} scale={[scale[0], scale[1], 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}


// Near: transverse "board-cell" lines across the track. Tiled by rungsRef so
// they stream under Leonard and sell the running speed.
function FloorRungs() {
  const N = 44, SPAN = 6
  return (
    <>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} position={[0, 0.015, i * SPAN]}>
          <boxGeometry args={[7.0, 0.02, 0.07]} />
          <meshStandardMaterial color={PAL.grid} emissive={PAL.grid} emissiveIntensity={0.45} />
        </mesh>
      ))}
    </>
  )
}

// A satirical sign stamped on an obstacle's camera-facing front.
function ObstacleLabel({ text, y, w = 3.0 }: { text: string; y: number; w?: number }) {
  const tex = useMemo(() => labelTexture(text), [text])
  return <SignPlane tex={tex} position={[0, y, -0.62]} scale={[w, w * 0.1875]} />
}

// High-altitude floating Gantt charts (tiled forward by ganttRef).
function GanttSky() {
  const texes = ganttTextures()
  const N = 7, SPAN = 22
  const items = useMemo(() => {
    const out: { x: number; y: number; z: number; tex: THREE.Texture; tilt: number }[] = []
    for (let i = 0; i < N; i++) {
      const z = i * SPAN
      out.push({ x: -18, y: 14 + (i % 2) * 4, z, tex: texes[i % texes.length], tilt: -0.5 })
      out.push({ x: 18, y: 16 + ((i + 1) % 2) * 4, z: z + SPAN / 2, tex: texes[(i + 2) % texes.length], tilt: 0.5 })
    }
    return out
  }, [texes])
  return (
    <>
      {items.map((g, i) => (
        // Huge — ~13×7 units, looming high overhead like billboards.
        <SignPlane key={i} tex={g.tex} position={[g.x, g.y, g.z]} scale={[13, 7.1]} tilt={g.tilt} />
      ))}
    </>
  )
}

// ---- The built-out world: a canyon of GIANT corporate-app towers ----
// Tinted box "buildings" flank the track at three depth rows (near → far
// skyline), heights jagged for a cityscape silhouette, the near ones wearing a
// huge app-window face. Tinted across app brand colors so the world is
// colorful, not all-blue. Tiled forward by cardsRef (SPAN must match the 12 in
// the useFrame tiling). Cosmetic only.
function Building({ x, z, w, h, tint, tex, eyes }: {
  x: number; z: number; w: number; h: number; tint: string; tex?: THREE.Texture; eyes?: boolean
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, w]} />
        {/* lit office-window grid on every face so the tower reads as a
            building, not a flat colored block */}
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.6} emissiveMap={windowMapTexture()} />
      </mesh>
      {tex && (
        <SignPlane
          tex={tex}
          position={[0, Math.min(h * 0.6, 13), -(w / 2) - 0.15]}
          scale={[w * 0.86, (w * 0.86) / 1.52]}
        />
      )}
      {eyes &&
        [-w * 0.22, w * 0.22].map((ex, i) => (
          <mesh key={i} position={[ex, h * 0.84, -(w / 2) - 0.06]}>
            <boxGeometry args={[w * 0.13, w * 0.13, 0.12]} />
            <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.3} />
          </mesh>
        ))}
    </group>
  )
}

// HERO STRUCTURE: a skyscraper-sized Jira ticket. A white rounded-"card" slab
// whose entire facade is a full Jira issue page, with a glowing status crown.
function TicketTower({ x, z, tex, status }: { x: number; z: number; tex: THREE.Texture; status: string }) {
  const W = 14, H = 32, D = 2.2
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[W, H, D]} radius={0.7} smoothness={2} position={[0, H / 2, 0]}>
        <meshStandardMaterial color="#ffffff" emissive="#9fb8e6" emissiveIntensity={0.05} />
      </RoundedBox>
      {/* glowing status crown across the top edge */}
      <mesh position={[0, H - 0.5, -D / 2 - 0.02]}>
        <boxGeometry args={[W - 1, 0.9, 0.2]} />
        <meshStandardMaterial color={status} emissive={status} emissiveIntensity={1.2} />
      </mesh>
      {/* the full Jira issue page facade (faces the camera) */}
      <SignPlane tex={tex} position={[0, H / 2, -D / 2 - 0.06]} scale={[W - 1.4, (W - 1.4) / TICKET_PAGE_ASPECT]} />
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════
// "Mountains of files" canyon walls — jagged geological masses of paperwork
// (policies, Figma flows, folders, spreadsheets, binders). A SEPARATE backdrop
// layer that never touches the track/lanes. Hidden below ground in Sprint 1;
// rises up into view as you near gate 1, then flanks you through Sprint 2+.
// Two identical tiles leapfrog for a seamless (pop-free) scroll.
// ════════════════════════════════════════════════════════════════════════
function drawDocBand(ctx: CanvasRenderingContext2D, y: number, W: number, h: number, type: string, i: number) {
  ctx.fillStyle = '#8c8068'; ctx.fillRect(0, y, W, 2) // stratum seam
  const yy = y + 3, hh = h - 4
  if (type === 'policy') {
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, yy, W, hh)
    ctx.fillStyle = '#5a3a2a'; ctx.font = 'bold 13px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText(['POLICY', 'HANDBOOK', 'SOP-' + (i + 1), 'COMPLIANCE'][i % 4], 10, yy + 4)
    ctx.fillStyle = '#cdc6b4'; for (let k = 0; k < 3; k++) ctx.fillRect(10, yy + 24 + k * 8, W - 80, 3)
  } else if (type === 'figma') {
    ctx.fillStyle = '#2c2c2c'; ctx.fillRect(0, yy, W, hh)
    ctx.fillStyle = '#a259ff'; ctx.fillRect(10, yy + 8, 22, hh - 16)
    ctx.fillStyle = '#1abcfe'; ctx.fillRect(38, yy + 8, 22, hh - 16)
    ctx.fillStyle = '#0acf83'; ctx.fillRect(66, yy + 8, 22, hh - 16)
    ctx.fillStyle = '#fff'; ctx.font = '11px "Helvetica Neue", Arial, sans-serif'; ctx.textBaseline = 'middle'
    ctx.fillText('Figma · Product Flow', 100, yy + hh / 2)
  } else if (type === 'folder') {
    ctx.fillStyle = '#d9b876'; ctx.fillRect(0, yy, W, hh)
    ctx.fillStyle = '#c19a4e'; ctx.fillRect(14, yy - 1, 58, 9)
  } else if (type === 'sheet') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, yy, W, hh)
    ctx.strokeStyle = '#dfe1e6'; ctx.lineWidth = 1
    for (let gx = 0; gx < W; gx += 28) { ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx, yy + hh); ctx.stroke() }
  } else {
    ctx.fillStyle = ['#0052cc', '#bf2600', '#006644', '#403294'][i % 4]; ctx.fillRect(0, yy, W, hh)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(['Q3 PAPERWORK', 'ONBOARDING', 'PRD v7', 'SOW_FINAL'][i % 4], 12, yy + hh / 2)
  }
}
function drawFileStrata(ctx: CanvasRenderingContext2D, variant: number) {
  const W = 256, H = 256, bands = 8, bh = H / bands
  const order = ['policy', 'figma', 'folder', 'sheet', 'binder', 'policy', 'folder', 'figma']
  ctx.fillStyle = '#ddd6c4'; ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < bands; i++) drawDocBand(ctx, i * bh, W, bh, order[(i + variant) % order.length], i)
}
const FILE_TINTS = ['#efe9da', '#e7d3a6', '#dfe6f0', '#e8ded0']
let _fileTex: THREE.Texture[] | null = null
function fileMountainTextures(): THREE.Texture[] {
  if (!_fileTex) _fileTex = [0, 1, 2].map((v) => makeTex(256, 256, (c) => drawFileStrata(c, v)))
  return _fileTex
}
// A jagged mountain of stacked, narrowing, slightly-staggered file slabs.
function FileMountain({ x, z, w, h, tex, tint }: { x: number; z: number; w: number; h: number; tex: THREE.Texture; tint: string }) {
  const layers = 3, segH = h / layers
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: layers }).map((_, i) => {
        const f = i / (layers - 1)
        const lw = w * (1 - 0.5 * f)
        const ly = i * segH + segH / 2
        const ox = Math.sin(i * 2.1 + x) * w * 0.13
        const tilt = Math.sin(i * 1.7 + z) * 0.05
        return (
          <mesh key={i} position={[ox, ly, 0]} rotation={[0, 0, tilt]}>
            <boxGeometry args={[lw, segH + 0.6, lw]} />
            <meshStandardMaterial color={tint} map={tex} emissive={tint} emissiveIntensity={0.05} />
          </mesh>
        )
      })}
    </group>
  )
}
const FILEWALL_SPAN = 24
const FILEWALL_N = 7
const FILEWALL_LEN = FILEWALL_SPAN * FILEWALL_N // 168 — two tiles leapfrog by this
// Jagged file-mountain canyon walls. CLOSE walls hug the track (inner edge just
// past the ±5.5 floor) so you're genuinely INSIDE a rugged slot canyon, with a
// taller ridge stacked just behind for depth + a jagged "mountains of work"
// silhouette. (Sprint 1's ticket towers have sunk by the time these are up, so
// the close band has the space to itself — no interpenetration.)
function FileWalls() {
  const tex = fileMountainTextures()
  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; w: number; h: number; tex: THREE.Texture; tint: string }> = []
    for (let i = 0; i < FILEWALL_N; i++) {
      const z = i * FILEWALL_SPAN
      // CLOSE walls — right up against the track (inner edge ≈ x6), towering
      const ch = 30 + (Math.sin(i * 1.4) * 0.5 + 0.5) * 22 // 30–52 tall
      out.push({ x: -14, z, w: 16, h: ch, tex: tex[i % 3], tint: FILE_TINTS[i % 4] })
      out.push({ x: 14, z: z + 9, w: 16, h: ch * 0.9, tex: tex[(i + 1) % 3], tint: FILE_TINTS[(i + 1) % 4] })
      // taller ridge just behind — the "mountains of work" looming over the rim
      const fh = 50 + (Math.sin(i * 2.3 + 1) * 0.5 + 0.5) * 34 // 50–84 tall
      out.push({ x: -40, z: z + 5, w: 34, h: fh, tex: tex[(i + 2) % 3], tint: FILE_TINTS[(i + 2) % 4] })
      out.push({ x: 40, z: z + 17, w: 34, h: fh * 0.9, tex: tex[i % 3], tint: FILE_TINTS[(i + 3) % 4] })
    }
    return out
  }, [tex])
  return <>{items.map((b, i) => <FileMountain key={i} {...b} />)}</>
}

// ════════════════════════════════════════════════════════════════════════
// DESKTOP BIOME — macOS "Tahoe" wallpaper world. Swaps in for Sprint 3+ (the
// run toward the 3rd gate): the corporate ticket-canyon + file mountains SINK
// away and THIS rises in their place — stylized granite rocks (the Apple
// desktop wallpaper), a shimmering lake you run alongside, and oversized
// desktop clutter (stray screenshots, folders, app icons — the files people
// never clean off their desktop). All COSMETIC; track/lanes/obstacles/
// difficulty are untouched. Two tiles leapfrog per layer for a seamless scroll.
// ════════════════════════════════════════════════════════════════════════
// ── per-sprint sky + light palette (blended by which landscape you're in, so it
// handles the forward journey AND Sprint 4's reverse). Three run biomes: the
// corporate towers (S1 + S4 return), the canyon (S2 + S4 return), the desktop
// (S3). The office is the win SCREEN, not a run biome. ──
const SKY_NAVY = new THREE.Color(PAL.skyTop) // corporate tower world
const SKY_CANYON = new THREE.Color('#bf7a30') // Antelope-canyon gold
const SKY_TAHOE = new THREE.Color('#cdecff') // sunny Mac-desktop sky
// ambient (fill) colour per biome
const AMB_CORP = new THREE.Color('#ffffff')
const AMB_CANYON = new THREE.Color('#ffb060') // amber fill — Antelope sandstone
const AMB_DESK = new THREE.Color('#fff4e0') // warm sunlight fill
// directional (key/sun) colour per biome
const DIR_CORP = new THREE.Color('#ffffff')
const DIR_CANYON = new THREE.Color('#ffd58a') // golden sun shaft
const DIR_DESK = new THREE.Color('#fff1cf') // bright warm sun
// light intensities per biome, indices [corp, canyon, desk(sunny)]
const AMB_I = [1.0, 0.9, 1.2]
const DIR_I = [0.95, 1.3, 1.5]
const _skyScratch = new THREE.Color()
const _ambScratch = new THREE.Color()
const _dirScratch = new THREE.Color()
// weighted RGB blend of three colours into `out` (linear space, like lerpColors)
function blendBiome(out: THREE.Color, c0: THREE.Color, c1: THREE.Color, c2: THREE.Color, w0: number, w1: number, w2: number) {
  const t = w0 + w1 + w2 || 1
  out.r = (c0.r * w0 + c1.r * w1 + c2.r * w2) / t
  out.g = (c0.g * w0 + c1.g * w1 + c2.g * w2) / t
  out.b = (c0.b * w0 + c1.b * w1 + c2.b * w2) / t
  return out
}
function blend3n(v: number[], w0: number, w1: number, w2: number) {
  const t = w0 + w1 + w2 || 1
  return (v[0] * w0 + v[1] * w1 + v[2] * w2) / t
}
const DESK_SPAN = 26
const DESK_N = 7
const DESK_LEN = DESK_SPAN * DESK_N

// ── per-sprint landscape band math ──
const BIOME_HIDDEN = 130 // units a landscape sits below the floor when inactive
const BIOME_LEAD = 130 // units before a gate the next landscape starts rising (see it coming)
const BIOME_TRAIL = 95 // units after a gate the previous landscape finishes sinking — long enough that the outgoing biome's light/scene crossfades out gently instead of yanking away at the gate
function levelSpan(L: number): number { return runwayForLevel(L) + LEVEL_DISTANCE + 8 }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v }
// smoothstep easing — zero slope at both ends, so a landscape (and its sky/
// light) eases IN and OUT instead of starting/stopping with a hard linear
// "kink". Those kinks are what read as the scene/lighting changing "all of a
// sudden"; easing them makes every sprint→sprint transition feel seamless.
function smooth01(v: number): number { const x = clamp01(v); return x * x * (3 - 2 * x) }
const REV_LEAD = 70 // shorter "see it coming" lead for Sprint 4's reverse legs, so each (desktop→canyon→office) reads distinctly inside one sprint
// rises 0→1 over [B-LEAD, B]: full once you reach boundary B, "coming up" before it
function riseAt(z: number, B: number): number { return smooth01((z - (B - BIOME_LEAD)) / BIOME_LEAD) }
function riseAtL(z: number, B: number, lead: number): number { return smooth01((z - (B - lead)) / lead) }
// sinks 0→1 over [B, B+TRAIL]: still up at boundary B, gone gently after
function sinkAt(z: number, B: number): number { return smooth01((z - B) / BIOME_TRAIL) }
// Raise/sink each child of a tiling layer by its OWN world-z. up=1 → authored
// rest height; up=0 → parked BIOME_HIDDEN below the floor. Because it's a pure
// function of world-z, the leapfrog recycle stays seamless (no pop).
function bandLayer(group: THREE.Group | null, up: (worldZ: number) => number) {
  if (!group) return
  const kids = group.children
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]
    if (c.userData.baseY === undefined) c.userData.baseY = c.position.y
    const worldZ = group.position.z + c.position.z
    c.position.y = (c.userData.baseY as number) - BIOME_HIDDEN * (1 - up(worldZ))
  }
}

// ── shimmering lake ──
let _waterTex: THREE.CanvasTexture | null = null
function waterTexture(): THREE.CanvasTexture {
  if (!_waterTex) {
    _waterTex = makeTex(256, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256)
      g.addColorStop(0, '#3aa3d6'); g.addColorStop(0.5, '#2487c4'); g.addColorStop(1, '#176fa8')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
      // tileable sun-glint streaks
      for (let i = 0; i < 26; i++) {
        ctx.globalAlpha = 0.08 + 0.16 * Math.random()
        ctx.fillStyle = '#e3f6ff'
        ctx.fillRect(0, (i * 9.85) % 256, 256, 1 + Math.random() * 2)
      }
      // sparkle dabs
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.5 + 0.4 * Math.random()
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        const r = 0.6 + Math.random() * 1.5
        ctx.fillRect(Math.random() * 256, Math.random() * 256, r, r)
      }
      ctx.globalAlpha = 1
    })
    _waterTex.wrapS = THREE.RepeatWrapping
    _waterTex.wrapT = THREE.RepeatWrapping
    _waterTex.repeat.set(3, 2)
  }
  return _waterTex
}
// Tiled into DESK_SPAN segments per side so each strip can rise on its own as
// it nears the shoreline (so the lake "comes up in the distance", not all at once).
function LakeWater() {
  const tex = waterTexture()
  const segs = useMemo(() => {
    const out: Array<{ x: number; z: number }> = []
    for (let i = 0; i < DESK_N; i++) {
      const z = i * DESK_SPAN
      out.push({ x: -30, z }) // left bank (x ≈ 6 → 54)
      out.push({ x: 30, z }) // right bank
    }
    return out
  }, [])
  return (
    <>
      {segs.map((s, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, 0, s.z]}>
          <planeGeometry args={[48, DESK_SPAN + 0.6]} />
          <meshStandardMaterial map={tex} color="#dff2ff" emissive="#2487c4" emissiveIntensity={0.32} roughness={0.35} metalness={0.1} />
        </mesh>
      ))}
    </>
  )
}

// ── stylized granite rocks (the Apple Tahoe wallpaper) ──
const ROCK_TINTS = ['#c9bda4', '#bcae95', '#d3c9b4', '#a99e87', '#c2b59c']
function RockMass({ x, z, w, h, seed, tint }: { x: number; z: number; w: number; h: number; seed: number; tint: string }) {
  // 2 smooth boulders nested into a craggy mass (low-poly but smooth-shaded).
  return (
    <group position={[x, 0, z]}>
      {[0, 1].map((i) => {
        const rw = w * (0.62 - 0.16 * i)
        const rh = h * (0.72 - 0.2 * i)
        const ox = Math.sin(seed + i * 2.1) * w * 0.16
        const oz = Math.cos(seed + i * 1.7) * w * 0.14
        return (
          <mesh
            key={i}
            position={[ox, rh * 0.5, oz]}
            rotation={[Math.sin(seed + i) * 0.22, seed + i * 1.3, Math.cos(seed + i) * 0.18]}
            scale={[rw, rh, rw]}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={tint} roughness={0.96} metalness={0} />
          </mesh>
        )
      })}
    </group>
  )
}
function TahoeRocks() {
  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; w: number; h: number; seed: number; tint: string }> = []
    for (let i = 0; i < DESK_N; i++) {
      const z = i * DESK_SPAN
      const nh = 16 + (Math.sin(i * 1.4) * 0.5 + 0.5) * 16 // near shoreline boulders
      out.push({ x: -56, z, w: 26, h: nh, seed: i + 1, tint: ROCK_TINTS[i % 5] })
      out.push({ x: 56, z: z + 13, w: 26, h: nh * 0.9, seed: i + 9, tint: ROCK_TINTS[(i + 1) % 5] })
      const fh = 30 + (Math.sin(i * 2.1 + 1) * 0.5 + 0.5) * 26 // far Tahoe ridge
      out.push({ x: -84, z: z + 7, w: 38, h: fh, seed: i + 4, tint: ROCK_TINTS[(i + 2) % 5] })
      out.push({ x: 84, z: z + 20, w: 38, h: fh * 0.92, seed: i + 6, tint: ROCK_TINTS[(i + 3) % 5] })
    }
    return out
  }, [])
  return <>{items.map((r, i) => <RockMass key={i} {...r} />)}</>
}

// ── stray desktop clutter (the files nobody cleans up) ──
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
function drawIconLabel(ctx: CanvasRenderingContext2D, label: string) {
  ctx.font = 'bold 21px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  const words = label.split(' ')
  const lines: string[] = []
  let line = ''
  for (const wd of words) {
    if (ctx.measureText(line + ' ' + wd).width > 224 && line) { lines.push(line); line = wd }
    else line = line ? line + ' ' + wd : wd
  }
  lines.push(line)
  lines.slice(0, 2).forEach((ln, i) => {
    const y = 202 + i * 26
    const w = ctx.measureText(ln).width
    ctx.fillStyle = 'rgba(20,30,45,0.58)'
    roundRectPath(ctx, 128 - w / 2 - 8, y - 2, w + 16, 24, 6); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.fillText(ln, 128, y)
  })
}
function drawFolderIcon(ctx: CanvasRenderingContext2D, label: string) {
  const x = 48, y = 64, w = 160, h = 112
  ctx.fillStyle = '#4aa9ef'
  roundRectPath(ctx, x, y - 15, 72, 28, 8); ctx.fill() // tab
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#86cdf9'); g.addColorStop(1, '#3a97e8')
  ctx.fillStyle = g
  roundRectPath(ctx, x, y, w, h, 14); ctx.fill()
  drawIconLabel(ctx, label)
}
function drawScreenshotIcon(ctx: CanvasRenderingContext2D, label: string) {
  const x = 40, y = 46, w = 176, h = 128
  ctx.fillStyle = '#ffffff'; roundRectPath(ctx, x, y, w, h, 12); ctx.fill()
  ctx.fillStyle = '#e8ebf0'; roundRectPath(ctx, x, y, w, 26, 12); ctx.fill()
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 15 + i * 16, y + 13, 5, 0, 7); ctx.fill() })
  ctx.fillStyle = '#cdd6e3'
  for (let r = 0; r < 4; r++) ctx.fillRect(x + 12, y + 42 + r * 18, w - 24 - (r % 2) * 34, 8)
  drawIconLabel(ctx, label)
}
function drawAppIcon(ctx: CanvasRenderingContext2D, c1: string, c2: string, glyph: string, label: string) {
  const g = ctx.createLinearGradient(0, 40, 0, 182)
  g.addColorStop(0, c1); g.addColorStop(1, c2)
  ctx.fillStyle = g
  roundRectPath(ctx, 58, 40, 140, 142, 32); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 80px -apple-system, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glyph, 128, 113)
  drawIconLabel(ctx, label)
}
function drawDocIcon(ctx: CanvasRenderingContext2D, ext: string, tint: string, label: string) {
  const x = 64, y = 38, w = 128, h = 152
  ctx.fillStyle = '#ffffff'; roundRectPath(ctx, x, y, w, h, 10); ctx.fill()
  ctx.fillStyle = '#dfe3ea'; ctx.beginPath(); ctx.moveTo(x + w - 34, y); ctx.lineTo(x + w, y + 34); ctx.lineTo(x + w - 34, y + 34); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#c7cedb'; for (let r = 0; r < 4; r++) ctx.fillRect(x + 14, y + 20 + r * 15, w - 28, 6)
  ctx.fillStyle = tint; roundRectPath(ctx, x + 6, y + h - 44, 86, 32, 6); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.font = 'bold 21px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(ext, x + 15, y + h - 27)
  drawIconLabel(ctx, label)
}
let _deskIcons: THREE.Texture[] | null = null
function desktopIconTextures(): THREE.Texture[] {
  if (!_deskIcons) {
    _deskIcons = [
      makeTex(256, 256, (c) => drawScreenshotIcon(c, 'Screenshot 2026-05-31 at 10.45.12 AM.png')),
      makeTex(256, 256, (c) => drawFolderIcon(c, 'Untitled folder')),
      makeTex(256, 256, (c) => drawFolderIcon(c, 'old stuff DONT DELETE')),
      makeTex(256, 256, (c) => drawDocIcon(c, 'XLS', '#107C41', 'Q3_OKRs_FINAL_final.xlsx')),
      makeTex(256, 256, (c) => drawDocIcon(c, 'PDF', '#d4302a', 'do_not_open.pdf')),
      makeTex(256, 256, (c) => drawScreenshotIcon(c, 'IMG_4821.PNG')),
      makeTex(256, 256, (c) => drawAppIcon(c, '#5b8def', '#3b5bdb', '◷', 'Zoom')),
      makeTex(256, 256, (c) => drawAppIcon(c, '#ffd76b', '#fcab1a', '✎', 'Notes')),
    ]
  }
  return _deskIcons
}
function DesktopIcon({ x, z, tex, s }: { x: number; z: number; tex: THREE.Texture; s: number }) {
  // a camera-facing standee floating just above the lake surface
  return <SignPlane tex={tex} position={[x, s * 0.5 + 0.2, z]} scale={[s, s]} />
}
function DesktopClutter() {
  const icons = desktopIconTextures()
  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; tex: THREE.Texture; s: number }> = []
    for (let i = 0; i < DESK_N; i++) {
      const z = i * DESK_SPAN
      const sgn = i % 2 ? 1 : -1
      // bigger, chunkier desktop clutter so the stray files read clearly
      out.push({ x: sgn * (11 + ((i * 7) % 24)), z: z + 3, tex: icons[i % icons.length], s: 5.5 + (i % 3) * 1.5 })
      out.push({ x: -sgn * (19 + ((i * 5) % 20)), z: z + 13, tex: icons[(i + 3) % icons.length], s: 4.6 + (i % 2) * 1.4 })
      out.push({ x: sgn * (33 + ((i * 3) % 12)), z: z + 21, tex: icons[(i + 5) % icons.length], s: 7.0 })
    }
    return out
  }, [icons])
  return <>{items.map((c, i) => <DesktopIcon key={i} {...c} />)}</>
}

// ════════════════════════════════════════════════════════════════════════
// FINISH LINE — a giant office "screen" standing just past the final green
// gate. Cross the gate and Leonard LEAPS through it (win cinematic), bursting
// out of the computer and into the office. The screen shows the office itself.
// ════════════════════════════════════════════════════════════════════════
const WIN_CINE_DUR = 1.35 // seconds Leonard spends leaping up + through the screen (camera dives in)
let _officeScreenTex: THREE.CanvasTexture | null = null
function officeScreenTexture(): THREE.CanvasTexture {
  if (!_officeScreenTex) {
    // Recreation of the PHASE-1 office: off-white walls, fluorescent ceiling,
    // blonde wood-plank floor, the brand-teal accent wall, dark-framed windows,
    // and a row of desks with glowing monitors. (Severance/Lumon bones.)
    _officeScreenTex = makeTex(512, 320, (ctx) => {
      const FLOOR_Y = 198
      ctx.fillStyle = '#eef0f1'; ctx.fillRect(0, 0, 512, 320) // off-white walls
      // ceiling + fluorescent panels
      ctx.fillStyle = '#e6e9ec'; ctx.fillRect(0, 0, 512, 40)
      ctx.fillStyle = '#fdfeff'; for (let x = 22; x < 512; x += 86) ctx.fillRect(x, 11, 58, 17)
      // brand-teal accent wall (centre) with a Lumon-ish values plaque
      ctx.fillStyle = '#5e9a96'; ctx.fillRect(146, 40, 220, FLOOR_Y - 40)
      ctx.fillStyle = '#cfe9e6'; ctx.font = 'bold 22px "Helvetica Neue", Arial, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A L I G N L Y', 256, 92)
      ctx.font = '12px "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle = '#e7f4f2'
      ctx.fillText('Probity · Verve · Wit', 256, 116)
      // dark-framed daylight windows flanking the accent wall
      ctx.textAlign = 'left'
      for (const x of [36, 392]) {
        ctx.fillStyle = '#2a2f33'; ctx.fillRect(x - 5, 66, 94, 100)
        ctx.fillStyle = '#cfe0e6'; ctx.fillRect(x, 72, 84, 88)
        ctx.fillStyle = '#2a2f33'; ctx.fillRect(x + 40, 72, 4, 88); ctx.fillRect(x, 112, 84, 4) // mullions
      }
      // blonde wood-plank floor with converging perspective seams
      ctx.fillStyle = '#c8a878'; ctx.fillRect(0, FLOOR_Y, 512, 320 - FLOOR_Y)
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(512, FLOOR_Y); ctx.stroke()
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath(); ctx.moveTo(256 + i * 40, FLOOR_Y); ctx.lineTo(256 + i * 96, 320); ctx.stroke()
      }
      // a row of desks with glowing monitors
      for (let i = 0; i < 4; i++) {
        const x = 78 + i * 120
        ctx.fillStyle = '#8a6a44'; ctx.fillRect(x - 34, FLOOR_Y + 4, 68, 8) // wood desk top
        ctx.fillStyle = '#10151f'; ctx.fillRect(x - 22, FLOOR_Y - 22, 44, 26) // monitor
        ctx.fillStyle = '#2a6cff'; ctx.fillRect(x - 18, FLOOR_Y - 18, 36, 18) // screen glow
      }
    })
  }
  return _officeScreenTex
}
// Giant framed "monitor" showing the office. Positioned at the finish each
// frame by winScreenRef; hidden until the final gate is in play.
function GiantOfficeScreen() {
  const tex = officeScreenTexture()
  const W = 26, H = 16
  return (
    <group>
      {/* dark monitor bezel behind, glowing */}
      <mesh position={[0, H / 2, 0.35]}>
        <boxGeometry args={[W + 2.8, H + 2.8, 1.5]} />
        <meshStandardMaterial color="#0b1018" emissive="#1f3a66" emissiveIntensity={0.5} />
      </mesh>
      {/* the office on the screen (faces the behind-camera) */}
      <SignPlane tex={tex} position={[0, H / 2, -0.44]} scale={[W, H]} />
    </group>
  )
}

function BuildingCanyon() {
  const pages = ticketPageTextures()
  const winTex = backdropWindowTextures()
  // App-brand tints so the skyline is multicolored corporate, not all blue.
  const TINTS = ['#0747a6', '#107C41', '#4A154B', '#0F6CBD', '#7a1d12', '#1a4d8f', '#3a4f7a']
  const SPAN = 24 // must match the cardsRef tiling stride in useFrame
  const N = 7
  const items = useMemo(() => {
    const towers: Array<{ x: number; z: number; tex: THREE.Texture; status: string }> = []
    const mids: Array<{ x: number; z: number; w: number; h: number; tint: string; tex: THREE.Texture }> = []
    const fars: Array<{ x: number; z: number; w: number; h: number; tint: string; eyes: boolean }> = []
    for (let i = 0; i < N; i++) {
      const z = i * SPAN
      // hero ticket towers — alternate sides every 12u for a canyon rhythm
      towers.push({ x: -12.5, z, tex: pages[i % pages.length], status: TICKET_PAGES[i % TICKET_PAGES.length].status })
      towers.push({ x: 12.5, z: z + SPAN / 2, tex: pages[(i + 1) % pages.length], status: TICKET_PAGES[(i + 1) % TICKET_PAGES.length].status })
      // mid towers wearing app-window faces (Calendar/Excel/Chrome/Email/Jira)
      const mh = 22 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 12
      mids.push({ x: -24, z: z + 6, w: 11, h: mh, tint: TINTS[i % TINTS.length], tex: winTex[(i * 3) % winTex.length] })
      mids.push({ x: 24, z: z + 18, w: 11, h: mh * 0.9, tint: TINTS[(i + 2) % TINTS.length], tex: winTex[(i * 3 + 2) % winTex.length] })
      // far skyline — tall tinted silhouettes; a few "watch" you
      const fh = 34 + (Math.sin(i * 2.3 + 1) * 0.5 + 0.5) * 16
      fars.push({ x: -38, z: z + 3, w: 17, h: fh, tint: TINTS[(i + 1) % TINTS.length], eyes: i % 2 === 0 })
      fars.push({ x: 38, z: z + 14, w: 17, h: fh * 0.92, tint: TINTS[(i + 4) % TINTS.length], eyes: false })
    }
    return { towers, mids, fars }
  }, [pages, winTex])
  return (
    <>
      {items.fars.map((b, i) => <Building key={'far' + i} {...b} />)}
      {items.mids.map((b, i) => <Building key={'mid' + i} {...b} />)}
      {items.towers.map((t, i) => <TicketTower key={'tic' + i} {...t} />)}
    </>
  )
}

// Slack-message face on a jump-block (the "got a sec? / quick sync" pings).
function SlackCard({ seedId, full }: { seedId: number; full: boolean }) {
  const tex = slackTextures()[seedId % SLACK_MSGS.length]
  const s = full ? 4.4 : 2.8
  return <SignPlane tex={tex} position={[0, 0.95, -0.62]} scale={[s, s * 0.441]} />
}

// Slide-under banner face: a mix of Outlook invites, cookie-consent bars, and
// [EXTERNAL] email warnings (town halls / popups you duck under). Single-lane
// banners SWEEP across the track for real (their parent group is driven by
// bannerSweepX in ObstacleMesh) — so here we only add a gentle tilt to keep it
// feeling alive; the lateral motion lives one level up where collision can see
// it. (Full-width forced-slide banners don't sweep — no lateral room.)
function BannerCard({ seedId, full }: { seedId: number; full: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const pool = bannerTextures()
  const tex = pool[seedId % pool.length]
  const s = full ? 5.0 : 3.4
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5 + seedId * 1.3) * 0.05
  })
  return (
    <group ref={ref}>
      <SignPlane tex={tex} position={[0, 1.95, -0.4]} scale={[s, s * 0.357]} />
    </group>
  )
}


// ⭐ Story-point token — spinning gold gem floating in a lane.
function TokenMesh({ token }: { token: Token }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 3
  })
  return (
    <mesh ref={ref} position={[LANES[token.lane], TOKEN_Y, token.z]}>
      <octahedronGeometry args={[0.34, 0]} />
      <meshStandardMaterial color={PAL.update} emissive={PAL.update} emissiveIntensity={0.6} />
    </mesh>
  )
}

// ---- Obstacle rendering ----
function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const laneXs =
    obstacle.lanes === 'full' ? [0] : obstacle.lanes.map((l) => LANES[l])
  const full = obstacle.lanes === 'full'
  const moving = isMovingOverhang(obstacle) // single-lane "calendar invite" banner that sweeps the lanes

  // Slack notifications POP UP as they come into range (like a ping appearing),
  // scaling in with a little overshoot. Other obstacles are unaffected.
  const grpRef = useRef<THREE.Group>(null)
  const sweepRef = useRef<THREE.Group>(null) // carries the live lateral sweep of a moving banner
  const pop = useRef({ started: false, t: 0 })
  const isSlack = obstacle.kind === 'block'
  useFrame((_, dt) => {
    if (isSlack && grpRef.current) {
      const p = pop.current
      if (!p.started && obstacle.z - runnerAnim.z < 72) p.started = true
      if (p.started && p.t < 1) p.t = Math.min(1, p.t + dt / 0.28)
      let sc = 0.0001
      if (p.started) { const x = p.t - 1; sc = Math.max(0.0001, 1 + 2.70158 * x * x * x + 1.70158 * x * x) }
      grpRef.current.scale.setScalar(sc)
    }
    // The banner physically slides across the lanes — exactly tracking the
    // collision position (a pure fn of Leonard's z), so dodging it actually
    // matters. runnerAnim.z is refreshed earlier this frame by the main loop.
    if (moving && sweepRef.current) sweepRef.current.position.x = bannerSweepX(obstacle, runnerAnim.z)
  })

  return (
    <group ref={grpRef} position={[0, 0, obstacle.z]}>
      {moving ? (
        <group ref={sweepRef}>
          <ObstaclePiece kind="overhang" x={0} full={false} seedId={obstacle.id} face updateNo={1} />
        </group>
      ) : (
        laneXs.map((x, i) => (
          // The themed "face" (Slack card / Outlook invite / sign) renders on the
          // first piece only, so multi-lane hazards don't repeat it twice.
          <ObstaclePiece key={i} kind={obstacle.kind} x={full ? 0 : x} full={full} seedId={obstacle.id} face={i === 0} updateNo={obstacle.updateNo ?? 1} />
        ))
      )}
    </group>
  )
}

function ObstaclePiece({ kind, x, full, seedId, face, updateNo = 1 }: { kind: ObstacleKind; x: number; full: boolean; seedId: number; face: boolean; updateNo?: number }) {
  const w = full ? 7.0 : 1.8
  const lw = full ? 4.6 : 2.8 // label plaque width
  if (kind === 'block') {
    return (
      <group position={[x, 0, 0]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[w, 1.4, 1.1]} />
          <meshStandardMaterial color="#3F0E40" emissive="#3F0E40" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[w, 0.08, 1.1]} />
          <meshStandardMaterial color="#611f69" emissive="#611f69" emissiveIntensity={0.6} />
        </mesh>
        {face && <SlackCard seedId={seedId} full={full} />}
      </group>
    )
  }
  if (kind === 'gap') {
    // a swirling "problem hole" you JUMP over — scope creep / rabbit hole /
    // can of worms: glowing red rim + black void + a sucking vortex + a sign.
    return (
      <group position={[x, 0, 0]}>
        {/* glowing red rim */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 0.5, 3.0]} />
          <meshStandardMaterial color={PAL.gap} emissive={PAL.gap} emissiveIntensity={0.7} />
        </mesh>
        {/* black void */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, 2.6]} />
          <meshBasicMaterial color="#050608" />
        </mesh>
        {/* sucking vortex (red spiral + tumbling ticket fragments) */}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, 2.6]} />
          <meshBasicMaterial map={holeTexture()} transparent toneMapped={false} />
        </mesh>
        {face && <ObstacleLabel text={GAP_THEMES[seedId % GAP_THEMES.length]} y={0.95} w={lw} />}
      </group>
    )
  }
  if (kind === 'overhang') {
    // head-height bar — slide under it; posts down to the floor as a gate
    return (
      <group position={[x, 0, 0]}>
        <mesh position={[0, 1.85, 0]}>
          <boxGeometry args={[w, 0.55, 0.6]} />
          <meshStandardMaterial color={PAL.overhang} emissive={PAL.overhang} emissiveIntensity={0.3} />
        </mesh>
        {(full ? [-3.4, 3.4] : [-0.85, 0.85]).map((px) => (
          <mesh key={px} position={[px, 0.95, 0]}>
            <boxGeometry args={[0.12, 1.9, 0.12]} />
            <meshStandardMaterial color={PAL.overhang} />
          </mesh>
        ))}
        {face && <BannerCard seedId={seedId} full={full} />}
      </group>
    )
  }
  if (kind === 'wall') {
    // The "go around" dependency wall — too tall to jump, solid to the floor.
    // Now reads explicitly as a BLOCKED barrier ("🚫 BLOCKED — Waiting on: X")
    // so its meaning is obvious. The blocker face shows on every segment.
    const fw = full ? 2.2 : 1.6
    return (
      <group position={[x, 0, 0]}>
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[w, 3.4, 0.9]} />
          <meshStandardMaterial color={PAL.wall} emissive={PAL.wall} emissiveIntensity={0.18} />
        </mesh>
        <SignPlane
          tex={blockerTexture(WALL_WAITING[seedId % WALL_WAITING.length])}
          position={[0, 1.7, -0.48]}
          scale={[fw, fw / (256 / 384)]}
        />
      </group>
    )
  }
  // board — a GIANT "TICKET n UPDATED ✓" Jira card you run through to deposit
  // the update + clear the sprint. Green glowing frame + the big card.
  const gateW = 8.0
  return (
    <group position={[0, 0, 0]}>
      {/* green glowing frame */}
      <mesh position={[0, 4.1, 0]}>
        <boxGeometry args={[gateW + 0.6, 0.7, 0.4]} />
        <meshStandardMaterial color={PAL.board} emissive={PAL.board} emissiveIntensity={0.7} />
      </mesh>
      {[-(gateW / 2 + 0.1), gateW / 2 + 0.1].map((px) => (
        <mesh key={px} position={[px, 2.1, 0]}>
          <boxGeometry args={[0.4, 4.2, 0.4]} />
          <meshStandardMaterial color={PAL.board} emissive={PAL.board} emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* faint green wash so the whole gate glows */}
      <mesh position={[0, 2.15, 0.1]}>
        <planeGeometry args={[gateW, 4.1]} />
        <meshBasicMaterial color={PAL.board} transparent opacity={0.14} side={THREE.DoubleSide} />
      </mesh>
      {/* the giant updated-ticket card (faces the camera; you run through it) */}
      <mesh position={[0, 2.15, 0]} rotation={[0, Math.PI, 0]} scale={[gateW - 0.6, (gateW - 0.6) / (GATE_W / GATE_H), 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={updatedGateTexture(updateNo)} transparent opacity={0.96} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
