import type { ReactNode } from 'react'
import { APP_NAME } from '../brand'
import { probabilityOf } from '../model/explain'
import { STUDY_PROFILES } from '../model/profiles'
import { MODEL, SPEC, type FactorKey, type Profile } from '../model/scorecard'
import scorecard from '../model/scorecard.json'
import { routeHref } from '../state/useHashRoute'

/** Column names exactly as they appear in the source CSV. */
const RAW_COLUMN: Record<FactorKey, string> = {
  cgpa: 'CGPA',
  aptitude: 'AptitudeTestScore',
  projects: 'Projects',
  certifications: 'Workshops/Certifications',
  softSkills: 'SoftSkillsRating',
  training: 'PlacementTraining',
  extracurricular: 'ExtracurricularActivities',
}

const COLUMNS = scorecard.features.map((f) => f.key as FactorKey)

function Cell({ n, code, children }: { n: number; code: string; children: ReactNode }) {
  return (
    <div className="nb-cell">
      <div className="nb-cell__in">
        <span className="nb-cell__prompt">In [{n}]:</span>
        <code>{code}</code>
      </div>
      <div className="nb-cell__out">
        <span className="nb-cell__prompt">Out[{n}]:</span>
        <div className="nb-cell__result">{children}</div>
      </div>
    </div>
  )
}

interface Props {
  params: URLSearchParams
  fallback: Profile
}

export function BaselineScreen({ params, fallback }: Props) {
  const study = STUDY_PROFILES.find((s) => s.id === params.get('profile'))
  const profile = study?.profile ?? fallback
  const probability = probabilityOf(profile)
  const width = Math.max(...COLUMNS.map((key) => RAW_COLUMN[key].length))

  return (
    <div className="baseline">
      <div className="nb-bar">
        <span>placement_model.ipynb</span>
        <span className="nb-bar__kernel">Python 3 (ipykernel)</span>
      </div>
      <div className="nb">
        <h1 className="visually-hidden" tabIndex={-1}>
          Model output{study ? ` for ${study.name}` : ''}
        </h1>
        <Cell n={1} code="student">
          <table className="nb-frame">
            <thead>
              <tr>
                <th />
                {COLUMNS.map((key) => (
                  <th key={key}>{RAW_COLUMN[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>0</th>
                {COLUMNS.map((key) => (
                  <td key={key}>{SPEC[key].step < 1 ? profile[key].toFixed(1) : profile[key]}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </Cell>
        <Cell n={2} code="model.predict_proba(student)[:, 1]">
          <pre>array([{probability.toFixed(8)}])</pre>
        </Cell>
        <Cell n={3} code="model.predict(student)">
          <pre>array([{probability >= 0.5 ? 1 : 0}])</pre>
        </Cell>
        <Cell n={4} code="pd.Series(model.coef_[0], index=student.columns)">
          <pre>
            {COLUMNS.map((key) => `${RAW_COLUMN[key].padEnd(width + 4)}${SPEC[key].weight.toFixed(6)}`).join('\n')}
            {'\ndtype: float64'}
          </pre>
        </Cell>
        <Cell n={5} code="model.intercept_">
          <pre>array([{MODEL.intercept.toFixed(8)}])</pre>
        </Cell>
      </div>
      <a className="baseline__exit" href={routeHref('profile')}>
        Open {APP_NAME}
      </a>
    </div>
  )
}
