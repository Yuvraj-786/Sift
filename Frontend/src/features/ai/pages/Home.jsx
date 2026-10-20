import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import InputSection from "../components/InputSection";
import StructuredRead from "../components/StructuredRead";
import Footer from "../components/Footer";
import InterviewQA from "../components/InterviewQA";
import { useAnalyzer } from "../../auth/hooks/useAnalyzer.js";

const Home = () => {
  const {
    resumeFile,
    setResumeFile,
    selfDescription,
    setSelfDescription,
    jobDescription,
    setJobDescription,
    result,
    isLoading,
    error,
    generate,
  } = useAnalyzer();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <InputSection
          resumeFile={resumeFile}
          setResumeFile={setResumeFile}
          selfDescription={selfDescription}
          setSelfDescription={setSelfDescription}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          generate={generate}
          isLoading={isLoading}
          error={error}
        />
        <StructuredRead result={result} />
        <InterviewQA />
      </main>
      <Footer />
    </>
  );
};

export default Home;