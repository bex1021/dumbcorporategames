// Lunch Dash HUD overlay (slice 3) — deadpan corporate, DOM over the canvas.
//
// Live values (clock, time bar, distance, speed) update every frame from
// mutable module state via a rAF loop writing styles/text directly — no React
// re-renders. The objective LABEL and the task pips re-render only when the
// step changes (Zustand subscription).

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { carPosition, carTelemetry } from './carState'
import { driveClock, START_MIN, END_MIN } from './clockState'
import { DESTINATIONS } from './destinations'
import { boundary } from './boundaryState'
import { crash, damageTier } from './crashState'
import { bowl, bowlTier } from './bowlState'
import { hr } from './pedState'
import { pickup } from './pickupState'
import { useLunchStore } from './lunchStore'
import { Minimap } from './Minimap'
import { BowlWidget } from './BowlWidget'

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'
const CHIP: React.CSSProperties = {
  background: 'rgba(24,24,24,0.82)',
  color: '#d9d3c4',
  border: '1px solid rgba(217,211,196,0.25)',
  borderRadius: 6,
  fontFamily: MONO,
  backdropFilter: 'blur(4px)',
}

function fmtClock(min: number): string {
  const hh = Math.floor(min / 60)
  const mm = Math.floor(min % 60)
  const ampm = hh < 12 ? 'AM' : 'PM'
  const h12 = hh > 12 ? hh - 12 : hh
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`
}

export function DriveHud() {
  const stepIndex = useLunchStore((s) => s.stepIndex)
  const done = useLunchStore((s) => s.done)

  const speedRef = useRef<HTMLSpanElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const warnRef = useRef<HTMLDivElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)
  const lastPulse = useRef(0)
  const toastHideAt = useRef(0)
  const damageRef = useRef<HTMLSpanElement>(null)
  const bowlWrapRef = useRef<HTMLDivElement>(null)
  const bowlBarRef = useRef<HTMLDivElement>(null)
  const bowlLabelRef = useRef<HTMLSpanElement>(null)
  const lastSloshPulse = useRef(0)
  const bowlFlashUntil = useRef(0)
  const hrToastRef = useRef<HTMLDivElement>(null)
  const hrChipRef = useRef<HTMLDivElement>(null)
  const hrCountRef = useRef<HTMLSpanElement>(null)
  const lastHrPulse = useRef(0)
  const hrToastHideAt = useRef(0)
  const pickupRef = useRef<HTMLDivElement>(null)
  const pickupPromptRef = useRef<HTMLSpanElement>(null)
  const pickupBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (speedRef.current) {
        speedRef.current.textContent = String(Math.round(Math.abs(carTelemetry.speed) * 2.237))
      }
      if (clockRef.current) {
        clockRef.current.textContent = fmtClock(driveClock.minutes)
        clockRef.current.style.color = driveClock.minutes > END_MIN ? '#e58a78' : '#d9d3c4'
      }
      if (barRef.current) {
        const frac = Math.min(Math.max((driveClock.minutes - START_MIN) / (END_MIN - START_MIN), 0), 1)
        barRef.current.style.width = `${frac * 100}%`
        barRef.current.style.background = frac < 0.6 ? '#4ea96b' : frac < 0.85 ? '#d4a93a' : '#c44a4a'
      }
      if (distRef.current) {
        const st = useLunchStore.getState()
        if (st.done) {
          distRef.current.textContent = ''
        } else {
          const d = DESTINATIONS[st.stepIndex]
          const m = Math.round(Math.hypot(carPosition.x - d.x, carPosition.z - d.z))
          distRef.current.textContent = `${m} m`
        }
      }
      // boundary warning + returned-to-HQ toast
      if (warnRef.current) warnRef.current.style.opacity = boundary.zone === 'warning' ? '1' : '0'
      if (boundary.returnPulse !== lastPulse.current) {
        lastPulse.current = boundary.returnPulse
        toastHideAt.current = performance.now() + 2400
      }
      if (toastRef.current) toastRef.current.style.opacity = performance.now() < toastHideAt.current ? '1' : '0'
      if (damageRef.current) {
        const t = damageTier(crash.severity)
        damageRef.current.textContent = t.toUpperCase()
        damageRef.current.style.color =
          t === 'pristine' ? '#9fb39a' : t === 'scuffed' ? '#d4c98a' : t === 'dinged' ? '#d99a5a' : '#d96a5a'
      }
      // salmon-bowl gauge — appears only once the bowl is in the car
      if (bowlWrapRef.current) bowlWrapRef.current.style.opacity = bowl.carrying ? '1' : '0'
      if (bowl.carrying) {
        const bt = bowlTier(bowl.integrity)
        const col = bt === 'composed' ? '#4ea96b' : bt === 'functional' ? '#d4a93a' : '#c44a4a'
        if (bowlBarRef.current) {
          bowlBarRef.current.style.width = `${bowl.integrity}%`
          bowlBarRef.current.style.background = col
        }
        if (bowlLabelRef.current) {
          bowlLabelRef.current.textContent = bt.toUpperCase()
          bowlLabelRef.current.style.color = col
        }
        // a notable slosh flashes the chip (scale + warm border)
        if (bowl.sloshPulse !== lastSloshPulse.current) {
          lastSloshPulse.current = bowl.sloshPulse
          bowlFlashUntil.current = performance.now() + 220
        }
        const flashing = performance.now() < bowlFlashUntil.current
        if (bowlWrapRef.current) {
          bowlWrapRef.current.style.transform = flashing ? 'scale(1.07)' : 'scale(1)'
          bowlWrapRef.current.style.borderColor = flashing ? 'rgba(255,170,150,0.85)' : 'rgba(217,211,196,0.25)'
        }
      }
      // HR incidents — flash a toast on each new clip, keep a running count chip
      if (hr.pulse !== lastHrPulse.current) {
        lastHrPulse.current = hr.pulse
        hrToastHideAt.current = performance.now() + 2200
      }
      if (hrToastRef.current) hrToastRef.current.style.opacity = performance.now() < hrToastHideAt.current ? '1' : '0'
      if (hrChipRef.current) hrChipRef.current.style.opacity = hr.incidents > 0 ? '1' : '0'
      if (hrCountRef.current) hrCountRef.current.textContent = String(hr.incidents)
      // pickup prompt — shows when you're in a stop's pull-in zone
      if (pickupRef.current) pickupRef.current.style.opacity = pickup.inZone ? '1' : '0'
      if (pickupPromptRef.current) pickupPromptRef.current.textContent = pickup.prompt
      if (pickupBarRef.current) {
        pickupBarRef.current.style.width = `${Math.min(pickup.progress / pickup.need, 1) * 100}%`
        pickupBarRef.current.style.background = pickup.filling ? '#5cbb7a' : '#d4a93a'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const dest = DESTINATIONS[stepIndex]
  const stopsDone = done ? DESTINATIONS.length : stepIndex

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* top-left: TIME + TASKS meters */}
      <div style={{ ...CHIP, position: 'fixed', top: 12, left: 12, padding: '10px 12px', width: 210 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6 }}>
          Time · back by 12:00
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <span ref={clockRef} style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
            11:00 AM
          </span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>/ 12:00</span>
        </div>
        {/* countdown bar */}
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(217,211,196,0.15)', marginTop: 6, overflow: 'hidden' }}>
          <div ref={barRef} style={{ height: '100%', width: '0%', background: '#4ea96b' }} />
        </div>

        {/* tasks / stops */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6 }}>
            Stops
          </span>
          <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {stopsDone} / {DESTINATIONS.length}
          </span>
          <span style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {DESTINATIONS.map((d, i) => (
              <span
                key={d.id}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: i < stopsDone ? d.color : 'rgba(217,211,196,0.2)',
                  border: !done && i === stepIndex ? '1px solid #fff' : '1px solid transparent',
                }}
              />
            ))}
          </span>
        </div>
      </div>

      {/* top-center: current objective */}
      <div
        style={{
          ...CHIP,
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          textAlign: 'center',
          maxWidth: '60vw',
        }}
      >
        {done ? (
          <div style={{ fontSize: 13, opacity: 0.8 }}>Run complete — see your receipt.</div>
        ) : (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65 }}>
              Objective · stop {stepIndex + 1} of {DESTINATIONS.length}
            </div>
            <div style={{ fontSize: 15, marginTop: 2 }}>
              <span style={{ color: dest.color }}>●</span> {dest.goal} —{' '}
              <span style={{ opacity: 0.85 }}>{dest.short}</span>{' '}
              <span ref={distRef} style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </>
        )}
      </div>

      {/* boundary: turn-back warning + returned-to-HQ toast */}
      <div
        ref={warnRef}
        style={{
          ...CHIP,
          position: 'fixed',
          top: 96,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          fontSize: 13,
          color: '#ffd9d2',
          background: 'rgba(120,30,24,0.85)',
          border: '1px solid rgba(255,120,100,0.5)',
          opacity: 0,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        ↩ Turn back — your slop bowl won't pick itself up
      </div>
      <div
        ref={toastRef}
        style={{
          ...CHIP,
          position: 'fixed',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '12px 18px',
          fontSize: 14,
          textAlign: 'center',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
      >
        You drifted out of town.
        <br />
        Brought you back to Alignly HQ.
      </div>

      {/* HR incident toast (each clip) + running count chip */}
      <div
        ref={hrToastRef}
        style={{
          ...CHIP,
          position: 'fixed',
          top: 140,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          fontSize: 13,
          color: '#ffd9d2',
          background: 'rgba(120,30,24,0.9)',
          border: '1px solid rgba(255,120,100,0.5)',
          opacity: 0,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        ⚠ HR INCIDENT — −3 min, and it goes in your file
      </div>
      <div
        ref={hrChipRef}
        style={{
          ...CHIP,
          position: 'fixed',
          top: 162,
          left: 12,
          padding: '6px 12px',
          fontSize: 11,
          letterSpacing: '0.1em',
          color: '#e0a59a',
          display: 'flex',
          gap: 8,
          alignItems: 'baseline',
          opacity: 0,
        }}
      >
        <span style={{ opacity: 0.7 }}>HR INCIDENTS</span>
        <span ref={hrCountRef} style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          0
        </span>
      </div>

      {/* top-right: exit */}
      <Link
        to="/play"
        style={{
          ...CHIP,
          pointerEvents: 'auto',
          position: 'fixed',
          top: 12,
          right: 12,
          padding: '6px 12px',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        ✕ Exit
      </Link>

      {/* bottom-left: minimap */}
      <div style={{ ...CHIP, position: 'fixed', bottom: 16, left: 16, padding: 6, lineHeight: 0 }}>
        <Minimap />
      </div>

      {/* bottom-right: salmon-bowl gauge — fades in only once it's in the car */}
      <div
        ref={bowlWrapRef}
        style={{
          ...CHIP,
          position: 'fixed',
          bottom: 118,
          right: 16,
          width: 168,
          padding: '7px 12px',
          opacity: 0,
          transition: 'opacity 0.25s, transform 0.12s, border-color 0.12s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', opacity: 0.6 }}>EXEC'S SALMON BOWL</span>
          <span ref={bowlLabelRef} style={{ fontSize: 10, letterSpacing: '0.1em', color: '#4ea96b' }}>
            COMPOSED
          </span>
        </div>
        {/* the live bowl-cam — contents, lid and salmon react to your driving */}
        <div style={{ marginTop: 4 }}>
          <BowlWidget />
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'rgba(217,211,196,0.15)', marginTop: 4, overflow: 'hidden' }}>
          <div ref={bowlBarRef} style={{ height: '100%', width: '100%', background: '#4ea96b', transition: 'width 0.15s' }} />
        </div>
      </div>

      {/* bottom-right: body-damage readout (above speedo) */}
      <div
        style={{
          ...CHIP,
          position: 'fixed',
          bottom: 70,
          right: 16,
          padding: '5px 12px',
          fontSize: 11,
          letterSpacing: '0.12em',
          display: 'flex',
          gap: 8,
          alignItems: 'baseline',
        }}
      >
        <span style={{ opacity: 0.55 }}>BODY</span>
        <span ref={damageRef}>PRISTINE</span>
      </div>

      {/* bottom-right: speedo */}
      <div
        style={{
          ...CHIP,
          position: 'fixed',
          bottom: 16,
          right: 16,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
        }}
      >
        <span ref={speedRef} style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
          0
        </span>
        <span style={{ fontSize: 11, letterSpacing: '0.15em', opacity: 0.7 }}>MPH</span>
      </div>

      {/* pull-in pickup prompt + progress (bottom-center, above the controls) */}
      <div
        ref={pickupRef}
        style={{
          ...CHIP,
          position: 'fixed',
          bottom: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          width: 280,
          textAlign: 'center',
          opacity: 0,
          transition: 'opacity 0.18s',
        }}
      >
        <span ref={pickupPromptRef} style={{ fontSize: 13 }} />
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(217,211,196,0.15)', marginTop: 7, overflow: 'hidden' }}>
          <div ref={pickupBarRef} style={{ height: '100%', width: '0%', background: '#5cbb7a', transition: 'width 0.08s' }} />
        </div>
      </div>

      {/* bottom-center: controls hint */}
      <div
        style={{
          ...CHIP,
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 14px',
          fontSize: 12,
          letterSpacing: '0.06em',
        }}
      >
        W / ↑ accelerate · S / ↓ brake + reverse · A D / ← → steer
      </div>
    </div>
  )
}
