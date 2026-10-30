import type { CSSProperties } from 'react'
import { BAND_START_SCORE, bandFor, type Band } from '../model/explain'

interface Props {
  score: number
  probability: number
  /** Explore only: the student's real score, drawn as a hollow marker. */
  was?: number
}

const ZONES: { band: Band; label: string; from: number; to: number }[] = [
  { band: 'low', label: 'Low', from: 0, to: BAND_START_SCORE.moderate },
  { band: 'moderate', label: 'Moderate', from: BAND_START_SCORE.moderate, to: BAND_START_SCORE.strong },
  { band: 'strong', label: 'Strong', from: BAND_START_SCORE.strong, to: 100 },
]

const at = (score: number) => Math.min(100, Math.max(0, score))

export function ScoreTrack({ score, probability, was }: Props) {
  const band = bandFor(probability)
  const zone = ZONES.find((z) => z.band === band)!
  const showWas = was !== undefined && Math.round(was) !== Math.round(score)
  const label =
    `Score ${Math.round(score)}, in the ${zone.label.toLowerCase()} zone.` +
    ` Moderate starts at ${Math.round(BAND_START_SCORE.moderate)} and strong at ${Math.round(BAND_START_SCORE.strong)}.` +
    (showWas ? ` Your answers score ${Math.round(was)}.` : '')

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
            {z.band !== 'low' && <span className="track__from num"> {Math.round(z.from)}+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
