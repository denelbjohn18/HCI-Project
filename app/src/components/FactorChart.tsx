import { CaretDownIcon } from '@phosphor-icons/react'
import { useState, type CSSProperties } from 'react'
import { POINTS_SPAN, signed, type Explanation } from '../model/explain'
import { FACTORS, formatValue, snap } from '../model/factors'
import { MODEL, SPEC, type FactorKey } from '../model/scorecard'

function worth(key: FactorKey): string {
  const points = MODEL.pointsPerLogit * SPEC[key].weight * FACTORS[key].detailStep
  return points < 1.5 ? points.toFixed(1) : String(Math.round(points))
}

function detail(key: FactorKey, value: number): string[] {
  const info = FACTORS[key]
  const { mean } = SPEC[key]
  switch (info.control) {
    case 'yesNo':
      return [
        `Yes is worth about ${worth(key)} points more than no.`,
        `${Math.round(mean * 100)} in 100 students in the data said yes.`,
      ]
    case 'count':
      return [
        `Each ${info.detailUnit} is worth about ${worth(key)} points.`,
        `Average student: ${formatValue(key, snap(key, mean))}. You: ${formatValue(key, value)}.`,
      ]
    case 'range':
      return [
        `Every ${info.detailStep} ${info.detailUnit} is worth about ${worth(key)} points.`,
        `Average student: ${formatValue(key, snap(key, mean))}. You: ${formatValue(key, value)}.`,
      ]
    default: {
      const unhandled: never = info.control
      throw new Error(`Unhandled control ${String(unhandled)}`)
    }
  }
}

interface Props {
  explanation: Explanation
}

export function FactorChart({ explanation }: Props) {
  const [open, setOpen] = useState<ReadonlySet<FactorKey>>(new Set())
  const { contributions, shownAverage, shownScore } = explanation
  const factorTotal = shownScore - shownAverage

  const toggle = (key: FactorKey) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <section className="chart" aria-labelledby="chart-title">
      <div className="chart__header">
        <p className="label muted">Why</p>
        <h2 id="chart-title">
          What shaped <em>your</em> score
        </h2>
        <p className="muted">
          Every student starts at the average score. Each factor then adds or removes points. Select a factor to see
          why.
        </p>
      </div>

      <div className="chart__axis" aria-hidden="true">
        <span className="chart__axis-label label" data-sign="-1">
          <span className="swatch" data-sign="-1" />
          Holding you back
        </span>
        <span className="chart__axis-label label" data-sign="1">
          Helping you
          <span className="swatch" data-sign="1" />
        </span>
      </div>

      <ul className="chart__rows">
        {contributions.map((c) => {
          const isOpen = open.has(c.key)
          const info = FACTORS[c.key]
          const detailId = `chart-detail-${c.key}`
          return (
            <li key={c.key} className="chart-row" data-open={isOpen}>
              <button
                type="button"
                className="chart-row__summary"
                aria-expanded={isOpen}
                aria-controls={detailId}
                onClick={() => toggle(c.key)}
              >
                <span className="chart-row__name">
                  <span className="chart-row__label">{info.label}</span>
                  <span className="chart-row__value num">{formatValue(c.key, c.value)}</span>
                </span>
                <span className="chart-row__track" aria-hidden="true">
                  <span
                    className="chart-row__bar"
                    data-sign={Math.sign(c.shown)}
                    style={{ '--share': c.shown === 0 ? 0 : Math.abs(c.points) / POINTS_SPAN } as CSSProperties}
                  />
                </span>
                <span className="chart-row__points num" data-sign={Math.sign(c.shown)} aria-hidden="true">
                  {signed(c.shown)}
                </span>
                <span className="visually-hidden">
                  {c.shown === 0 ? ', no effect' : `, ${c.shown > 0 ? 'adds' : 'removes'} ${Math.abs(c.shown)} points`}
                </span>
                <CaretDownIcon className="chart-row__caret" size={16} aria-hidden="true" />
              </button>
              <div className="chart-row__detail" id={detailId} hidden={!isOpen}>
                {detail(c.key, c.value).map((sentence) => (
                  <p key={sentence}>{sentence}</p>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="chart__sum">
        <span className="chart__term">
          <span className="chart__term-label label">Average student</span>
          <span className="chart__term-value num">{shownAverage}</span>
        </span>
        <span className="chart__operator" aria-hidden="true">
          +
        </span>
        <span className="chart__term">
          <span className="chart__term-label label">Your factors</span>
          <span className="chart__term-value num">{signed(factorTotal)}</span>
        </span>
        <span className="chart__operator" aria-hidden="true">
          =
        </span>
        <span className="chart__term chart__term--total">
          <span className="chart__term-label label">Your score</span>
          <span className="chart__term-value num">{shownScore}</span>
        </span>
      </p>
    </section>
  )
}
