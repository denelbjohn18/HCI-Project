import { bandFor, nextBand, probabilityOf, type Band } from './explain'
import { learnedValue, snap } from './factors'
import { FACTOR_KEYS, SPEC, type FactorKey, type Profile } from './scorecard'

interface Move {
  key: FactorKey
  step: number
  /** Rough relative effort of one step, so suggestions favour the easiest route. */
  effort: number
}

/** CGPA is left out on purpose: it barely moves within one placement season. */
const MOVES: Move[] = [
  { key: 'training', step: 1, effort: 1 },
  { key: 'certifications', step: 1, effort: 1 },
  { key: 'aptitude', step: 5, effort: 1 },
  { key: 'softSkills', step: 0.2, effort: 1 },
  { key: 'projects', step: 1, effort: 2 },
  { key: 'extracurricular', step: 1, effort: 2 },
]

const RANK: Record<Band, number> = { low: 0, moderate: 1, strong: 2 }

export interface Change {
  key: FactorKey
  from: number
  to: number
}

export interface Suggestion {
  target: Band
  changes: Change[]
  profile: Profile
}

interface Candidate {
  profile: Profile
  probability: number
  effort: number
  changed: number
}

function isBetter(a: Candidate, b: Candidate): boolean {
  if (a.effort !== b.effort) return a.effort < b.effort
  if (a.changed !== b.changed) return a.changed < b.changed
  return a.probability > b.probability
}

function* stepCombinations(limits: number[], prefix: number[] = []): Generator<number[]> {
  if (prefix.length === limits.length) {
    yield prefix
    return
  }
  for (let n = 0; n <= limits[prefix.length]; n++) yield* stepCombinations(limits, [...prefix, n])
}

function learnedProfile(profile: Profile): Profile {
  return Object.fromEntries(FACTOR_KEYS.map((key) => [key, learnedValue(key, profile[key])])) as Profile
}

/** Finds the lowest-effort combination of short-term changes that reaches the next band up. */
export function suggestNextBand(profile: Profile): Suggestion | null {
  const base = learnedProfile(profile)
  const target = nextBand(bandFor(probabilityOf(base)))
  if (!target) return null

  const limits = MOVES.map((m) => Math.floor((SPEC[m.key].max - base[m.key]) / m.step + 1e-9))
  let best: Candidate | null = null

  for (const steps of stepCombinations(limits)) {
    const draft = { ...base }
    MOVES.forEach((m, i) => {
      if (steps[i] > 0) draft[m.key] = snap(m.key, base[m.key] + steps[i] * m.step)
    })
    const probability = probabilityOf(draft)
    if (RANK[bandFor(probability)] < RANK[target]) continue
    const candidate: Candidate = {
      profile: draft,
      probability,
      effort: MOVES.reduce((sum, m, i) => sum + steps[i] * m.effort, 0),
      changed: steps.filter((n) => n > 0).length,
    }
    if (!best || isBetter(candidate, best)) best = candidate
  }

  if (!best) return null
  const found = best.profile
  const changes = MOVES.filter((m) => found[m.key] !== base[m.key]).map((m) => ({
    key: m.key,
    from: profile[m.key],
    to: found[m.key],
  }))
  const next = { ...profile }
  for (const change of changes) next[change.key] = change.to
  return { target, profile: next, changes }
}

export function describeChange({ key, from, to }: Change): string {
  const diff = Math.round((to - from) * 10) / 10
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
  switch (key) {
    case 'training':
      return 'Complete placement training'
    case 'extracurricular':
      return 'Join a club, team, or event'
    case 'certifications':
      return `Add ${diff} ${plural(diff, 'workshop or certification', 'workshops or certifications')}`
    case 'projects':
      return `Finish ${diff} more ${plural(diff, 'project', 'projects')}`
    case 'aptitude':
      return `Raise your aptitude score to ${to}`
    case 'softSkills':
      return `Raise your soft skills rating to ${to.toFixed(1)}`
    case 'cgpa':
      return `Raise your CGPA to ${to.toFixed(1)}`
    default: {
      const unhandled: never = key
      throw new Error(`Unhandled factor ${String(unhandled)}`)
    }
  }
}
