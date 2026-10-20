import api from "../../../services/api.js";

export async function analyzeFit({ resumeFile, selfDescription, jobDescription }) {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("selfDescription", selfDescription);
  formData.append("jobDescription", jobDescription);
  const response = await api.post("/api/ai", formData);
  return response.data.report;
}

export async function askInterviewQuestion(question) {
  const response = await api.post("/api/ai/interview-qa", { question });
  return response.data;
}