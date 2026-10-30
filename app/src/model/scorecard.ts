import data from './scorecard.json'

export const FACTOR_KEYS = [
  'cgpa',
  'aptitude',
  'projects',
  'certifications',
  'softSkills',
  'training',
  'extracurricular',
] as const

export type FactorKey = (typeof FACTOR_KEYS)[number]
export type Profile = Record<FactorKey, number>

export interface FeatureSpec {
  key: FactorKey
  weight: number
  min: number
  max: number
  step: number
  mean: number
}

function indexFeatures(): Record<FactorKey, FeatureSpec> {
  const byKey = new Map(data.features.map((f) => [f.key, f]))
  return Object.fromEntries(
    FACTOR_KEYS.map((key) => {
      const feature = byKey.get(key)
      if (!feature) throw new Error(`scorecard.json has no "${key}" feature; rerun model/train.py`)
      return [key, { ...feature, key }]
    }),
  ) as Record<FactorKey, FeatureSpec>
}

export const SPEC = indexFeatures()
export const MODEL = data.model
export const DATASET = data.dataset
export const EVALUATION = data.evaluation
export const EXCLUDED = data.excluded
