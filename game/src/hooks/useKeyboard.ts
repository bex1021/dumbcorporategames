import { useEffect, useRef } from 'react'

export type KeyMap = {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
}

const codeToKey: Record<string, keyof KeyMap> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

export function useKeyboard() {
  const keys = useRef<KeyMap>({ forward: false, back: false, left: false, right: false })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = codeToKey[e.code]
      if (k) keys.current[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = codeToKey[e.code]
      if (k) keys.current[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return keys
}
