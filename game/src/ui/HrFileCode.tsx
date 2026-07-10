// HR File code panel — export/import your whole day as one copyable code.
//
// Lives on the /play career hub. Deadpan HR framing over a real function:
// your campaign progress (unlocks, receipts, achievements) otherwise lives in
// one browser and dies with a cookie clear. This packs it into a code you can
// paste on another machine. See state/campaignSave.ts.

import { useState } from 'react'
import { exportCode, importCode } from '../state/campaignSave'

export function HrFileCode() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [importVal, setImportVal] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const doExport = () => {
    const c = exportCode()
    if (!c) { setMsg({ kind: 'err', text: 'Nothing on file yet — beat a phase first.' }); return }
    setCode(c)
    setMsg(null)
    setCopied(false)
    // best-effort clipboard copy
    if (navigator.clipboard) {
      navigator.clipboard.writeText(c).then(() => setCopied(true)).catch(() => { /* manual copy fallback */ })
    }
  }

  const doImport = () => {
    const res = importCode(importVal)
    if (res.ok) {
      setMsg({ kind: 'ok', text: `Restored ${res.restored} record${res.restored === 1 ? '' : 's'}. Reloading…` })
      setTimeout(() => window.location.reload(), 900)
    } else {
      setMsg({ kind: 'err', text: res.error })
    }
  }

  return (
    <div className="mt-8 border-t border-[#dfe1e6] pt-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-[13px] font-semibold text-[#42526e] hover:text-[#172b4d] transition"
      >
        <span className="text-[15px]">🗄️</span>
        Your HR file
        <span className="text-[11px] font-normal text-[#8993a4]">— back up or transfer your progress</span>
        <span className="text-[#8993a4] ml-1">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-3 max-w-2xl grid gap-4 sm:grid-cols-2">
          {/* Export */}
          <div className="rounded-lg border border-[#dfe1e6] bg-white p-3.5">
            <div className="text-[12px] font-semibold text-[#172b4d]">Export</div>
            <p className="text-[11px] text-[#5e6c84] mt-0.5 leading-snug">
              Copy your whole day — unlocks, receipts, achievements — as one code.
            </p>
            <button
              onClick={doExport}
              className="mt-2.5 w-full px-3 py-2 rounded bg-[#0052cc] text-white text-[12px] font-semibold hover:bg-[#0747a6] transition"
            >
              {copied ? '✓ Copied to clipboard' : 'Generate my HR file code'}
            </button>
            {code && (
              <textarea
                readOnly
                value={code}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-2 w-full h-16 resize-none rounded border border-[#dfe1e6] bg-[#f4f5f7] p-2 text-[10px] font-mono text-[#42526e] break-all"
              />
            )}
          </div>

          {/* Import */}
          <div className="rounded-lg border border-[#dfe1e6] bg-white p-3.5">
            <div className="text-[12px] font-semibold text-[#172b4d]">Restore</div>
            <p className="text-[11px] text-[#5e6c84] mt-0.5 leading-snug">
              Paste a code from another browser. This overwrites what's here.
            </p>
            <input
              value={importVal}
              onChange={(e) => setImportVal(e.target.value)}
              placeholder="ALGN-HR-…"
              className="mt-2.5 w-full px-2.5 py-2 rounded border border-[#dfe1e6] text-[11px] font-mono text-[#172b4d] outline-none focus:border-[#0052cc]"
            />
            <button
              onClick={doImport}
              disabled={!importVal.trim()}
              className="mt-2 w-full px-3 py-2 rounded border border-[#dfe1e6] bg-white text-[12px] font-semibold text-[#42526e] hover:bg-[#f4f5f7] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Restore this file
            </button>
          </div>

          {msg && (
            <div
              className={`sm:col-span-2 text-[11px] rounded px-3 py-2 ${
                msg.kind === 'ok'
                  ? 'bg-[#e3fcef] text-[#006644] border border-[#abf5d1]'
                  : 'bg-[#ffebe6] text-[#bf2600] border border-[#ffbdad]'
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
