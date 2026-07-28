// On-screen car-radio control for Lunch Dash — a power button + a plain volume
// slider. Stays in sync with the R key and any other control because it reads
// driveAudio's observable radio state via useSyncExternalStore.
//
//   · power button (⏻) — turn the whole broadcast on / off
//   · slider           — click anywhere or drag to set volume (arrow keys too)

import { useSyncExternalStore } from 'react'
import { subscribeRadio, getRadioState, setRadioVolume, toggleRadio } from './driveAudio'

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'

export function RadioDial() {
  const { on, volume } = useSyncExternalStore(subscribeRadio, getRadioState, getRadioState)
  const pct = Math.round(volume * 100)

  return (
    <div
      style={{
        position: 'fixed',
        top: 46,
        right: 12,
        width: 190,
        padding: '9px 12px 11px',
        pointerEvents: 'auto',
        userSelect: 'none',
        background: 'rgba(24,24,24,0.82)',
        color: '#d9d3c4',
        border: '1px solid rgba(217,211,196,0.25)',
        borderRadius: 8,
        fontFamily: MONO,
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* header: station + power */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.9 }}>
          <span style={{ color: on ? '#e0574a' : '#6a6a6a' }}>◉</span> KPI 101.1
        </span>
        <button
          onClick={toggleRadio}
          title={on ? 'Turn radio off' : 'Turn radio on'}
          style={{
            cursor: 'pointer',
            background: on ? 'rgba(230,193,90,0.16)' : 'transparent',
            border: `1px solid ${on ? 'rgba(230,193,90,0.5)' : 'rgba(217,211,196,0.25)'}`,
            borderRadius: 5,
            color: on ? '#e6c15a' : '#8a8a8a',
            fontFamily: MONO,
            fontSize: 13,
            lineHeight: 1,
            padding: '3px 7px',
          }}
        >
          ⏻
        </button>
      </div>

      {/* volume: big readout + a familiar slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
        <span style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums', minWidth: 38, opacity: on ? 1 : 0.5 }}>
          {on ? `${pct}%` : 'OFF'}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setRadioVolume(Number(e.target.value) / 100)}
          aria-label="Radio volume"
          style={{
            flex: 1,
            height: 4,
            cursor: 'pointer',
            accentColor: '#e6c15a',
            opacity: on ? 1 : 0.5,
          }}
        />
      </div>
      <div style={{ fontSize: 9, opacity: 0.42, letterSpacing: '0.1em', marginTop: 6 }}>VOLUME · Q to toggle</div>
    </div>
  )
}
