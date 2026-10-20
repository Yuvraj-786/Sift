import "../styles/_compilePreview.scss";

/**
 * @name CompilePreview
 * @description The animated "reading..." panel shown next to the hero headline. Purely decorative, no live data.
 * @access Public
 */
function CompilePreview() {
  return (
    <div className="compile-card">
      <div className="compile-card__head">
        <span>
          <span className="compile-card__dot"></span>reading
        </span>
        <span>3 inputs</span>
      </div>

      <div className="compile-card__row" style={{ animationDelay: "0.1s" }}>
        <span className="k">resume</span>
        <span className="v">parsed · 1 file</span>
      </div>
      <div className="compile-card__row" style={{ animationDelay: "0.3s" }}>
        <span className="k">summary</span>
        <span className="v">6 yrs product design</span>
      </div>
      <div className="compile-card__row" style={{ animationDelay: "0.5s" }}>
        <span className="k">matches</span>
        <span className="v hl">figma, roadmapping, A/B testing</span>
      </div>
      <div className="compile-card__row" style={{ animationDelay: "0.7s" }}>
        <span className="k">gaps</span>
        <span className="v">SQL, none listed</span>
      </div>
      <div className="compile-card__row" style={{ animationDelay: "0.9s" }}>
        <span className="k">fit score</span>
        <span className="v hl">strong match</span>
      </div>
    </div>
  );
}

export default CompilePreview;