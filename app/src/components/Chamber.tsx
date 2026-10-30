import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { APP_NAME } from '../brand'

interface Props extends HTMLAttributes<HTMLElement> {
  /** 0 to 1. The atmosphere brightens with the chance on show, as a calm second cue. */
  light?: number
  badge?: boolean
  children: ReactNode
}

function RotatingBadge() {
  const text = `${APP_NAME} · know where you stand · `.toUpperCase()
  return (
    <svg className="badge" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id="badge-ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
      </defs>
      <g className="badge__ring">
        <text>
          <textPath href="#badge-ring" textLength="236">
            {text}
          </textPath>
        </text>
      </g>
      <circle className="badge__lamp" cx="50" cy="50" r="5" />
    </svg>
  )
}

/** The dark, lit panel that holds each screen's title and outcome. */
export function Chamber({ light = 0.5, badge = false, className, style, children, ...rest }: Props) {
  return (
    <section
      {...rest}
      className={className ? `chamber ${className}` : 'chamber'}
      style={{ ...style, '--light': light } as CSSProperties}
    >
      <div className="chamber__inner">
        <div className="chamber__atmosphere" aria-hidden="true">
          <span className="chamber__glow" />
          <span className="chamber__lens" />
          <span className="chamber__grain" />
        </div>
        <div className="chamber__content">{children}</div>
        {badge && <RotatingBadge />}
      </div>
    </section>
  )
}
