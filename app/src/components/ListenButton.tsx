import { SpeakerHighIcon, StopIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { canSpeak, speak, stopSpeaking } from '../lib/speech'

interface Props {
  text: string
  rate: number
}

export function ListenButton({ text, rate }: Props) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => stopSpeaking, [])

  if (!canSpeak) return null

  const toggle = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
    } else {
      speak(text, rate, () => setSpeaking(false))
      setSpeaking(true)
    }
  }

  return (
    <button type="button" className="pill pill--ghost" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <StopIcon size={18} aria-hidden="true" /> : <SpeakerHighIcon size={18} aria-hidden="true" />}
      {speaking ? 'Stop reading' : 'Read aloud'}
    </button>
  )
}
