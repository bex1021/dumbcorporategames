// Router root for dumbcorporategames.com.
//
// `/`         → portfolio landing page (Landing.tsx)
// `/blocked`  → the Blocked game (Game.tsx — was the old App.tsx)
//
// Game is lazy-loaded so the landing page is instant; the ~15 MB of GLBs
// only fetch when someone clicks through to /blocked. Suspense fallback
// shows a small loading splash during the JS chunk download.

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Landing from './routes/Landing'

const Game = lazy(() => import('./routes/Game'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/blocked"
          element={
            <Suspense fallback={<RouteSplash />}>
              <Game />
            </Suspense>
          }
        />
        {/* Catch-all: send unknown paths back to landing */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}

// Minimal splash shown while the Game route's JS chunk is downloading.
// The full GLB loading screen takes over after the chunk lands.
function RouteSplash() {
  return (
    <div className="fixed inset-0 z-50 bg-[#f4f5f7] flex items-center justify-center">
      <div className="text-[#5e6c84] text-sm font-mono">Loading workspace…</div>
    </div>
  )
}
