import "../styles/_generateButton.scss";

function GenerateButton({ generate, isLoading, error }) {
  return (
    <div className="generate-row">
      <button className="btn-generate" onClick={generate} disabled={isLoading}>
        {isLoading ? "Reading..." : "Generate structured read"}
      </button>
      <div className="error-note">{error}</div>
    </div>
  );
}

export default GenerateButton;