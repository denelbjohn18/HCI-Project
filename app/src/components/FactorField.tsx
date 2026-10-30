import { MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { signed } from '../model/explain'
import { FACTORS, formatValue, snap } from '../model/factors'
import { SPEC, type FactorKey } from '../model/scorecard'
import { Segmented } from './Segmented'

interface Props {
  factorKey: FactorKey
  /** Position among the seven questions, shown as 01 to 07. */
  index: number
  value: number
  onChange: (value: number) => void
  /** Explore only: the student's real value, so every change stays visible. */
  was?: number
  /** Explore only: this factor's points at the current value. */
  points?: number
}

interface ControlProps extends Props {
  ids: { label: string; help: string; input: string; error: string }
}

const position = (key: FactorKey, value: number) => (value - SPEC[key].min) / (SPEC[key].max - SPEC[key].min)

function rangeError(key: FactorKey, text: string): string | null {
  const { min, max } = SPEC[key]
  if (text.trim() === '') return `Enter your ${FACTORS[key].noun}.`
  const value = Number(text)
  if (!Number.isFinite(value)) return `Use digits only, for example ${formatValue(key, SPEC[key].mean)}.`
  if (value < min || value > max) return `Enter a value from ${min} to ${max}. That is the range Lumen learned from.`
  return null
}

function RangeControl({ factorKey, value, onChange, was, ids }: ControlProps) {
  const { min, max, step } = SPEC[factorKey]
  const [draft, setDraft] = useState<string | null>(null)
  const error = draft === null ? null : rangeError(factorKey, draft)

  const type = (text: string) => {
    setDraft(text)
    if (!rangeError(factorKey, text)) onChange(snap(factorKey, Number(text)))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      setDraft(null)
      if (window.matchMedia('(pointer: coarse)').matches) event.currentTarget.blur()
      return
    }
    const direction = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0
    if (direction === 0) return
    event.preventDefault()
    setDraft(null)
    onChange(snap(factorKey, value + direction * step))
  }

  return (
    <div className="range-control">
      <div className="range" style={{ '--fill': position(factorKey, value) } as CSSProperties}>
        <input
          type="range"
          className="range__input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            setDraft(null)
            onChange(snap(factorKey, Number(event.target.value)))
          }}
          aria-labelledby={ids.label}
          aria-describedby={ids.help}
          aria-valuetext={formatValue(factorKey, value)}
        />
        {was !== undefined && was !== value && (
          <span className="range__was" style={{ '--at': position(factorKey, was) } as CSSProperties} aria-hidden="true" />
        )}
      </div>
      <input
        id={ids.input}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        className="number-input num"
        value={draft ?? formatValue(factorKey, value)}
        onChange={(event) => type(event.target.value)}
        onBlur={() => setDraft(null)}
        onKeyDown={onKeyDown}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${ids.help} ${ids.error}`}
      />
      <p id={ids.error} className="field__error" aria-live="polite">
        {error}
      </p>
    </div>
  )
}

function CountControl({ factorKey, value, onChange, ids }: ControlProps) {
  const { min, max } = SPEC[factorKey]
  const { noun } = FACTORS[factorKey]
  const change = (delta: number) => {
    const next = value + delta
    if (next >= min && next <= max) onChange(next)
  }

  return (
    <div className="stepper" role="group" aria-labelledby={ids.label} aria-describedby={ids.help}>
      <button
        type="button"
        className="stepper__button"
        aria-label={`Fewer ${noun}`}
        aria-disabled={value <= min}
        onClick={() => change(-1)}
      >
        <MinusIcon size={16} aria-hidden="true" />
      </button>
      <output className="stepper__value num" aria-live="polite">
        {formatValue(factorKey, value)}
      </output>
      <button
        type="button"
        className="stepper__button"
        aria-label={`More ${noun}`}
        aria-disabled={value >= max}
        onClick={() => change(1)}
      >
        <PlusIcon size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

function YesNoControl({ factorKey, value, onChange }: ControlProps) {
  return (
    <Segmented
      legend={FACTORS[factorKey].label}
      hideLegend
      options={[
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]}
      value={value >= 0.5 ? 'yes' : 'no'}
      onChange={(answer) => onChange(answer === 'yes' ? 1 : 0)}
    />
  )
}

export function FactorField(props: Props) {
  const { factorKey, index, value, was, points } = props
  const info = FACTORS[factorKey]
  const id = useId()
  const ids = { label: `${id}-label`, help: `${id}-help`, input: `${id}-input`, error: `${id}-error` }
  const changed = was !== undefined && was !== value

  const control = (() => {
    switch (info.control) {
      case 'range':
        return <RangeControl {...props} ids={ids} />
      case 'count':
        return <CountControl {...props} ids={ids} />
      case 'yesNo':
        return <YesNoControl {...props} ids={ids} />
      default: {
        const unhandled: never = info.control
        throw new Error(`Unhandled control ${String(unhandled)}`)
      }
    }
  })()

  return (
    <div className="field" data-changed={changed || undefined}>
      <span className="field__index label num" aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>
      <div className="field__text">
        {info.control === 'range' ? (
          <label className="field__label" id={ids.label} htmlFor={ids.input}>
            {info.label}
          </label>
        ) : (
          <span className="field__label" id={ids.label}>
            {info.label}
          </span>
        )}
        <p className="field__help" id={ids.help}>
          {info.help}
        </p>
      </div>
      <div className="field__control">{control}</div>
      {points !== undefined && (
        <div className="field__meta">
          <span className="tag num" data-sign={Math.sign(points)}>
            {signed(points)} {Math.abs(points) === 1 ? 'point' : 'points'}
          </span>
          {changed && <span className="field__was label">Was {formatValue(factorKey, was)}</span>}
        </div>
      )}
    </div>
  )
}
