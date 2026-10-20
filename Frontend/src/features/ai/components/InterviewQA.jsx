import { useState } from "react";
import { askInterviewQuestion } from "../../auth/services/ai.api.js";
import "../styles/_interview-qa.scss";

function InterviewQA() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitQuestion = async (event) => {
    event?.preventDefault();
    const cleanedQuestion = question.trim();
    setError("");
    setErrorStatus(null);
    if (!cleanedQuestion || cleanedQuestion.length > 2000) {
      setError("Enter a question of 1 to 2,000 characters.");
      setErrorStatus(400);
      return;
    }

    setIsLoading(true);
    try {
      setResult(await askInterviewQuestion(cleanedQuestion));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The interview library could not answer right now.");
      setErrorStatus(requestError.response?.status || null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="interview-qa" id="interview-qa">
      <div className="section-head">
        <h2>Interview Q&amp;A</h2>
        <p>Ask a preparation question and get an answer grounded in the interview library.</p>
      </div>
      <form className="interview-qa__form" onSubmit={submitQuestion}>
        <label htmlFor="interview-question">Your question</label>
        <textarea
          id="interview-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={2000}
          placeholder="How should I structure an answer about a project that missed its goal?"
          required
        />
        <div className="interview-qa__actions">
          <span>{question.length}/2000</span>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Searching…" : "Ask"}
          </button>
        </div>
      </form>
      {error && (
        <div className="interview-qa__error" role="alert">
          <span>{error}</span>
          {errorStatus === 503 && <button type="button" onClick={() => submitQuestion()} disabled={isLoading}>Retry</button>}
        </div>
      )}
      {result && (
        <article className="interview-qa__answer" aria-live="polite">
          <h3>Answer</h3>
          <p>{result.answer}</p>
          {result.sources.length > 0 && (
            <div className="interview-qa__sources">
              {result.sources.map((source, index) => (
                <article className="interview-qa__source" key={`${source.title}-${source.heading}-${index}`}>
                  <h4>{source.title}</h4>
                  {source.heading && <p className="interview-qa__heading">{source.heading}</p>}
                  <p>{source.snippet}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      )}
    </section>
  );
}

export default InterviewQA;