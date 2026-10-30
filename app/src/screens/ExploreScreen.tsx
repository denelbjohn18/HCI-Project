import { ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Chamber } from '../components/Chamber'
import { ChanceIcons } from '../components/ChanceIcons'
import { FactorField } from '../components/FactorField'
import { ScoreTrack } from '../components/ScoreTrack'
import { cue } from '../lib/feedback'
import { BAND_LABEL, BAND_WORD, chanceSentence, explain, signed, type Band } from '../model/explain'
import { GROUPS, questionNumber } from '../model/factors'
import type { FactorKey } from '../model/scorecard'
import { describeChange, suggestNextBand, type Change } from '../model/whatIf'
import type { Lumen } from '../state/useLumen'

interface Props {
  lumen: Lumen
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = isMac ? '⌘' : 'Ctrl+'
const BAND_ORDER: Record<Band, number> = { low: 0, moderate: 1, strong: 2 }

function semesterSized(changes: Change[]): boolean {
  if (changes.length > 3) return false
  return changes.every((change) => {
    const diff = change.to - change.from
    switch (change.key) {
      case 'aptitude':
        return diff <= 15
      case 'softSkills':
        return diff <= 1
      case 'projects':
        return diff <= 1
      case 'certifications':
        return diff <= 2
      case 'training':
      case 'extracurricular':
      case 'cgpa':
        return true
      default: {
        const unhandled: never = change.key
        throw new Error(`Unhandled factor ${String(unhandled)}`)
      }
    }
  })
}

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return settled
}

export function ExploreScreen({ lumen }: Props) {
  const { profile, scenario, undo, redo, canUndo, canRedo } = lumen
  const base = useMemo(() => explain(profile), [profile])
  const now = useMemo(() => explain(scenario), [scenario])
  const suggestion = useMemo(() => suggestNextBand(scenario), [scenario])
  const pointsByKey = Object.fromEntries(now.contributions.map((c) => [c.key, c.shown])) as Record<FactorKey, number>
  const delta = now.shownScore - base.shownScore
  const deltaText = delta === 0 ? 'Same as your answers' : `${signed(delta)} from your answers`
  const announcement = useDebounced(
    `${BAND_LABEL[now.band]}. ${now.outOfTen} in 10. ${now.shownScore} points.`,
    700,
  )
  const suggestionHeading = useRef<HTMLHeadingElement>(null)
  const focusSuggestion = useRef(false)
  const heardBand = useRef(now.band)

  useEffect(() => {
    if (now.band === heardBand.current) return
    cue(BAND_ORDER[now.band] > BAND_ORDER[heardBand.current] ? 'bandUp' : 'bandDown')
    heardBand.current = now.band
  }, [now.band])

  useLayoutEffect(() => {
    if (!focusSuggestion.current) return
    focusSuggestion.current = false
    suggestionHeading.current?.focus()
  }, [scenario])

  const applySuggestion = () => {
    if (!suggestion) return
    focusSuggestion.current = true
    lumen.editScenario(suggestion.profile)
  }

  useEffect(() => {
    const back = () => {
      cue(canUndo ? 'undo' : 'limit')
      undo()
    }
    const forward = () => {
      cue(canRedo ? 'redo' : 'limit')
      redo()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (event.target instanceof HTMLInputElement && event.target.type === 'text') return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) forward()
        else back()
      } else if (key === 'y') {
        event.preventDefault()
        forward()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, canUndo, canRedo])

  return (
    <div className="split explore-screen">
      <Chamber className="split__chamber live" light={now.probability} aria-labelledby="explore-title">
        <p className="label chamber__kicker">Step 03 of 03 · Explore</p>
        <h1 id="explore-title" tabIndex={-1}>
          {BAND_WORD[now.band]} <em>chance</em>
        </h1>

        <div className="live__result">
          <ChanceIcons outOfTen={now.outOfTen} size="small" />
          <p className="lead">{chanceSentence(now.outOfTen)}</p>
          <p className="live__score">
            <span className="result-score__value num">{now.shownScore}</span>
            <span className="muted">points</span>
            <span className="tag num" data-sign={Math.sign(delta)}>
              {deltaText}
            </span>
          </p>
          <ScoreTrack score={now.score} probability={now.probability} was={base.score} />
          <p className="muted">Try a change. Your saved answers stay as they are.</p>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </Chamber>

      <div className="split__work">
        <section className="suggestion" aria-labelledby="suggestion-title">
          <p className="label muted">Suggestion</p>
          {suggestion ? (
            <h2 id="suggestion-title" tabIndex={-1} ref={suggestionHeading}>
              Quickest route to a <em>{BAND_LABEL[suggestion.target].toLowerCase()}</em>
            </h2>
          ) : (
            <h2 id="suggestion-title" tabIndex={-1} ref={suggestionHeading}>
              Already a <em>strong chance</em>
            </h2>
          )}
          <div
            className="suggestion__body"
            tabIndex={suggestion && suggestion.changes.length > 3 ? 0 : undefined}
            aria-label={suggestion && suggestion.changes.length > 3 ? 'Suggested changes' : undefined}
          >
            {suggestion ? (
              <>
                <ul className="suggestion__changes">
                  {suggestion.changes.map((change) => (
                    <li key={change.key}>{describeChange(change)}</li>
                  ))}
                </ul>
                {semesterSized(suggestion.changes) && (
                  <p className="suggestion__note muted">Picked from changes most students can make within a semester.</p>
                )}
              </>
            ) : (
              <p className="muted">Undo, or go back to your answers, to compare what made the difference.</p>
            )}
          </div>
          <div className="suggestion__footer">
            {suggestion && (
              <button type="button" className="pill pill--solid" onClick={applySuggestion} data-cue="transition">
                Try {suggestion.changes.length === 1 ? 'this change' : 'these changes'}
              </button>
            )}
          </div>
        </section>

        <div className="history" role="group" aria-label="Change history">
          <button
            type="button"
            className="pill pill--ghost pill--small history__step"
            onClick={undo}
            aria-disabled={!lumen.canUndo}
            data-cue="undo"
            aria-keyshortcuts="Control+Z Meta+Z"
            title={`Undo (${MOD}Z)`}
          >
            <ArrowUUpLeftIcon size={16} aria-hidden="true" />
            Undo
          </button>
          <button
            type="button"
            className="pill pill--ghost pill--small history__step"
            onClick={redo}
            aria-disabled={!lumen.canRedo}
            data-cue="redo"
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
            title={`Redo (${MOD}Shift+Z)`}
          >
            <ArrowUUpRightIcon size={16} aria-hidden="true" />
            Redo
          </button>
          <button
            type="button"
            className="pill pill--ghost pill--small history__reset"
            onClick={() => lumen.isScenarioChanged && lumen.resetScenario()}
            aria-disabled={!lumen.isScenarioChanged}
            data-cue="transition"
          >
            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
            Back to my answers
          </button>
        </div>

        {GROUPS.map((group) => (
          <section key={group.id} className="form-group" aria-labelledby={`explore-${group.id}`}>
            <h2 className="form-group__title label" id={`explore-${group.id}`}>
              {group.label}
            </h2>
            {group.keys.map((key) => (
              <FactorField
                key={key}
                factorKey={key}
                index={questionNumber(key)}
                value={scenario[key]}
                was={profile[key]}
                points={pointsByKey[key]}
                onChange={(value) => lumen.editScenario({ [key]: value }, key)}
              />
            ))}
          </section>
        ))}
      </div>

      <div className="live-bar">
        <p className="live-bar__status" aria-hidden="true">
          <span className="live-bar__band">{BAND_LABEL[now.band]}</span>
          <span className="num muted">
            {now.shownScore} points
            {delta !== 0 && ` · ${signed(delta)}`}
          </span>
        </p>
        <div className="live-bar__history" role="group" aria-label="Undo and redo">
          <button
            type="button"
            className="round-button"
            onClick={undo}
            aria-disabled={!lumen.canUndo}
            aria-label="Undo"
            data-cue="undo"
          >
            <ArrowUUpLeftIcon size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="round-button"
            onClick={redo}
            aria-disabled={!lumen.canRedo}
            aria-label="Redo"
            data-cue="redo"
          >
            <ArrowUUpRightIcon size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
