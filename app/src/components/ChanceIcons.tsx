import { PersonIcon } from '@phosphor-icons/react'
import { chanceSentence } from '../model/explain'

interface Props {
  outOfTen: number
  size?: 'large' | 'small'
  showLegend?: boolean
}

/** A 10-person icon array: natural frequencies are read more accurately than percentages. */
export function ChanceIcons({ outOfTen, size = 'large', showLegend = false }: Props) {
  return (
    <div className="chance" data-size={size}>
      <div className="chance__people" role="img" aria-label={chanceSentence(outOfTen)}>
        {Array.from({ length: 10 }, (_, index) => {
          const placed = index < outOfTen
          return (
            <PersonIcon
              key={index}
              className="chance__person"
              data-placed={placed}
              weight={placed ? 'fill' : 'regular'}
              aria-hidden="true"
            />
          )
        })}
      </div>
      {showLegend && (
        <ul className="chance__legend" aria-hidden="true">
          <li>
            <PersonIcon className="chance__person" data-placed="true" weight="fill" />
            Placed
          </li>
          <li>
            <PersonIcon className="chance__person" data-placed="false" weight="regular" />
            Not placed
          </li>
        </ul>
      )}
    </div>
  )
}
