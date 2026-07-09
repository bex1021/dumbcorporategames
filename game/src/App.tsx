// Router root for dumbcorporategames.com.
//
// `/`              → studio portfolio landing (Landing.tsx)
// `/blocked`       → Blocked product/info page (Blocked.tsx)
// `/play/blocked`  → the actual Blocked 3D game (Game.tsx — was the old App.tsx)
//
// Game is lazy-loaded so the marketing pages stay instant; the ~15 MB of
// GLBs only fetch when someone clicks through to /play/blocked. Suspense
// fallback shows a small splash during the JS chunk download.

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Landing from './routes/Landing'
import Blocked from './routes/Blocked'
import Play from './routes/Play'
import MusicLab from './routes/MusicLab'
import { KeyboardGate } from './ui/KeyboardGate'

const Game = lazy(() => import('./routes/Game'))
// Phase 2 — Jira Run (8-bit endless runner). Lazy so its R3F chunk only
// loads when someone hits /play/jira-run.
const JiraRun = lazy(() => import('./jirarun/JiraRun'))
// Phase 3 — Lunch Dash (driving). Lazy so its R3F chunk only loads at
// /play/lunch-dash.
const LunchDash = lazy(() => import('./lunchdash/LunchDash'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Landing />} />
        <Route path="/play"        element={<Play />} />
        <Route path="/play/music"  element={<MusicLab />} />
        <Route path="/blocked"     element={<Blocked />} />
        {/* All three games are keyboard-only; KeyboardGate shows touch-only
            devices a deadpan IT notice (with an escape hatch) instead of an
            unplayable canvas. It also short-circuits the multi-MB GLB fetch
            those visitors would otherwise pay for. */}
        <Route
          path="/play/blocked"
          element={
            <KeyboardGate>
              <Suspense fallback={<RouteSplash />}>
                <Game />
              </Suspense>
            </KeyboardGate>
          }
        />
        <Route
          path="/play/jira-run"
          element={
            <KeyboardGate>
              <Suspense fallback={<RouteSplash />}>
                <JiraRun />
              </Suspense>
            </KeyboardGate>
          }
        />
        <Route
          path="/play/lunch-dash"
          element={
            <KeyboardGate>
              <Suspense fallback={<RouteSplash />}>
                <LunchDash />
              </Suspense>
            </KeyboardGate>
          }
        />
        {/* Catch-all: send unknown paths back to landing */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}

// Minimal splash shown while the Game route's JS chunk is downloading.
function RouteSplash() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: '#f1f0ec',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace',
        color: '#5a5a5a', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}
    >
      LOADING WORKSPACE …
    </div>
  )
}
