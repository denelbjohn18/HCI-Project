import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { APP_NAME } from './brand'
import { AboutPanel } from './components/AboutPanel'
import { AppHeader, type PanelName } from './components/AppHeader'
import { DisplayPanel } from './components/DisplayPanel'
import { SidePanel } from './components/SidePanel'
import { listenForPresses, setFeedbackPrefs } from './lib/feedback'
import { BaselineScreen } from './screens/BaselineScreen'
import { ExploreScreen } from './screens/ExploreScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ResultScreen } from './screens/ResultScreen'
import { useHashRoute, type RouteName } from './state/useHashRoute'
import { useLumen } from './state/useLumen'
import { SPEECH_RATE, useSettings } from './state/useSettings'

const TITLES: Record<RouteName, string> = {
  profile: 'Your profile',
  result: 'Your result',
  explore: 'Explore changes',
  baseline: 'Model output',
}

export default function App() {
  const route = useHashRoute()
  const lumen = useLumen()
  const { settings, update, reset } = useSettings()
  const [panel, setPanel] = useState<PanelName | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const firstRoute = useRef(true)

  useEffect(() => {
    document.title = `${TITLES[route.name]} · ${APP_NAME}`
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [route.name])

  useEffect(() => {
    setFeedbackPrefs({ sound: settings.sound === 'on', haptics: settings.haptics === 'on' })
  }, [settings.sound, settings.haptics])

  // The notebook page is the plain comparison condition for the study, so it stays silent.
  const isBaseline = route.name === 'baseline'
  useEffect(() => (isBaseline ? undefined : listenForPresses()), [isBaseline])

  const togglePanel = useCallback((name: PanelName) => setPanel((open) => (open === name ? null : name)), [])
  const closePanel = useCallback(() => setPanel(null), [])
  const toggleSound = () => update({ sound: settings.sound === 'on' ? 'off' : 'on' })

  const skipToMain = (event: MouseEvent) => {
    event.preventDefault()
    mainRef.current?.focus()
  }

  const screen = (() => {
    switch (route.name) {
      case 'profile':
        return <ProfileScreen lumen={lumen} />
      case 'result':
        return <ResultScreen lumen={lumen} speechRate={SPEECH_RATE[settings.speechRate]} />
      case 'explore':
        return <ExploreScreen lumen={lumen} />
      case 'baseline':
        return <BaselineScreen params={route.params} fallback={lumen.profile} />
      default: {
        const unhandled: never = route.name
        throw new Error(`Unhandled route ${String(unhandled)}`)
      }
    }
  })()

  if (route.name === 'baseline') return <main ref={mainRef}>{screen}</main>

  return (
    <div className="app" data-panel-open={panel !== null}>
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      <AppHeader
        route={route.name}
        panel={panel}
        onTogglePanel={togglePanel}
        sound={settings.sound === 'on'}
        onToggleSound={toggleSound}
      />
      <main id="main" ref={mainRef} tabIndex={-1}>
        {screen}
      </main>
      <SidePanel id="about-panel" triggerId="about-trigger" title={`About ${APP_NAME}`} open={panel === 'about'} onClose={closePanel}>
        <AboutPanel />
      </SidePanel>
      <SidePanel id="display-panel" triggerId="display-trigger" title="Display" open={panel === 'display'} onClose={closePanel}>
        <DisplayPanel settings={settings} onChange={update} onReset={reset} />
      </SidePanel>
    </div>
  )
}
