import { ArrowRightIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { APP_NAME } from '../brand'
import { Chamber } from '../components/Chamber'
import { FactorField } from '../components/FactorField'
import { GROUPS, formatValue, questionNumber } from '../model/factors'
import { STUDY_PROFILES, type StudyProfile } from '../model/profiles'
import type { Profile } from '../model/scorecard'
import { navigate } from '../state/useHashRoute'
import type { Lumen } from '../state/useLumen'

interface Props {
  lumen: Lumen
}

const ASSURANCES = [
  'Answers start at a typical student’s. Change the ones that differ.',
  'Nothing is final. You can change any answer later.',
  'Your answers stay in this browser. Nothing is uploaded.',
]

export function ProfileScreen({ lumen }: Props) {
  const [loaded, setLoaded] = useState<{ name: string; previous: Profile } | null>(null)

  const loadSample = (sample: StudyProfile) => {
    setLoaded({ name: sample.name, previous: lumen.profile })
    lumen.replaceProfile(sample.profile)
  }

  const undoSample = () => {
    if (loaded) lumen.replaceProfile(loaded.previous)
    setLoaded(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    navigate('result')
  }

  return (
    <div className="split profile-screen">
      <Chamber className="split__chamber" badge aria-labelledby="profile-title">
        <p className="label chamber__kicker">Step 01 of 03</p>
        <h1 id="profile-title" tabIndex={-1}>
          Tell {APP_NAME} about <em>you</em>
        </h1>
        <p className="lead">
          Seven questions, about a minute. {APP_NAME} then estimates your chance of campus placement and shows how each
          answer counts.
        </p>

        <ol className="assurances">
          {ASSURANCES.map((text, index) => (
            <li key={text}>
              <span className="label num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <section className="samples" aria-labelledby="samples-title">
          <h2 id="samples-title" className="label">
            Or start from a sample student
          </h2>
          <div className="samples__list">
            {STUDY_PROFILES.map((sample) => (
              <button key={sample.id} type="button" className="pill pill--ghost" onClick={() => loadSample(sample)}>
                {sample.name}
                <span className="pill__meta num">CGPA {formatValue('cgpa', sample.profile.cgpa)}</span>
              </button>
            ))}
          </div>
          <p className="samples__status" aria-live="polite">
            {loaded && (
              <>
                Showing {loaded.name}’s answers.{' '}
                <button type="button" className="link-button" onClick={undoSample}>
                  Undo
                </button>
              </>
            )}
          </p>
        </section>
      </Chamber>

      <form className="split__work profile-form" onSubmit={submit} aria-label="Your profile">
        {GROUPS.map((group) => (
          <section key={group.id} className="form-group" aria-labelledby={`group-${group.id}`}>
            <h2 className="form-group__title label" id={`group-${group.id}`}>
              {group.label}
            </h2>
            {group.keys.map((key) => (
              <FactorField
                key={key}
                factorKey={key}
                index={questionNumber(key)}
                value={lumen.profile[key]}
                onChange={(value) => {
                  setLoaded(null)
                  lumen.setProfileValue(key, value)
                }}
              />
            ))}
          </section>
        ))}

        <div className="form-footer">
          <p className="muted">You can come back and change anything.</p>
          <button type="submit" className="pill pill--solid">
            See my result
            <ArrowRightIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
