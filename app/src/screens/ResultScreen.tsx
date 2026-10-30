import { ArrowRightIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { APP_NAME } from '../brand'
import { Chamber } from '../components/Chamber'
import { ChanceIcons } from '../components/ChanceIcons'
import { FactorChart } from '../components/FactorChart'
import { ListenButton } from '../components/ListenButton'
import { ScoreTrack } from '../components/ScoreTrack'
import {
  BAND_START_SCORE,
  BAND_WORD,
  chanceSentence,
  explain,
  nextBand,
  signed,
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

function leaders(contributions: Contribution[], sign: 1 | -1): Contribution[] {
  const directed = contributions.filter((c) => Math.sign(c.shown) === sign)
  if (directed.length === 0) return []
  const best = Math.max(...directed.map((c) => sign * c.shown))
  return directed.filter((c) => sign * c.shown === best)
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function scoreLine(result: Explanation): string {
  const target = nextBand(result.band)
  if (!target) return `Above the strong line at ${Math.round(BAND_START_SCORE.strong)} points.`
  return `${BAND_WORD[target]} starts at ${Math.round(BAND_START_SCORE[target])} points.`
}

function spokenSummary(result: Explanation): string {
  const helps = leaders(result.contributions, 1)
  const drags = leaders(result.contributions, -1)
  const points = (c: Contribution) => `${Math.abs(c.shown)} ${Math.abs(c.shown) === 1 ? 'point' : 'points'}`
  const each = (group: Contribution[]) => (group.length > 1 ? ' each' : '')
  return [
    `${BAND_WORD[result.band]} chance.`,
    chanceSentence(result.outOfTen),
    `That is ${result.shownScore} points. ${scoreLine(result)}`,
    helps.length
      ? `Helping you most: ${joinNames(helps.map((c) => FACTORS[c.key].noun))}, plus ${points(helps[0])}${each(helps)}.`
      : '',
    drags.length
      ? `Holding you back most: ${joinNames(drags.map((c) => FACTORS[c.key].noun))}, minus ${points(drags[0])}${each(drags)}.`
      : '',
  ].join(' ')
}

export function ResultScreen({ lumen, speechRate }: Props) {
  const result = useMemo(() => explain(lumen.profile), [lumen.profile])
  const helps = leaders(result.contributions, 1)
  const drags = leaders(result.contributions, -1)

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
            <span className="result-score__value num">{result.shownScore}</span>
            <span className="muted">points</span>
            <span className="muted">{scoreLine(result)}</span>
          </div>
          <ScoreTrack score={result.score} probability={result.probability} />
        </div>

        <div className="actions">
          <a className="pill pill--solid" href={routeHref('explore')} data-cue="transition">
            Explore changes
            <ArrowRightIcon size={18} aria-hidden="true" />
          </a>
          <ListenButton text={spokenSummary(result)} rate={speechRate} />
        </div>

        {(helps.length > 0 || drags.length > 0) && (
          <dl className="extremes">
            {helps.length > 0 && (
              <div className="extreme">
                <dt className="label muted">Helping you most</dt>
                <dd>
                  {joinNames(helps.map((c) => FACTORS[c.key].label))}
                  <span className="tag num" data-sign="1">
                    {signed(helps[0].shown)}
                    {helps.length > 1 ? ' each' : ''}
                  </span>
                </dd>
              </div>
            )}
            {drags.length > 0 && (
              <div className="extreme">
                <dt className="label muted">Holding you back most</dt>
                <dd>
                  {joinNames(drags.map((c) => FACTORS[c.key].label))}
                  <span className="tag num" data-sign="-1">
                    {signed(drags[0].shown)}
                    {drags.length > 1 ? ' each' : ''}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        )}
      </Chamber>

      <div className="split__work">
        <FactorChart explanation={result} />
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
        <a className="text-link label" href={routeHref('profile')} data-cue="transition">
          Edit your answers
        </a>
      </div>
    </div>
  )
}
