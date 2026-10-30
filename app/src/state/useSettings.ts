import { useCallback, useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
export type TextSize = 'default' | 'large' | 'larger'
export type Contrast = 'standard' | 'more'
export type Motion = 'system' | 'reduce'
export type SpeechRate = 'slower' | 'normal' | 'faster'

export interface Settings {
  theme: Theme
  textSize: TextSize
  contrast: Contrast
  motion: Motion
  speechRate: SpeechRate
}

const STORAGE_KEY = 'lumen:settings:v1'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 'default',
  contrast: 'standard',
  motion: 'system',
  speechRate: 'normal',
}

export const SPEECH_RATE: Record<SpeechRate, number> = { slower: 0.85, normal: 1, faster: 1.2 }

function load(): Settings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return typeof saved === 'object' && saved !== null ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    const { dataset } = document.documentElement
    dataset.theme = settings.theme
    dataset.textSize = settings.textSize
    dataset.contrast = settings.contrast
    dataset.motion = settings.motion
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  return { settings, update, reset }
}
