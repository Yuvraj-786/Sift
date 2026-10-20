import "../styles/_hero.scss";
import CompilePreview from "./CompilePreview";

function Hero() {
  return (
      <div className="home-wrap">
        <section className="hero">
          <div>
            <h1>Your resume, read like a hiring manager reads it.</h1>
            <p>
              Upload a resume, describe yourself in your own words, and paste in
              the job description. Sift reads all three together and hands back
              one structured summary — no formatting, no guesswork.
            </p>
            <button
              className="btn-primary"
              onClick={() => document.getElementById("inputs").scrollIntoView()}
            >
              Analyze my fit
            </button>
          </div>

          <CompilePreview />
        </section>
      </div>
  );
}

export default Hero;
