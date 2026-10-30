import { canSpeak } from '../lib/speech'
import type { Settings } from '../state/useSettings'
import { Segmented } from './Segmented'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
}

export function DisplayPanel({ settings, onChange, onReset }: Props) {
  return (
    <div className="settings">
      <p className="muted">Changes apply straight away and are remembered on this device.</p>

      <Segmented
        legend="Theme"
        options={[
          { value: 'system', label: 'Auto' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={settings.theme}
        onChange={(theme) => onChange({ theme })}
      />

      <Segmented
        legend="Text size"
        options={[
          { value: 'default', label: 'Default' },
          { value: 'large', label: 'Large' },
          { value: 'larger', label: 'Larger' },
        ]}
        value={settings.textSize}
        onChange={(textSize) => onChange({ textSize })}
      />

      <Segmented
        legend="Contrast"
        description="More contrast darkens secondary text and outlines."
        options={[
          { value: 'standard', label: 'Standard' },
          { value: 'more', label: 'More' },
        ]}
        value={settings.contrast}
        onChange={(contrast) => onChange({ contrast })}
      />

      <Segmented
        legend="Motion"
        description="Auto follows your device setting."
        options={[
          { value: 'system', label: 'Auto' },
          { value: 'reduce', label: 'Reduce' },
        ]}
        value={settings.motion}
        onChange={(motion) => onChange({ motion })}
      />

      {canSpeak && (
        <Segmented
          legend="Reading speed"
          description="Used by Read aloud on your result."
          options={[
            { value: 'slower', label: 'Slower' },
            { value: 'normal', label: 'Normal' },
            { value: 'faster', label: 'Faster' },
          ]}
          value={settings.speechRate}
          onChange={(speechRate) => onChange({ speechRate })}
        />
      )}

      <button type="button" className="pill pill--ghost settings__reset" onClick={onReset}>
        Restore default display
      </button>
    </div>
  )
}
