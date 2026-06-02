// src/routes/MusicLab.tsx — office-music audition page (/play/music).
//
// A scratch page for Rebecca to A/B the Phase 1 office-music options. Each
// variant plays through the REAL engine (OfficeMusic) so what you hear is what
// would ship; click one to play (it loops), click again or pick another to
// switch. Not linked from anywhere — just visit /play/music.

import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MUSIC_PRESETS } from '../audio/officeMusicPresets'
import { OfficeMusic } from '../audio/OfficeMusic'

export default function MusicLab() {
  const ctxRef = useRef<AudioContext | null>(null)
  const engineRef = useRef<OfficeMusic | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  // Stop audio if you navigate away.
  useEffect(() => () => { engineRef.current?.stop() }, [])

  function stop() {
    engineRef.current?.stop()
    engineRef.current = null
    setPlaying(null)
  }

  function play(id: string) {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    const ctx = ctxRef.current
    void ctx.resume()
    engineRef.current?.stop() // gentle crossfade off the previous one
    const preset = MUSIC_PRESETS.find((p) => p.id === id)
    if (!preset) return
    const eng = new OfficeMusic(ctx, false, preset)
    eng.start()
    engineRef.current = eng
    setPlaying(id)
  }

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] text-[#172b4d] flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <nav className="flex items-center justify-between px-6 h-12 bg-white border-b border-[#dfe1e6]">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-[5px] grid place-items-center text-white text-[13px] font-black" style={{ background: '#5e9a96' }}>A</span>
          <span className="font-semibold text-[15px]">Alignly</span>
          <span className="text-[#5e6c84] text-[13px]">· Office music — audition</span>
        </div>
        <Link to="/play" className="text-[13px] text-[#0052cc] no-underline">← Back to levels</Link>
      </nav>

      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[22px] font-semibold">Pick the Phase 1 vibe</h1>
          <p className="text-[13px] text-[#5e6c84] mt-1">
            Each loops through the real in-game engine. Click to play, click again to stop, or pick another to switch.
            Tell me which you like (or “#2 but slower / less busy / brighter”), and I’ll lock it in.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {MUSIC_PRESETS.map((p, i) => {
              const isOn = playing === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => (isOn ? stop() : play(p.id))}
                  className={[
                    'text-left rounded-lg border p-4 flex items-center gap-4 transition',
                    isOn ? 'bg-[#deebff] border-[#0052cc]' : 'bg-white border-[#dfe1e6] hover:border-[#4c9aff]',
                  ].join(' ')}
                >
                  <span
                    className="w-11 h-11 flex-shrink-0 rounded-full grid place-items-center text-[18px] text-white"
                    style={{ background: isOn ? '#0052cc' : '#42526e' }}
                  >
                    {isOn ? '■' : '▶'}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#8993a4]">VARIANT {i + 1}</span>
                      <span className="text-[15px] font-semibold">{p.name}</span>
                      {isOn && <span className="text-[10px] font-bold uppercase tracking-wider text-[#0747a6]">● now playing</span>}
                    </span>
                    <span className="block text-[13px] text-[#5e6c84] mt-0.5">{p.desc}</span>
                    <span className="block text-[11px] text-[#8993a4] mt-1 font-mono">{p.bpm} BPM · {p.lead} lead</span>
                  </span>
                </button>
              )
            })}
          </div>

          {playing && (
            <button onClick={stop} className="mt-5 px-4 py-2 rounded text-[13px] font-semibold text-white" style={{ background: '#42526e' }}>
              ■ Stop
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
