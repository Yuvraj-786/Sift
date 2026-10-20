import { useState } from "react";
import { analyzeFit } from "../services/ai.api.js";

/**
 * @name useAnalyzer
 * @description Holds all state for the homepage inputs and calls the analyze service. Home.jsx uses this instead of
 *              managing resume/description/job description state itself.
 * @access Public
 */
export function useAnalyzer() {
  const [resumeFile, setResumeFile] = useState(null);
  const [selfDescription, setSelfDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * @name generate
   * @description Validates the three inputs are filled, then calls analyzeFit and stores the result.
   * @access Public
   */
  const generate = async () => {
    setError("");

    if (!resumeFile || !selfDescription.trim() || !jobDescription.trim()) {
      setError("Add a resume, a self-description, and a job description first.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await analyzeFit({ resumeFile, selfDescription, jobDescription });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong while generating your read. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
}