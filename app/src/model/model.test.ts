import { describe, expect, it } from 'vitest'
import { AVERAGE_SCORE, BAND_FLOOR, SCORE_BOUNDS, apportion, bandFor, explain, pointsFor, probabilityOf } from './explain'
import { snap } from './factors'
import { STUDY_PROFILES, TYPICAL_PROFILE } from './profiles'
import { FACTOR_KEYS, SPEC, type Profile } from './scorecard'
import { suggestNextBand } from './whatIf'

function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomProfiles(count: number): Profile[] {
  const random = seededRandom(7)
  return Array.from({ length: count }, () =>
    Object.fromEntries(
      FACTOR_KEYS.map((key) => {
        const { min, max } = SPEC[key]
        return [key, snap(key, min + random() * (max - min))]
      }),
    ) as Profile,
  )
}

describe('explain', () => {
  it('shows factor points that add up exactly to the shown score', () => {
    for (const profile of randomProfiles(500)) {
      const result = explain(profile)
      const sum = result.contributions.reduce((total, c) => total + c.shown, 0)
      expect(result.shownAverage + sum).toBe(result.shownScore)
    }
  })

  it('gives an all-average student the average score', () => {
    const average = Object.fromEntries(FACTOR_KEYS.map((key) => [key, SPEC[key].mean])) as Profile
    expect(explain(average).score).toBeCloseTo(AVERAGE_SCORE, 6)
  })

  it('never lowers the score when a factor improves', () => {
    for (const key of FACTOR_KEYS) {
      expect(pointsFor(key, SPEC[key].max)).toBeGreaterThan(pointsFor(key, SPEC[key].min))
    }
  })

  it('counts an answer outside the dataset as the nearest value it knows', () => {
    const above = { ...TYPICAL_PROFILE, cgpa: 10, aptitude: 100, softSkills: 5 }
    const capped = {
      ...TYPICAL_PROFILE,
      cgpa: SPEC.cgpa.max,
      aptitude: SPEC.aptitude.max,
      softSkills: SPEC.softSkills.max,
    }
    const below = { ...TYPICAL_PROFILE, cgpa: 0, aptitude: 0, softSkills: 0 }
    const floored = {
      ...TYPICAL_PROFILE,
      cgpa: SPEC.cgpa.min,
      aptitude: SPEC.aptitude.min,
      softSkills: SPEC.softSkills.min,
    }
    expect(explain(above).score).toBeCloseTo(explain(capped).score, 6)
    expect(explain(below).score).toBeCloseTo(explain(floored).score, 6)
    expect(SCORE_BOUNDS.min).toBeGreaterThan(0)
    expect(SCORE_BOUNDS.max).toBeLessThan(100)
  })

  it('places band boundaries at the stated probabilities', () => {
    expect(bandFor(BAND_FLOOR.moderate - 0.001)).toBe('low')
    expect(bandFor(BAND_FLOOR.moderate)).toBe('moderate')
    expect(bandFor(BAND_FLOOR.strong)).toBe('strong')
  })
})

describe('apportion', () => {
  it('rounds parts so they still add up to the requested total', () => {
    expect(apportion([1.4, 1.4, 1.2], 4)).toEqual([2, 1, 1])
    expect(apportion([-2.6, 0.3, 1.1], -1)).toEqual([-2, 0, 1])
    expect(apportion([0.2, 0.2], 0).reduce((a, b) => a + b, 0)).toBe(0)
  })
})

describe('study profiles', () => {
  it('start in the moderate band near the same chance', () => {
    for (const { profile } of STUDY_PROFILES) {
      expect(explain(profile).band).toBe('moderate')
      expect(probabilityOf(profile)).toBeGreaterThan(0.33)
      expect(probabilityOf(profile)).toBeLessThan(0.39)
    }
  })

  it('each have one clearly largest drag', () => {
    const [meera, kabir] = STUDY_PROFILES.map(({ profile }) =>
      explain(profile)
        .contributions.filter((c) => c.points < 0)
        .sort((a, b) => a.points - b.points),
    )
    expect(meera[0].key).toBe('training')
    expect(kabir[0].key).toBe('extracurricular')
    for (const drags of [meera, kabir]) expect(drags[1].points - drags[0].points).toBeGreaterThan(1.5)
  })

  it('gives Meera two factors the same rounded help', () => {
    const helps = explain(STUDY_PROFILES[0].profile).contributions.filter((c) => c.shown > 0)
    const best = Math.max(...helps.map((c) => c.shown))
    expect(helps.filter((c) => c.shown === best).map((c) => c.key).sort()).toEqual(['cgpa', 'extracurricular'])
  })

  it('each need two changes to reach a strong chance', () => {
    for (const { profile } of STUDY_PROFILES) {
      const suggestion = suggestNextBand(profile)
      expect(suggestion?.target).toBe('strong')
      expect(suggestion?.changes).toHaveLength(2)
      expect(explain(suggestion!.profile).band).toBe('strong')
    }
  })
})

describe('suggestNextBand', () => {
  it('always reaches the band it promises', () => {
    for (const profile of randomProfiles(150)) {
      const suggestion = suggestNextBand(profile)
      if (suggestion) expect(['moderate', 'strong']).toContain(explain(suggestion.profile).band)
    }
  })

  it('keeps suggesting when a typed answer is already past the data', () => {
    const profile = Object.fromEntries(FACTOR_KEYS.map((key) => [key, SPEC[key].min])) as Profile
    profile.aptitude = 100
    const suggestion = suggestNextBand(profile)
    expect(suggestion).not.toBeNull()
    expect(suggestion!.changes.some((change) => change.key === 'aptitude')).toBe(false)
    expect(suggestion!.profile.aptitude).toBe(100)
    expect(explain(suggestion!.profile).band).toBe(suggestion!.target)
  })

  it('has nothing to suggest once a student is strong', () => {
    const strongest = Object.fromEntries(FACTOR_KEYS.map((key) => [key, SPEC[key].max])) as Profile
    expect(suggestNextBand(strongest)).toBeNull()
  })

  it('starts the typical student in the moderate band', () => {
    expect(explain(TYPICAL_PROFILE).band).toBe('moderate')
  })
})
