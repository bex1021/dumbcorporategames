import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode intentionally NOT used here.
//
// StrictMode double-invokes effects in dev to surface impure render logic.
// For a React Three Fiber app that's well past initial debugging, the cost
// is real: each <Canvas> mount creates a WebGL context, and double-mount
// spawns two contexts on the same <canvas> element. The browser kills one
// to reclaim resources, Three.js does not auto-restore, and the result is
// a permanently white scene during local dev (`npm run dev`) — even though
// production (`vite build`) renders fine.
//
// We trade dev-mode warnings about side effects for a working dev loop.
// Any future render-purity issues will be caught in code review.
createRoot(document.getElementById('root')!).render(<App />)
