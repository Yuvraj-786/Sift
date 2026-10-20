import "../styles/_structured-read.scss";
import StructuredOutput from "./Structuredoutput";

function StructuredRead({ result }) {
  return (
    <section>
      <div className="section-head">
        <h2>Your structured read</h2>
        <p>This fills in automatically once you generate a read above.</p>
      </div>

      {!result && (
        <div className="placeholder-note">
          Fill in the inputs above and generate to see a structured read appear
          here.
        </div>
      )}

      <StructuredOutput result={result} />
    </section>
  );
}

export default StructuredRead;