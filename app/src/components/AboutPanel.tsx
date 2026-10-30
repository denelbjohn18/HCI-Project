import { APP_NAME } from '../brand'
import { AVERAGE_SCORE } from '../model/explain'
import { DATASET, EVALUATION } from '../model/scorecard'

const per100 = (share: number) => Math.round(share * 100)
const thousands = (n: number) => n.toLocaleString('en-IN')

export function AboutPanel() {
  const trainedOn = DATASET.students - EVALUATION.testStudents

  return (
    <div className="prose">
      <section>
        <h3>What {APP_NAME} does</h3>
        <p>
          {APP_NAME} estimates your chance of campus placement and shows exactly which parts of your profile raise or
          lower it, so you can decide what to work on next.
        </p>
      </section>

      <section>
        <h3>How it works</h3>
        <p>
          A logistic regression model learned from {thousands(trainedOn)} past students in a public dataset. {APP_NAME}{' '}
          turns that model into points: everyone starts at the average student’s score of {Math.round(AVERAGE_SCORE)},
          and each factor adds or removes points. The points are the model itself, not an approximation of it.
        </p>
      </section>

      <section>
        <h3>How often it is right</h3>
        <p>
          Tested on {thousands(EVALUATION.testStudents)} students it had never seen, it was right about{' '}
          {per100(EVALUATION.accuracy)} times in 100. Always guessing “not placed” would be right{' '}
          {per100(1 - DATASET.placedShare)} times in 100.
        </p>
      </section>

      <section>
        <h3>What it cannot know</h3>
        <p>
          Interviews, company demand, your branch, and luck. The data comes from one campus whose details are not
          published, so treat every result as a guide, not a verdict.
        </p>
      </section>

      <section>
        <h3>Left out on purpose</h3>
        <p>
          Class 10 and 12 marks, because you cannot change them now and they added little. Internships, because once
          the other factors were known they did not improve predictions.
        </p>
      </section>

      <section>
        <h3>Your privacy</h3>
        <p>Everything you enter stays in this browser tab. Nothing is sent anywhere.</p>
      </section>

      <p className="prose__source">
        Data:{' '}
        <a href={DATASET.url} target="_blank" rel="noreferrer">
          {DATASET.name}
        </a>
        , {DATASET.license}. Built for AIM4141 Human Computer Interaction.
      </p>
    </div>
  )
}
