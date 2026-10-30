import { ArrowRightIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { APP_NAME } from '../brand'
import { Chamber } from '../components/Chamber'
import { ChanceIcons } from '../components/ChanceIcons'
import { FactorChart } from '../components/FactorChart'
import { ListenButton } from '../components/ListenButton'
import { ScoreTrack } from '../components/ScoreTrack'
import {
  BAND_LABEL,
  BAND_START_SCORE,
  chanceSentence,
  explain,
  nextBand,
  signed,
  type Band,
  type Contribution,
  type Explanation,
} from '../model/explain'
import { FACTORS } from '../model/factors'
import { DATASET, EVALUATION } from '../model/scorecard'
import { routeHref } from '../state/useHashRoute'
import type { Lumen } from '../state/useLumen'

interface Props {
  lumen: Lumen
  speechRate: number
}

const BAND_WORD: Record<Band, string> = { low: 'Low', moderate: 'Moderate', strong: 'Strong' }

function extremes(contributions: Contribution[]) {
  const sorted = [...contributions].sort((a, b) => b.shown - a.shown)
  const helps = sorted[0].shown > 0 ? sorted[0] : null
  const drags = sorted[sorted.length - 1].shown < 0 ? sorted[sorted.length - 1] : null
  return { helps, drags }
}

function scoreLine(result: Explanation): string {
  const target = nextBand(result.band)
  if (!target) return `Above the strong line at ${Math.round(BAND_START_SCORE.strong)}.`
  return `${BAND_WORD[target]} starts at ${Math.round(BAND_START_SCORE[target])}.`
}

function spokenSummary(result: Explanation): string {
  const { helps, drags } = extremes(result.contributions)
  const points = (c: Contribution) => `${Math.abs(c.shown)} ${Math.abs(c.shown) === 1 ? 'point' : 'points'}`
  return [
    `${BAND_LABEL[result.band]}.`,
    chanceSentence(result.outOfTen),
    `Your ${APP_NAME} score is ${result.shownScore}. ${scoreLine(result)}`,
    helps ? `Helping you most: ${FACTORS[helps.key].noun}, plus ${points(helps)}.` : '',
    drags ? `Holding you back most: ${FACTORS[drags.key].noun}, minus ${points(drags)}.` : '',
  ].join(' ')
}

export function ResultScreen({ lumen, speechRate }: Props) {
  const result = useMemo(() => explain(lumen.profile), [lumen.profile])
  const { helps, drags } = extremes(result.contributions)

  return (
    <div className="split result-screen">
      <Chamber className="split__chamber" light={result.probability} aria-labelledby="result-title">
        <p className="label chamber__kicker">Step 02 of 03 · Your result</p>
        <h1 id="result-title" tabIndex={-1}>
          {BAND_WORD[result.band]} <em>chance</em> of placement
        </h1>

        <div className="result-chance">
          <ChanceIcons outOfTen={result.outOfTen} showLegend />
          <p className="lead">{chanceSentence(result.outOfTen)}</p>
        </div>

        <div className="result-score">
          <div className="result-score__head">
            <span className="label muted">{APP_NAME} score</span>
            <span className="result-score__value num">{result.shownScore}</span>
            <span className="muted">{scoreLine(result)}</span>
          </div>
          <ScoreTrack score={result.score} probability={result.probability} />
        </div>

        {(helps || drags) && (
          <dl className="extremes">
            {helps && (
              <div className="extreme">
                <dt className="label muted">Helping you most</dt>
                <dd>
                  {FACTORS[helps.key].label}
                  <span className="tag num" data-sign="1">
                    {signed(helps.shown)}
                  </span>
                </dd>
              </div>
            )}
            {drags && (
              <div className="extreme">
                <dt className="label muted">Holding you back most</dt>
                <dd>
                  {FACTORS[drags.key].label}
                  <span className="tag num" data-sign="-1">
                    {signed(drags.shown)}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="actions">
          <a className="pill pill--solid" href={routeHref('explore')}>
            Explore changes
            <ArrowRightIcon size={18} aria-hidden="true" />
          </a>
          <ListenButton text={spokenSummary(result)} rate={speechRate} />
        </div>

        <details className="disclosure">
          <summary>How sure is {APP_NAME}?</summary>
          <div className="disclosure__body">
            <p>
              Tested on {EVALUATION.testStudents.toLocaleString('en-IN')} students it had never seen, {APP_NAME} was
              right about {Math.round(EVALUATION.accuracy * 100)} times in 100.
            </p>
            <p>
              It only knows these seven answers. Interviews, company demand, and luck matter too. The data comes from
              one campus of {DATASET.students.toLocaleString('en-IN')} students, so use this to decide what to work on,
              not to judge yourself.
            </p>
          </div>
        </details>
      </Chamber>

      <div className="split__work">
        <FactorChart explanation={result} />
        <a className="text-link label" href={routeHref('profile')}>
          Edit your answers
        </a>
      </div>
    </div>
  )
}
