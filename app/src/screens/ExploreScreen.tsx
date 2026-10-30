import { ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, ArrowUUpRightIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Chamber } from '../components/Chamber'
import { ChanceIcons } from '../components/ChanceIcons'
import { FactorField } from '../components/FactorField'
import { ScoreTrack } from '../components/ScoreTrack'
import { BAND_LABEL, chanceSentence, explain, signed } from '../model/explain'
import { GROUPS, questionNumber } from '../model/factors'
import type { FactorKey } from '../model/scorecard'
import { describeChange, suggestNextBand } from '../model/whatIf'
import type { Lumen } from '../state/useLumen'

interface Props {
  lumen: Lumen
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = isMac ? '⌘' : 'Ctrl+'

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return settled
}

export function ExploreScreen({ lumen }: Props) {
  const { profile, scenario, undo, redo } = lumen
  const base = useMemo(() => explain(profile), [profile])
  const now = useMemo(() => explain(scenario), [scenario])
  const suggestion = useMemo(() => suggestNextBand(scenario), [scenario])
  const pointsByKey = Object.fromEntries(now.contributions.map((c) => [c.key, c.shown])) as Record<FactorKey, number>
  const delta = now.shownScore - base.shownScore
  const deltaText = delta === 0 ? 'Same as your answers' : `${signed(delta)} from your answers`
  const announcement = useDebounced(`Score ${now.shownScore}. ${BAND_LABEL[now.band]}.`, 700)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (event.target instanceof HTMLInputElement && event.target.type === 'text') return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="split explore-screen">
      <Chamber className="split__chamber live" light={now.probability} aria-labelledby="explore-title">
        <p className="label chamber__kicker">Step 03 of 03</p>
        <h1 id="explore-title" tabIndex={-1}>
          Explore <em>changes</em>
        </h1>
        <p className="lead">Try a change and your chance updates instantly. Your saved answers stay as they are.</p>

        <div className="live__result">
          <p className="label muted">With these changes</p>
          <p className="live__band">{BAND_LABEL[now.band]}</p>
          <p className="live__score">
            <span className="result-score__value num">{now.shownScore}</span>
            <span className="tag num" data-sign={Math.sign(delta)}>
              {deltaText}
            </span>
          </p>
          <ScoreTrack score={now.score} probability={now.probability} was={base.score} />
          <ChanceIcons outOfTen={now.outOfTen} size="small" />
          <p>{chanceSentence(now.outOfTen)}</p>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </Chamber>

      <div className="split__work">
        {suggestion ? (
          <section className="suggestion" aria-labelledby="suggestion-title">
            <p className="label muted">Suggestion</p>
            <h2 id="suggestion-title">
              Quickest route to a <em>{BAND_LABEL[suggestion.target].toLowerCase()}</em>
            </h2>
            <ol className="suggestion__changes">
              {suggestion.changes.map((change, index) => (
                <li key={change.key}>
                  <span className="label num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {describeChange(change)}
                </li>
              ))}
            </ol>
            <div className="suggestion__footer">
              <p className="muted">Picked from changes most students can make within a semester.</p>
              <button type="button" className="pill pill--solid" onClick={() => lumen.editScenario(suggestion.profile)}>
                Try {suggestion.changes.length === 1 ? 'this change' : 'these changes'}
              </button>
            </div>
          </section>
        ) : (
          <section className="suggestion" aria-labelledby="suggestion-title">
            <p className="label muted">Suggestion</p>
            <h2 id="suggestion-title">
              This scenario already has a <em>strong chance</em>
            </h2>
            <p className="muted">Undo, or go back to your answers, to compare what made the difference.</p>
          </section>
        )}

        <div className="history" role="group" aria-label="Change history">
          <button
            type="button"
            className="pill pill--ghost pill--small history__step"
            onClick={undo}
            aria-disabled={!lumen.canUndo}
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
            Score {now.shownScore}
            {delta !== 0 && ` · ${signed(delta)}`}
          </span>
        </p>
        <div className="live-bar__history" role="group" aria-label="Undo and redo">
          <button type="button" className="round-button" onClick={undo} aria-disabled={!lumen.canUndo} aria-label="Undo">
            <ArrowUUpLeftIcon size={20} aria-hidden="true" />
          </button>
          <button type="button" className="round-button" onClick={redo} aria-disabled={!lumen.canRedo} aria-label="Redo">
            <ArrowUUpRightIcon size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
