import "../styles/_input-section.scss";
import ResumeUploader from "./ResumeUploader";
import GenerateButton from "./GenerateButton";
import TextAreaField from "./TextAreaField";

function InputSection({
  resumeFile,
  setResumeFile,
  selfDescription,
  setSelfDescription,
  jobDescription,
  setJobDescription,
  generate,
  isLoading,
  error,
}) {
  return (
    <section className="inputs" id="inputs">
      <div className="section-head">
        <h2>Three inputs. One structured read.</h2>
        <p>
          Fill in what you have — the resume, a few lines about yourself, and
          the role you're applying to.
        </p>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card__label">01 · file</div>
          <div className="card__title">Resume</div>
          <ResumeUploader file={resumeFile} onFileSelect={setResumeFile} />
        </div>

        <div className="card">
          <div className="card__label">02 · text</div>
          <div className="card__title">About you</div>
          <TextAreaField
            value={selfDescription}
            onChange={setSelfDescription}
            placeholder="I'm a product designer who spent the last three years leading 0-to-1 features at a seed-stage startup..."
            maxLength={5000}
          />
        </div>

        <div className="card">
          <div className="card__label">03 · text</div>
          <div className="card__title">Job description</div>
          <TextAreaField
            value={jobDescription}
            onChange={setJobDescription}
            placeholder="Paste the job posting you're applying to..."
            maxLength={12000}
          />
        </div>
      </div>

      <GenerateButton generate={generate} isLoading={isLoading} error={error} />
    </section>
  );
}

export default InputSection;