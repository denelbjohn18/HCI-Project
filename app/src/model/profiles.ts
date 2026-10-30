import type { Profile } from './scorecard'

/** Dataset averages, rounded to values a student could actually have. */
export const TYPICAL_PROFILE: Profile = {
  cgpa: 7.7,
  aptitude: 79,
  projects: 2,
  certifications: 1,
  softSkills: 4.3,
  training: 1,
  extracurricular: 1,
}

export interface StudyProfile {
  id: string
  name: string
  profile: Profile
}

/**
 * Two real students from the held-out test split (rows 3227 and 2788 of the
 * de-duplicated data), renamed. Both sit near a 36% chance, have one clearly
 * largest drag, and need two short-term changes to reach a strong chance, so
 * either can be used first in the comparison study.
 */
export const STUDY_PROFILES: StudyProfile[] = [
  {
    id: 'meera',
    name: 'Meera',
    profile: {
      cgpa: 8.5,
      aptitude: 75,
      projects: 2,
      certifications: 2,
      softSkills: 4.5,
      training: 0,
      extracurricular: 1,
    },
  },
  {
    id: 'kabir',
    name: 'Kabir',
    profile: {
      cgpa: 7.9,
      aptitude: 89,
      projects: 1,
      certifications: 1,
      softSkills: 4.0,
      training: 1,
      extracurricular: 0,
    },
  },
]
