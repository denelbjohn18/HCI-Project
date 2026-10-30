import { FACTOR_KEYS, MODEL, SPEC, type FactorKey, type Profile } from './scorecard'

export type Band = 'low' | 'moderate' | 'strong'

/** Probability at which each band starts. */
export const BAND_FLOOR = { moderate: 0.3, strong: 0.6 } as const

export const BAND_LABEL: Record<Band, string> = {
  low: 'Low chance',
  moderate: 'Moderate chance',
  strong: 'Strong chance',
}

const toScore = (logit: number) => MODEL.scoreMidpoint + MODEL.pointsPerLogit * logit
const logitOf = (p: number) => Math.log(p / (1 - p))

export const BAND_START_SCORE = {
  moderate: toScore(logitOf(BAND_FLOOR.moderate)),
  strong: toScore(logitOf(BAND_FLOOR.strong)),
}

/** Score of a student whose every factor sits at the dataset average. */
export const AVERAGE_SCORE = toScore(MODEL.referenceLogit)

export function pointsFor(key: FactorKey, value: number): number {
  const { weight, mean } = SPEC[key]
  return MODEL.pointsPerLogit * weight * (value - mean)
}

/** Largest number of points any single factor can add or remove; keeps chart scales fixed. */
export const POINTS_SPAN = Math.max(
  ...FACTOR_KEYS.map((key) =>
    Math.max(Math.abs(pointsFor(key, SPEC[key].min)), Math.abs(pointsFor(key, SPEC[key].max))),
  ),
)

export function bandFor(probability: number): Band {
  if (probability >= BAND_FLOOR.strong) return 'strong'
  if (probability >= BAND_FLOOR.moderate) return 'moderate'
  return 'low'
}

export function nextBand(band: Band): Exclude<Band, 'low'> | null {
  switch (band) {
    case 'low':
      return 'moderate'
    case 'moderate':
      return 'strong'
    case 'strong':
      return null
    default: {
      const unhandled: never = band
      throw new Error(`Unhandled band ${String(unhandled)}`)
    }
  }
}

export interface Contribution {
  key: FactorKey
  value: number
  points: number
  /** Whole-number points whose sum always equals the shown score minus the shown average. */
  shown: number
}

export interface Explanation {
  probability: number
  band: Band
  score: number
  shownScore: number
  shownAverage: number
  /** Sorted by size of effect, largest first. */
  contributions: Contribution[]
  /** How many of 10 students like this one get placed. */
  outOfTen: number
}

export function probabilityOf(profile: Profile): number {
  const score = AVERAGE_SCORE + FACTOR_KEYS.reduce((sum, key) => sum + pointsFor(key, profile[key]), 0)
  return 1 / (1 + Math.exp(-(score - MODEL.scoreMidpoint) / MODEL.pointsPerLogit))
}

export function explain(profile: Profile): Explanation {
  const raw = FACTOR_KEYS.map((key) => ({ key, value: profile[key], points: pointsFor(key, profile[key]) }))
  const score = AVERAGE_SCORE + raw.reduce((sum, r) => sum + r.points, 0)
  const probability = probabilityOf(profile)
  const shownAverage = Math.round(AVERAGE_SCORE)
  const shownScore = Math.round(score)
  const shown = apportion(
    raw.map((r) => r.points),
    shownScore - shownAverage,
  )

  return {
    probability,
    band: bandFor(probability),
    score,
    shownScore,
    shownAverage,
    contributions: raw
      .map((r, i) => ({ ...r, shown: shown[i] }))
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    outOfTen: Math.round(probability * 10),
  }
}

/**
 * Rounds each value to a whole number so the rounded values add up to `total`
 * (largest-remainder method). Users add the numbers up; they must agree.
 */
export function apportion(values: number[], total: number): number[] {
  const rounded = values.map(Math.floor)
  const byRemainder = values
    .map((v, i) => ({ i, remainder: v - rounded[i] }))
    .sort((a, b) => b.remainder - a.remainder)
  let gap = total - rounded.reduce((sum, v) => sum + v, 0)
  for (let n = 0; gap > 0; n++, gap--) rounded[byRemainder[n % byRemainder.length].i] += 1
  for (let n = byRemainder.length - 1; gap < 0; n--, gap++) {
    rounded[byRemainder[(n + byRemainder.length) % byRemainder.length].i] -= 1
  }
  return rounded
}

export function chanceSentence(outOfTen: number): string {
  if (outOfTen <= 0) return 'Fewer than 1 in 10 students with a profile like yours get placed.'
  if (outOfTen >= 10) return 'Almost every student with a profile like yours gets placed.'
  return `About ${outOfTen} in 10 students with a profile like yours get placed.`
}

export function signed(points: number): string {
  if (points > 0) return `+${points}`
  if (points < 0) return `\u2212${Math.abs(points)}`
  return '0'
}
