const { PDFParse } = require("pdf-parse");
const InterviewReport = require("../models/InterviewReport.model");
const { generateInterviewReport } = require("../services/ai.services");
const { answerInterviewQuestion } = require("../services/rag.service");
const { enforceAiRateLimit } = require("../services/rate-limit.service");
const { capText, normalizeText, truncateResume } = require("../utils/text");
const { AppError } = require("../utils/app-error");

function sendError(res, error) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }
  return res.status(500).json({ message: "The request could not be completed." });
}

async function extractResumeText(file, Parser = PDFParse) {
  if (!file) throw new AppError(400, "Upload a PDF resume.", "RESUME_REQUIRED");
  if (file.mimetype !== "application/pdf") {
    throw new AppError(400, "Resume must be a PDF file.", "INVALID_RESUME_TYPE");
  }

  const parser = new Parser({ data: file.buffer });
  try {
    const parsed = await parser.getText();
    const resume = truncateResume(parsed?.text || "", 24000);
    if (!resume) throw new AppError(400, "The PDF does not contain readable resume text.", "EMPTY_RESUME");
    return resume;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "The uploaded PDF could not be read.", "INVALID_PDF");
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function generateAndPersistReport({ resume, selfDescription, jobDescription, userId }, dependencies = {}) {
  const generate = dependencies.generateInterviewReport || generateInterviewReport;
  const create = dependencies.createReport || ((report) => InterviewReport.create(report));
  const report = await generate({ resume, selfDescription, jobDescription });
  return create({ ...report, resume, selfDescription, jobDescription, user: userId });
}

async function getAiReportController(req, res) {
  try {
    if (typeof req.body?.selfDescription !== "string" || typeof req.body?.jobDescription !== "string") {
      throw new AppError(400, "Self-description and job description must be text.", "INVALID_REPORT_INPUT");
    }
    const selfDescription = capText(req.body?.selfDescription, 5000);
    const jobDescription = capText(req.body?.jobDescription, 12000);
    if (!selfDescription || !jobDescription) {
      throw new AppError(400, "Add both a self-description and a job description.", "REPORT_INPUT_REQUIRED");
    }

    const resume = await extractResumeText(req.file);
    await enforceAiRateLimit(req.user.id);
    const savedReport = await generateAndPersistReport({
      resume,
      selfDescription,
      jobDescription,
      userId: req.user.id,
    });
    return res.status(201).json({ report: savedReport });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getInterviewAnswerController(req, res) {
  try {
    const question = normalizeText(req.body?.question);
    if (!question || question.length > 2000) {
      throw new AppError(400, "Enter a question of 1 to 2,000 characters.", "INVALID_QUESTION");
    }
    await enforceAiRateLimit(req.user.id);
    const result = await answerInterviewQuestion(question);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  extractResumeText,
  generateAndPersistReport,
  getAiReportController,
  getInterviewAnswerController,
};