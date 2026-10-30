import { ArrowRightIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { APP_NAME } from '../brand'
import { Chamber } from '../components/Chamber'
import { FactorField } from '../components/FactorField'
import { GROUPS, entryError, formatValue, questionNumber } from '../model/factors'
import { STUDY_PROFILES, type StudyProfile } from '../model/profiles'
import { FACTOR_KEYS, type FactorKey, type Profile } from '../model/scorecard'
import { navigate } from '../state/useHashRoute'
import type { Lumen } from '../state/useLumen'

interface Props {
  lumen: Lumen
}

const ASSURANCES = [
  'Answers start at a typical student’s. Change the ones that differ.',
  'Nothing is final. You can change any answer later.',
  'Your answers stay in this tab and are cleared when you close it. Nothing is uploaded.',
]

export function ProfileScreen({ lumen }: Props) {
  const [loaded, setLoaded] = useState<{ name: string; previous: Profile } | null>(null)
  const [answersKey, setAnswersKey] = useState(0)

  const loadSample = (sample: StudyProfile) => {
    setAnswersKey((key) => key + 1)
    setLoaded({ name: sample.name, previous: lumen.profile })
    lumen.replaceProfile(sample.profile)
  }

  const undoSample = () => {
    setAnswersKey((key) => key + 1)
    if (loaded) lumen.replaceProfile(loaded.previous)
    setLoaded(null)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const blocked = [...event.currentTarget.querySelectorAll<HTMLInputElement>('input[data-factor]')].filter((input) => {
      const key = input.dataset.factor
      return FACTOR_KEYS.some((factor) => factor === key) && entryError(key as FactorKey, input.value) !== null
    })
    if (blocked.length > 0) {
      blocked[0].focus()
      return
    }
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
        <button type="submit" form="profile-form" className="pill pill--solid" data-cue="transition">
          See my result
          <ArrowRightIcon size={18} aria-hidden="true" />
        </button>

        <ul className="assurances">
          {ASSURANCES.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>

        <section className="samples" aria-labelledby="samples-title">
          <h2 id="samples-title" className="label">
            Or start from a sample student
          </h2>
          <div className="samples__list">
            {STUDY_PROFILES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className="pill pill--ghost"
                onClick={() => loadSample(sample)}
                data-cue="transition"
              >
                {sample.name}
                <span className="pill__meta num">CGPA {formatValue('cgpa', sample.profile.cgpa)}</span>
              </button>
            ))}
          </div>
          <p className="samples__status" aria-live="polite">
            {loaded && (
              <>
                Showing {loaded.name}’s answers.{' '}
                <button type="button" className="link-button" onClick={undoSample} data-cue="undo">
                  Undo
                </button>
              </>
            )}
          </p>
        </section>
      </Chamber>

      <form id="profile-form" className="split__work profile-form" onSubmit={submit} aria-label="Your profile">
        {GROUPS.map((group) => (
          <section key={group.id} className="form-group" aria-labelledby={`group-${group.id}`}>
            <h2 className="form-group__title label" id={`group-${group.id}`}>
              {group.label}
            </h2>
            {group.keys.map((key) => (
              <FactorField
                key={`${key}-${answersKey}`}
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
          <button type="submit" className="pill pill--solid" data-cue="transition">
            See my result
            <ArrowRightIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
