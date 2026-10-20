import "../styles/_structuredOutput.scss";

/**
 * @name StructuredOutput
 * @description Renders the structured result card once a result exists. Expects the shape returned by ai.service.js.
 * @access Public
 */
function StructuredOutput({ result }) {
  if (!result) return null;
  const skillGaps = result.skillGaps.flatMap((gap) => gap.skills.map((skill) => `${skill} (${gap.severity})`));

  return (
    <div className="output-card">
      <div className="output-card__title">Structured read</div>

      <div className="output-card__field">
        <div className="k">match score</div>
        <div className="v">{result.matchScore}%</div>
      </div>

      <div className="output-card__field">
        <div className="k">technical questions</div>
        {result.technicalQuestions.map((item) => (
          <div className="output-card__item" key={item.question}>
            <strong>{item.question}</strong><p>{item.intention}</p><p>{item.answer}</p>
          </div>
        ))}
      </div>

      <div className="output-card__field">
        <div className="k">behavioral questions</div>
        {result.behavioralQuestions.map((item) => (
          <div className="output-card__item" key={item.question}>
            <strong>{item.question}</strong><p>{item.intention}</p><p>{item.answer}</p>
          </div>
        ))}
      </div>

      <div className="output-card__field">
        <div className="k">skill gaps</div>
        <div className="v">
          {skillGaps.map((gap) => (
            <span className="tag" key={gap}>
              {gap}
            </span>
          ))}
        </div>
      </div>

      <div className="output-card__field">
        <div className="k">preparation plan</div>
        {result.preparationPlan.map((day) => (
          <div className="output-card__item" key={day.day}>
            <strong>Day {day.day}: {day.focus}</strong>
            <ul>{day.tasks.map((task) => <li key={task}>{task}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StructuredOutput;