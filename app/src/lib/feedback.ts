import dropletUrl from '../assets/droplet.mp3'
import { canSpeak } from './speech'

/**
 * Every cue is the same water-droplet sample, pitched. Higher means more,
 * forward, or a better band; lower means less or back. Louder cues are kept
 * for rarer, bigger changes, and nothing here is the only sign of a change.
 */
export type Cue =
  | 'tap'
  | 'select'
  | 'tick'
  | 'more'
  | 'fewer'
  | 'undo'
  | 'redo'
  | 'transition'
  | 'bandUp'
  | 'bandDown'
  | 'limit'
  | 'error'

interface CueSpec {
  /** Playback rate of the droplet for each note. Rate is pitch: above 1 is higher. */
  notes: number[]
  gain: number
  /** Cuts each note before the droplet's rising glide finishes: the sound of a dead end. */
  clipped?: boolean
  /** A cue interrupts one of lower rank. One of equal or lower rank is dropped for `hold` ms. */
  rank: number
  hold: number
  /** Android vibration pattern in ms. Only value changes, limits, and outcomes vibrate. */
  vibrate?: number[]
  /** Taps of the iPhone system haptic. Kept to slider steps and band changes. */
  iosTaps?: number
}

const THIRD = 2 ** (3 / 12)
const FOURTH = 2 ** (5 / 12)

const CUES: Record<Cue, CueSpec> = {
  tap: { notes: [1], gain: 0.5, rank: 1, hold: 80 },
  select: { notes: [1], gain: 0.5, rank: 1, hold: 80, vibrate: [10] },
  tick: { notes: [1.4], gain: 0.25, rank: 0, hold: 40, vibrate: [10], iosTaps: 1 },
  more: { notes: [THIRD], gain: 0.5, rank: 2, hold: 80, vibrate: [10] },
  fewer: { notes: [1 / THIRD], gain: 0.5, rank: 2, hold: 80, vibrate: [10] },
  undo: { notes: [1 / THIRD], gain: 0.5, rank: 2, hold: 80 },
  redo: { notes: [THIRD], gain: 0.5, rank: 2, hold: 80 },
  transition: { notes: [0.6], gain: 0.6, rank: 3, hold: 150 },
  limit: { notes: [0.7], gain: 0.6, clipped: true, rank: 4, hold: 150, vibrate: [24] },
  error: { notes: [0.7, 0.7], gain: 0.6, clipped: true, rank: 5, hold: 250, vibrate: [12, 60, 12, 60, 12] },
  // A band change is the outcome itself, so it outranks a slider reaching its end in the same move.
  bandUp: { notes: [1, FOURTH], gain: 0.7, rank: 6, hold: 300, vibrate: [14, 70, 14], iosTaps: 2 },
  bandDown: { notes: [FOURTH, 1], gain: 0.7, rank: 6, hold: 300, vibrate: [14, 70, 14], iosTaps: 2 },
}

/** The sample opens with 34 ms of silence. Skipping it makes each cue land on the press. */
const LEAD_IN = 0.034
const NOTE_GAP = 0.09
const CLIP = 0.04
const IOS_TAP_GAP = 80
/** Across a slider's full travel the tick rises a fifth. */
const TICK_SPAN = 7

const PRESSABLE = 'button, a[href], summary, input[type="radio"]'

const browser = typeof window !== 'undefined'
const coarse = browser && window.matchMedia('(pointer: coarse)').matches
const canVibrate = coarse && 'vibrate' in navigator
const isIPhone = browser && /iPhone|iPod/.test(navigator.userAgent)

export const hasHaptics = canVibrate || isIPhone

export interface FeedbackPrefs {
  sound: boolean
  haptics: boolean
}

interface Held {
  rank: number
  until: number
}

let prefs: FeedbackPrefs = { sound: true, haptics: true }
let context: AudioContext | null = null
let droplet: AudioBuffer | null = null
let loading = false
let held: (Held & { out: GainNode | null }) | null = null

export function admits(current: Held | null, rank: number, now: number): boolean {
  return current === null || now >= current.until || rank > current.rank
}

/** Pitch multiplier for a position from 0 to 1 along a control. */
export function pitchAt(at: number): number {
  return 2 ** ((TICK_SPAN * Math.min(1, Math.max(0, at))) / 12)
}

function isCue(name: string): name is Cue {
  return Object.hasOwn(CUES, name)
}

function loadDroplet() {
  if (droplet || loading) return
  loading = true
  fetch(dropletUrl)
    .then((response) => response.arrayBuffer())
    .then((bytes) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes))
    .then((buffer) => {
      droplet = buffer
    })
    .catch(() => {
      loading = false
    })
}

/** Safari: mix with music already playing, and stay quiet when the iPhone's silent switch is on. */
function preferAmbientAudio() {
  const { audioSession } = navigator as Navigator & { audioSession?: { type: string } }
  if (audioSession) audioSession.type = 'ambient'
}

function wake() {
  if (!prefs.sound) return
  if (!context) {
    preferAmbientAudio()
    context = new AudioContext({ latencyHint: 'interactive' })
  }
  if (context.state !== 'running') context.resume().catch(() => {})
}

// Feedback must never stop the change it reports, so `sound` and `feel` swallow their own failures.

function sound(spec: CueSpec, pitch = 1): GainNode | null {
  try {
    wake()
    const ctx = context
    if (!ctx || !droplet) return null
    const out = ctx.createGain()
    out.gain.value = spec.gain
    out.connect(ctx.destination)
    const start = ctx.currentTime
    spec.notes.forEach((rate, i) => {
      const t = start + i * NOTE_GAP
      const note = ctx.createBufferSource()
      note.buffer = droplet
      note.playbackRate.value = rate * pitch
      if (spec.clipped) {
        const envelope = ctx.createGain()
        envelope.gain.setValueAtTime(1, t)
        envelope.gain.setTargetAtTime(0, t + CLIP, 0.006)
        note.connect(envelope).connect(out)
      } else {
        note.connect(out)
      }
      if (i === spec.notes.length - 1) note.onended = () => out.disconnect()
      note.start(t, LEAD_IN)
      if (spec.clipped) note.stop(t + CLIP + 0.05)
    })
    return out
  } catch {
    return null
  }
}

/** iOS has no vibration API, but Safari 18 plays its system haptic when a native switch toggles. */
function switchTap() {
  const label = document.createElement('label')
  label.ariaHidden = 'true'
  label.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.append(input)
  document.head.append(label)
  label.click()
  label.remove()
}

function feel(spec: CueSpec) {
  try {
    if (canVibrate && spec.vibrate) {
      navigator.vibrate(spec.vibrate)
    } else if (isIPhone && spec.iosTaps) {
      switchTap()
      for (let i = 1; i < spec.iosTaps; i++) window.setTimeout(switchTap, i * IOS_TAP_GAP)
    }
  } catch {
    // The visible change still reports what happened.
  }
}

/** Plays a cue. `at` (0 to 1) is a position along a slider; it raises the pitch. */
export function cue(name: Cue, at?: number) {
  if (!prefs.sound && !prefs.haptics) return
  if (document.visibilityState !== 'visible') return
  if (canSpeak && window.speechSynthesis.speaking) return
  const spec = CUES[name]
  const now = performance.now()
  if (!admits(held, spec.rank, now)) return
  if (held && now < held.until && context) held.out?.gain.setTargetAtTime(0, context.currentTime, 0.005)
  const out = prefs.sound ? sound(spec, at === undefined ? 1 : pitchAt(at)) : null
  if (prefs.haptics) feel(spec)
  held = { rank: spec.rank, until: now + spec.hold, out }
}

export function setFeedbackPrefs(next: FeedbackPrefs) {
  const was = prefs
  prefs = next
  if (next.sound && !was.sound) sound(CUES.tap)
  if (next.haptics && !was.haptics) feel(CUES.tick)
}

function onPress(event: MouseEvent) {
  if (!(event.target instanceof Element)) return
  const control = event.target.closest(PRESSABLE)
  if (!control) return
  if (control.getAttribute('aria-disabled') === 'true') {
    cue('limit')
    return
  }
  const named = control.getAttribute('data-cue')
  if (named === 'none') return
  if (named !== null && isCue(named)) cue(named)
  else cue(control instanceof HTMLInputElement ? 'select' : 'tap')
}

const WAKE_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const

/**
 * Gives every button, link, disclosure, and choice its press cue. A control can
 * name another cue with `data-cue`, or opt out with `data-cue="none"`.
 */
export function listenForPresses(): () => void {
  loadDroplet()
  for (const type of WAKE_EVENTS) document.addEventListener(type, wake, { capture: true, passive: true })
  document.addEventListener('click', onPress, true)
  return () => {
    for (const type of WAKE_EVENTS) document.removeEventListener(type, wake, { capture: true })
    document.removeEventListener('click', onPress, true)
  }
}
