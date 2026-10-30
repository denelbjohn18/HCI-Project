import { useCallback, useEffect, useRef, useState } from 'react'
import { TYPICAL_PROFILE } from '../model/profiles'
import { FACTOR_KEYS, type FactorKey, type Profile } from '../model/scorecard'

const STORAGE_KEY = 'lumen:session:v1'
const COALESCE_MS = 700
const HISTORY_LIMIT = 100

interface Session {
  profile: Profile
  /** Scenario history for Explore. Entry 0 is always the student's real profile. */
  history: Profile[]
  at: number
}

function fresh(profile: Profile): Session {
  return { profile, history: [profile], at: 0 }
}

function isProfile(value: unknown): value is Profile {
  return (
    typeof value === 'object' &&
    value !== null &&
    FACTOR_KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === 'number')
  )
}

function load(): Session {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return fresh(TYPICAL_PROFILE)
    const { profile, history, at } = saved as Partial<Session>
    if (!isProfile(profile) || !Array.isArray(history) || !history.every(isProfile)) return fresh(TYPICAL_PROFILE)
    if (typeof at !== 'number' || at < 0 || at >= history.length) return fresh(profile)
    return { profile, history, at }
  } catch {
    return fresh(TYPICAL_PROFILE)
  }
}

export function useLumen() {
  const [session, setSession] = useState<Session>(load)
  const lastEdit = useRef<{ key: FactorKey | null; time: number }>({ key: null, time: 0 })

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [session])

  const setProfileValue = useCallback((key: FactorKey, value: number) => {
    setSession((s) => fresh({ ...s.profile, [key]: value }))
  }, [])

  const replaceProfile = useCallback((profile: Profile) => setSession(fresh(profile)), [])

  /** Edits the Explore scenario. Rapid edits to one factor (a slider drag) become one undo step. */
  const editScenario = useCallback((changes: Partial<Profile>, key: FactorKey | null = null) => {
    const now = performance.now()
    const coalesce = key !== null && lastEdit.current.key === key && now - lastEdit.current.time < COALESCE_MS
    lastEdit.current = { key, time: now }

    setSession((s) => {
      const next = { ...s.history[s.at], ...changes }
      if (coalesce && s.at > 0 && s.at === s.history.length - 1) {
        return { ...s, history: [...s.history.slice(0, s.at), next] }
      }
      const history = [...s.history.slice(0, s.at + 1), next].slice(-HISTORY_LIMIT)
      return { ...s, history, at: history.length - 1 }
    })
  }, [])

  const undo = useCallback(() => {
    lastEdit.current = { key: null, time: 0 }
    setSession((s) => (s.at > 0 ? { ...s, at: s.at - 1 } : s))
  }, [])

  const redo = useCallback(() => {
    lastEdit.current = { key: null, time: 0 }
    setSession((s) => (s.at < s.history.length - 1 ? { ...s, at: s.at + 1 } : s))
  }, [])

  const scenario = session.history[session.at]
  const isScenarioChanged = FACTOR_KEYS.some((key) => scenario[key] !== session.profile[key])

  const resetScenario = useCallback(() => editScenario(session.profile), [editScenario, session.profile])

  return {
    profile: session.profile,
    scenario,
    isScenarioChanged,
    canUndo: session.at > 0,
    canRedo: session.at < session.history.length - 1,
    setProfileValue,
    replaceProfile,
    editScenario,
    undo,
    redo,
    resetScenario,
  }
}

export type Lumen = ReturnType<typeof useLumen>
