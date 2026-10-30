import type { CSSProperties } from 'react'
import { BAND_START_SCORE, SCORE_BOUNDS, bandFor, type Band } from '../model/explain'

interface Props {
  score: number
  probability: number
  /** Explore only: the student's real score, drawn as a hollow marker. */
  was?: number
}

const span = SCORE_BOUNDS.max - SCORE_BOUNDS.min
const pct = (score: number) => ((score - SCORE_BOUNDS.min) / span) * 100

const ZONES: { band: Band; label: string; from: number; to: number }[] = [
  { band: 'low', label: 'Low', from: pct(SCORE_BOUNDS.min), to: pct(BAND_START_SCORE.moderate) },
  { band: 'moderate', label: 'Moderate', from: pct(BAND_START_SCORE.moderate), to: pct(BAND_START_SCORE.strong) },
  { band: 'strong', label: 'Strong', from: pct(BAND_START_SCORE.strong), to: pct(SCORE_BOUNDS.max) },
]

const at = (score: number) => Math.min(100, Math.max(0, pct(score)))

export function ScoreTrack({ score, probability, was }: Props) {
  const band = bandFor(probability)
  const zone = ZONES.find((z) => z.band === band)!
  const showWas = was !== undefined && Math.round(was) !== Math.round(score)
  const low = Math.round(SCORE_BOUNDS.min)
  const high = Math.round(SCORE_BOUNDS.max)
  const label =
    `${Math.round(score)} points, in the ${zone.label.toLowerCase()} zone, on a scale from ${low} to ${high}. ` +
    `Moderate starts at ${Math.round(BAND_START_SCORE.moderate)} points and strong at ${Math.round(BAND_START_SCORE.strong)} points.` +
    (showWas ? ` Your answers are ${Math.round(was)} points.` : '')

  return (
    <div className="track" role="img" aria-label={label}>
      <div className="track__bar">
        {ZONES.map((z) => (
          <span
            key={z.band}
            className="track__zone"
            data-band={z.band}
            data-active={z.band === band}
            style={{ '--from': z.from, '--to': z.to } as CSSProperties}
          />
        ))}
        {showWas && <span className="track__marker track__marker--was" style={{ '--at': at(was) } as CSSProperties} />}
        <span className="track__marker" style={{ '--at': at(score) } as CSSProperties}>
          <span className="track__value label num">{Math.round(score)}</span>
        </span>
      </div>
      <div className="track__labels">
        {ZONES.map((z) => (
          <span
            key={z.band}
            className="track__label label"
            data-band={z.band}
            data-active={z.band === band}
            style={{ '--from': z.from, '--to': z.to } as CSSProperties}
          >
            {z.label}
          </span>
        ))}
      </div>
    </div>
  )
}
