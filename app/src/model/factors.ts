import { SPEC, type FactorKey } from './scorecard'

export type Control = 'range' | 'count' | 'yesNo'

export interface FactorInfo {
  label: string
  /** Lower-case noun used inside sentences and button labels. */
  noun: string
  control: Control
  help: string
  /** Size of the change used when explaining what a factor is worth. */
  detailStep: number
  detailUnit: string
}

export const FACTORS: Record<FactorKey, FactorInfo> = {
  cgpa: {
    label: 'CGPA',
    noun: 'CGPA',
    control: 'range',
    help: 'Out of 10. Lumen’s data covers 6.5 to 9.1.',
    detailStep: 0.5,
    detailUnit: 'of CGPA',
  },
  aptitude: {
    label: 'Aptitude test score',
    noun: 'aptitude score',
    control: 'range',
    help: 'Your latest aptitude or practice test, out of 100. Lumen’s data covers 60 to 90.',
    detailStep: 5,
    detailUnit: 'marks',
  },
  projects: {
    label: 'Projects',
    noun: 'projects',
    control: 'count',
    help: 'Projects you can show and explain in an interview.',
    detailStep: 1,
    detailUnit: 'project',
  },
  certifications: {
    label: 'Workshops and certifications',
    noun: 'workshops and certifications',
    control: 'count',
    help: 'Completed workshops, courses, or certifications.',
    detailStep: 1,
    detailUnit: 'workshop or certification',
  },
  softSkills: {
    label: 'Soft skills rating',
    noun: 'soft skills rating',
    control: 'range',
    help: 'From mock interviews or trainers, out of 5. Lumen’s data covers 3.0 to 4.8.',
    detailStep: 0.5,
    detailUnit: 'of rating',
  },
  training: {
    label: 'Placement training',
    noun: 'placement training',
    control: 'yesNo',
    help: 'Have you completed your college’s placement training?',
    detailStep: 1,
    detailUnit: '',
  },
  extracurricular: {
    label: 'Extracurricular activities',
    noun: 'extracurricular activities',
    control: 'yesNo',
    help: 'Do you take part in clubs, sports, or events?',
    detailStep: 1,
    detailUnit: '',
  },
}

export const GROUPS: { id: string; label: string; keys: FactorKey[] }[] = [
  { id: 'academics', label: 'Academics', keys: ['cgpa', 'aptitude'] },
  { id: 'experience', label: 'Experience', keys: ['projects', 'certifications'] },
  { id: 'readiness', label: 'Readiness', keys: ['softSkills', 'training', 'extracurricular'] },
]

const ORDER = GROUPS.flatMap((group) => group.keys)

/** 1-based position of a factor in the form, so every screen numbers questions the same way. */
export function questionNumber(key: FactorKey): number {
  return ORDER.indexOf(key) + 1
}

export function formatValue(key: FactorKey, value: number): string {
  const { control } = FACTORS[key]
  switch (control) {
    case 'yesNo':
      return value >= 0.5 ? 'Yes' : 'No'
    case 'count':
      return value >= SPEC[key].max ? `${value} or more` : String(value)
    case 'range':
      return SPEC[key].step < 1 ? value.toFixed(1) : String(value)
    default: {
      const unhandled: never = control
      throw new Error(`Unhandled control ${String(unhandled)}`)
    }
  }
}

/** Rounds to the factor's step so floating-point drift never reaches the UI. */
export function snap(key: FactorKey, value: number): number {
  const { min, max, step } = SPEC[key]
  const clamped = Math.min(max, Math.max(min, value))
  const snapped = Math.round((clamped - min) / step) * step + min
  return Number(snapped.toFixed(step < 1 ? 1 : 0))
}
