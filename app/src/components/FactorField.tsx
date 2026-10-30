import { MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { cue } from '../lib/feedback'
import { signed } from '../model/explain'
import { FACTORS, entryError, formatValue, learnedValue, snap } from '../model/factors'
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

function clampNote(key: FactorKey, value: number): string | null {
  const { min, max } = SPEC[key]
  if (value > max) return `Lumen’s data stops at ${formatValue(key, max)}, so ${formatValue(key, value)} counts as ${formatValue(key, max)}.`
  if (value < min) return `Lumen’s data starts at ${formatValue(key, min)}, so ${formatValue(key, value)} counts as ${formatValue(key, min)}.`
  return null
}

function RangeControl({ factorKey, value, onChange, was, ids }: ControlProps) {
  const { min, max, step } = SPEC[factorKey]
  const known = learnedValue(factorKey, value)
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState(value)
  const stale = value !== source
  if (stale) {
    setSource(value)
    setDraft(null)
    setError(null)
  }
  const activeDraft = stale ? null : draft
  const activeError = stale ? null : error
  const note = activeDraft === null && activeError === null ? clampNote(factorKey, value) : null

  const commit = useCallback(
    (text: string) => {
      const problem = entryError(factorKey, text)
      if (problem) {
        cue('error')
        setError(problem)
        return
      }
      const next = snap(factorKey, Number(text))
      setDraft(null)
      setError(null)
      if (next !== value) {
        cue('select')
        onChange(next)
      }
    },
    [factorKey, onChange, setDraft, setError, value],
  )

  useEffect(() => {
    const input = inputRef.current
    const form = input?.form
    if (!form) return
    const onSubmit = () => {
      if (input.getAttribute('aria-invalid') === 'true') return
      const shown = input.value
      if (shown !== formatValue(factorKey, value)) commit(shown)
    }
    form.addEventListener('submit', onSubmit)
    return () => form.removeEventListener('submit', onSubmit)
  }, [commit, factorKey, value])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }
    const direction = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0
    if (direction === 0) return
    event.preventDefault()
    setDraft(null)
    setError(null)
    const next = snap(factorKey, value + direction * step)
    if (next === value) {
      cue('limit')
      return
    }
    cue('tick', position(factorKey, learnedValue(factorKey, next)))
    onChange(next)
  }

  return (
    <div className="range-control">
      <div className="range" style={{ '--fill': position(factorKey, known) } as CSSProperties}>
        <input
          type="range"
          className="range__input"
          min={min}
          max={max}
          step={step}
          value={known}
          onChange={(event) => {
            setDraft(null)
            setError(null)
            const next = snap(factorKey, Number(event.target.value))
            if (next <= min || next >= max) cue('limit')
            else cue('tick', position(factorKey, next))
            onChange(next)
          }}
          aria-labelledby={ids.label}
          aria-describedby={ids.help}
          aria-valuetext={formatValue(factorKey, known)}
        />
        {was !== undefined && was !== value && (
          <span
            className="range__was"
            style={{ '--at': position(factorKey, learnedValue(factorKey, was)) } as CSSProperties}
            aria-hidden="true"
          />
        )}
      </div>
      <input
        ref={inputRef}
        id={ids.input}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        className="number-input num"
        data-factor={factorKey}
        value={activeDraft ?? formatValue(factorKey, value)}
        onChange={(event) => {
          setDraft(event.target.value)
          setError(null)
        }}
        onBlur={(event) => {
          const shown = event.currentTarget.value
          if (shown !== formatValue(factorKey, value)) commit(shown)
        }}
        onKeyDown={onKeyDown}
        aria-invalid={activeError ? true : undefined}
        aria-describedby={`${ids.help} ${ids.error}`}
      />
      <p id={ids.error} className={activeError ? 'field__error' : 'field__note'} aria-live="polite">
        {activeError ?? note}
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
        data-cue="fewer"
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
        data-cue="more"
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
