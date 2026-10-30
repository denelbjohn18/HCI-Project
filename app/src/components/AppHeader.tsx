import { APP_NAME } from '../brand'
import { routeHref, type RouteName } from '../state/useHashRoute'

export type PanelName = 'about' | 'display'

const STEPS: { route: RouteName; label: string }[] = [
  { route: 'profile', label: 'Profile' },
  { route: 'result', label: 'Result' },
  { route: 'explore', label: 'Explore' },
]

interface Props {
  route: RouteName
  panel: PanelName | null
  onTogglePanel: (panel: PanelName) => void
}

export function AppHeader({ route, panel, onTogglePanel }: Props) {
  return (
    <header className="app-header">
      <a className="wordmark" href={routeHref('profile')}>
        <span className="wordmark__name">{APP_NAME}</span>
        <span className="wordmark__tag">placement</span>
      </a>

      <nav className="steps" aria-label="Steps">
        <ol className="steps__list">
          {STEPS.map((step, index) => (
            <li key={step.route}>
              <a
                className="step label"
                href={routeHref(step.route)}
                aria-current={step.route === route ? 'step' : undefined}
              >
                <span className="step__index num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="step__label">{step.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="app-header__tools">
        <button
          type="button"
          className="tool label"
          id="about-trigger"
          aria-expanded={panel === 'about'}
          aria-controls="about-panel"
          onClick={() => onTogglePanel('about')}
        >
          About
        </button>
        <button
          type="button"
          className="tool label"
          id="display-trigger"
          aria-expanded={panel === 'display'}
          aria-controls="display-panel"
          onClick={() => onTogglePanel('display')}
        >
          Display
        </button>
      </div>
    </header>
  )
}
