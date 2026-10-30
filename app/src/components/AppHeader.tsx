import { SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react'
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
  sound: boolean
  onToggleSound: () => void
}

export function AppHeader({ route, panel, onTogglePanel, sound, onToggleSound }: Props) {
  return (
    <header className="app-header">
      <a className="wordmark" href={routeHref('profile')} data-cue={route === 'profile' ? undefined : 'transition'}>
        <span className="wordmark__name">{APP_NAME}</span>
        <span className="wordmark__tag">know your place-ment</span>
      </a>

      <nav className="steps" aria-label="Steps">
        <ol className="steps__list">
          {STEPS.map((step, index) => (
            <li key={step.route}>
              <a
                className="step label"
                href={routeHref(step.route)}
                aria-current={step.route === route ? 'step' : undefined}
                data-cue={step.route === route ? undefined : 'transition'}
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
        {/* Silence is the confirmation for turning sound off; turning it on plays a preview. */}
        <button type="button" className="tool label" aria-pressed={sound} onClick={onToggleSound} data-cue="none">
          {sound ? (
            <SpeakerHighIcon size={18} aria-hidden="true" />
          ) : (
            <SpeakerSlashIcon size={18} aria-hidden="true" />
          )}
          Sound
        </button>
      </div>
    </header>
  )
}
