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
import { river } from './riverState'
import { RIVER } from './driveConfig'
import { pickup } from './pickupState'
import { useLunchStore, activeStop, stopStateFor } from './lunchStore'
import { Minimap } from './Minimap'
import { BowlWidget } from './BowlWidget'
import { RadioDial } from './RadioDial'

// TYPOGRAPHY. The HUD used to be monospace end to end, which read as a
// terminal mock-up rather than a game. Prose (objectives, toasts, labels) now
// uses the same corporate sans as the Alignly shell, and MONO is reserved for
// things that are literally instrument readouts — the clock, the speedo, the
// radio frequency, distances. That split is also the joke: the company's UI is
// sans, the machine's readouts are mono.
const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
// numerals that should never jitter as they tick
const NUM: React.CSSProperties = { fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }
const CHIP: React.CSSProperties = {
  background: 'rgba(24,24,24,0.82)',
  color: '#d9d3c4',
  border: '1px solid rgba(217,211,196,0.25)',
  borderRadius: 6,
  fontFamily: SANS,
  letterSpacing: '0.01em',
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
  const mustRebowl = useLunchStore((s) => s.mustRebowl)
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
  const riverMurkRef = useRef<HTMLDivElement>(null)
  const riverToastRef = useRef<HTMLDivElement>(null)
  const lastRiverPulse = useRef(0)
  const riverToastHideAt = useRef(0)
  const pickupRef = useRef<HTMLDivElement>(null)
  const pickupPromptRef = useRef<HTMLSpanElement>(null)
  const pickupBarRef = useRef<HTMLDivElement>(null)
  const spillTipRef = useRef<HTMLDivElement>(null)
  const spillTipHideAt = useRef(0)
  const prevBowlSerial = useRef(0)
  const overboardRef = useRef<HTMLDivElement>(null)
  const overboardCardRef = useRef<HTMLDivElement>(null)
  const overboardUntil = useRef(0)
  const prevSalmonGone = useRef(false)
  const controlsRef = useRef<HTMLDivElement>(null)
  const drivenFor = useRef(0) // seconds spent actually moving
  const idleFor = useRef(0) // seconds spent stopped
  const lastTick = useRef(0)

  // Honoured by the overboard alert's pulse (see the accessibility note there).
  // Kept in a ref and re-read on change, so toggling the OS setting mid-session
  // takes effect immediately rather than being frozen at first render.
  const reduceMotion = useRef(false)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reduceMotion.current = mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
          const d = DESTINATIONS[activeStop(st.stepIndex, st.mustRebowl)]
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
      // river dunk — the murk closes over the screen as you go under (and hides
      // the tow-out teleport), then the notice lands once you're back on tarmac
      if (riverMurkRef.current) riverMurkRef.current.style.opacity = String(river.murk)
      if (river.pulse !== lastRiverPulse.current) {
        lastRiverPulse.current = river.pulse
        riverToastHideAt.current = performance.now() + RIVER.sinkSeconds * 1000 + 3200
      }
      if (riverToastRef.current) {
        const show = performance.now() < riverToastHideAt.current && river.phase !== 'sinking'
        riverToastRef.current.style.opacity = show ? '1' : '0'
      }
      // SALMON OVERBOARD — the run-defining moment. Losing the bowl silently
      // meant players drove on for minutes not realising the delivery could no
      // longer complete, so it gets a full centre-screen alert.
      //
      // Accessibility: the pulse is a CARD glow, never a whole-screen flash,
      // it is time-based (not frame-based) at ~1.2 Hz — well under the 3 Hz
      // photosensitivity threshold — and it holds perfectly still when the
      // player has asked for reduced motion.
      if (bowl.salmonGone && !prevSalmonGone.current) overboardUntil.current = performance.now() + 6000
      prevSalmonGone.current = bowl.salmonGone
      if (overboardRef.current && overboardCardRef.current) {
        const now = performance.now()
        const left = overboardUntil.current - now
        const shown = left > 0
        // fade the last 700 ms out rather than cutting
        overboardRef.current.style.opacity = shown ? String(Math.min(1, left / 700)) : '0'
        if (shown && !reduceMotion.current) {
          const p = 0.5 + 0.5 * Math.sin((now / 1000) * 2 * Math.PI * 1.2)
          overboardCardRef.current.style.borderColor = `rgba(255,${120 + p * 70},${90 + p * 50},${0.55 + p * 0.45})`
          overboardCardRef.current.style.boxShadow = `0 0 ${18 + p * 34}px rgba(214,86,66,${0.3 + p * 0.4})`
          overboardCardRef.current.style.transform = `scale(${1 + p * 0.012})`
        } else if (shown) {
          overboardCardRef.current.style.borderColor = 'rgba(255,150,120,0.9)'
          overboardCardRef.current.style.boxShadow = '0 0 26px rgba(214,86,66,0.45)'
          overboardCardRef.current.style.transform = 'scale(1)'
        }
      }
      // Controls hint: retire it once the player has demonstrably got it (8 s of
      // actual driving), bring it back after 6 s parked. A permanent controls
      // bar is one of the loudest "prototype" tells.
      {
        const now = performance.now()
        const dt = lastTick.current ? Math.min(0.1, (now - lastTick.current) / 1000) : 0
        lastTick.current = now
        if (Math.abs(carTelemetry.speed) > 2) {
          drivenFor.current += dt
          idleFor.current = 0
        } else {
          idleFor.current += dt
        }
        const learned = drivenFor.current > 8 && idleFor.current < 6
        if (controlsRef.current) controlsRef.current.style.opacity = learned ? '0' : '1'
      }
      // one-time spill-cause tip — fires the first time a bowl rides shotgun
      // (serial hits 1), so the player knows WHAT spills it before it happens
      if (bowl.serial === 1 && prevBowlSerial.current === 0) spillTipHideAt.current = performance.now() + 7000
      prevBowlSerial.current = bowl.serial
      if (spillTipRef.current) spillTipRef.current.style.opacity = performance.now() < spillTipHideAt.current ? '1' : '0'
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

  const dest = DESTINATIONS[activeStop(stepIndex, mustRebowl)]
  const stopsDone = DESTINATIONS.filter((_, i) => stopStateFor(i, stepIndex, mustRebowl, done) === 'done').length

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* top-left: TIME + TASKS meters */}
      <div style={{ ...CHIP, position: 'fixed', top: 12, left: 12, padding: '10px 12px', width: 210 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6 }}>
          Time · back by 1:00
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <span ref={clockRef} style={{ ...NUM, fontSize: 22 }}>
            12:00 PM
          </span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>/ 1:00</span>
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
            {DESTINATIONS.map((d, i) => {
              const st = stopStateFor(i, stepIndex, mustRebowl, done)
              return (
                <span
                  key={d.id}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: st === 'done' ? d.color : 'rgba(217,211,196,0.2)',
                    border: st === 'active' ? '1px solid #fff' : '1px solid transparent',
                  }}
                />
              )
            })}
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
        ) : mustRebowl ? (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e58a78' }}>
              ⚠ Salmon overboard · recover
            </div>
            <div style={{ fontSize: 15, marginTop: 2 }}>
              <span style={{ color: dest.color }}>●</span> Get another salmon bowl —{' '}
              <span style={{ opacity: 0.85 }}>{dest.short}</span>{' '}
              <span ref={distRef} style={{ ...NUM, opacity: 0.7 }} />
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65 }}>
              Objective · stop {stepIndex + 1} of {DESTINATIONS.length}
            </div>
            <div style={{ fontSize: 15, marginTop: 2 }}>
              <span style={{ color: dest.color }}>●</span> {dest.goal} —{' '}
              <span style={{ opacity: 0.85 }}>{dest.short}</span>{' '}
              <span ref={distRef} style={{ ...NUM, opacity: 0.7 }} />
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
      {/* SALMON OVERBOARD — centre-screen, unmissable, never blocks input */}
      <div
        ref={overboardRef}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: 30,
        }}
      >
        <div
          ref={overboardCardRef}
          style={{
            background: 'rgba(28,14,12,0.93)',
            border: '2px solid rgba(255,150,120,0.9)',
            borderRadius: 14,
            padding: '22px 34px',
            textAlign: 'center',
            fontFamily: SANS,
            backdropFilter: 'blur(3px)',
            maxWidth: '78vw',
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#ff9c84' }}>
            ⚠ Salmon overboard
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#ffe9e2',
              margin: '10px 0 6px',
              letterSpacing: '0.02em',
              lineHeight: 1.15,
            }}
          >
            The exec's bowl is ruined
          </div>
          <div style={{ fontSize: 15, color: '#f0c6bb', lineHeight: 1.5 }}>
            You can't finish the run without it.
            <br />
            Drive back to <strong style={{ color: '#8fd6a0' }}>Corporate Slop Bowlz</strong> for another.
          </div>
        </div>
      </div>

      {/* river dunk: the water closing over the windscreen */}
      <div
        ref={riverMurkRef}
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(125% 100% at 50% 42%, rgba(38,92,101,0.5) 0%, rgba(8,30,38,0.97) 100%)',
        }}
      />
      <div
        ref={riverToastRef}
        style={{
          ...CHIP,
          position: 'fixed',
          top: 176,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          fontSize: 13,
          color: '#cfe6ee',
          background: 'rgba(20,58,70,0.92)',
          border: '1px solid rgba(120,190,210,0.5)',
          opacity: 0,
          transition: 'opacity 0.25s',
          whiteSpace: 'nowrap',
        }}
      >
        🌊 VEHICLE RECOVERED FROM WATER — −{RIVER.timePenalty} min, and it goes in your file
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
        <span ref={hrCountRef} style={{ ...NUM, fontSize: 13 }}>
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

      {/* top-right: car-radio dial (under Exit) */}
      <RadioDial />

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
        <span ref={speedRef} style={{ ...NUM, fontSize: 30 }}>
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

      {/* one-time spill-cause tip — appears the moment the exec's bowl is in
          the car so the player knows WHAT spills it (the #1 unclear thing) */}
      <div
        ref={spillTipRef}
        style={{
          ...CHIP,
          position: 'fixed',
          top: 104,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '9px 16px',
          maxWidth: 430,
          textAlign: 'center',
          background: 'rgba(26,44,32,0.9)',
          border: '1px solid rgba(120,200,150,0.45)',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#9fe0b3', textTransform: 'uppercase' }}>🥗 Exec's salmon bowl secured</div>
        <div style={{ fontSize: 12.5, marginTop: 3, opacity: 0.92, lineHeight: 1.5 }}>
          It spills from <b>sharp turns at speed</b> and <b>crashes</b> — brake for corners and drive clean.
          <br />
          <span style={{ opacity: 0.6 }}>(Hitting people costs you time, not the bowl. Trash it completely and you'll have to fetch another.)</span>
        </div>
      </div>

      {/* bottom-center: controls hint — fades out once you're clearly driving,
          and slides back in if you sit still long enough to have forgotten */}
      <div
        ref={controlsRef}
        style={{
          ...CHIP,
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 14px',
          fontSize: 12,
          letterSpacing: '0.06em',
          transition: 'opacity 0.6s ease',
        }}
      >
        <span style={{ fontFamily: MONO }}>W</span> accelerate ·{' '}
        <span style={{ fontFamily: MONO }}>S</span> brake + reverse ·{' '}
        <span style={{ fontFamily: MONO }}>A D</span> steer ·{' '}
        <span style={{ fontFamily: MONO }}>Space</span> honk ·{' '}
        <span style={{ fontFamily: MONO }}>Q</span> radio
      </div>
    </div>
  )
}
