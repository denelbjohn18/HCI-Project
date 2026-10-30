import { useId } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  legend: string
  description?: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Keeps the legend for screen readers when a visible label sits elsewhere. */
  hideLegend?: boolean
}

/** Native radio buttons styled as one control, so arrow keys and screen readers work for free. */
export function Segmented<T extends string>({ legend, description, options, value, onChange, hideLegend }: Props<T>) {
  const name = useId()
  const descriptionId = `${name}-description`

  return (
    <fieldset className="segmented-field" aria-describedby={description ? descriptionId : undefined}>
      <legend className={hideLegend ? 'visually-hidden' : 'segmented-field__legend'}>{legend}</legend>
      {description && (
        <p className="segmented-field__description" id={descriptionId}>
          {description}
        </p>
      )}
      <div className="segmented">
        {options.map((option) => (
          <label key={option.value} className="segmented__option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
