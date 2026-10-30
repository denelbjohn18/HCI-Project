export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'en-IN') ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en'))
  )
}

export function speak(text: string, rate: number, onDone: () => void) {
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.rate = rate
  utterance.onend = onDone
  utterance.onerror = onDone
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel()
}
