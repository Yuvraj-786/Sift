const { z } = require("zod");
const { AppError } = require("../utils/app-error");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const MAX_ATTEMPTS = 4;

const interviewReportSchema = z.object({
  matchScore: z.number().min(0).max(100),
  technicalQuestions: z.array(
    z.object({ question: z.string().min(1), intention: z.string().min(1), answer: z.string().min(1) }).strict(),
  ),
  behavioralQuestions: z.array(
    z.object({ question: z.string().min(1), intention: z.string().min(1), answer: z.string().min(1) }).strict(),
  ),
  skillGaps: z.array(
    z.object({ skills: z.array(z.string().min(1)).min(1), severity: z.enum(["low", "medium", "high"]) }).strict(),
  ),
  preparationPlan: z.array(
    z.object({ day: z.number().int().min(1), focus: z.string().min(1), tasks: z.array(z.string().min(1)).min(1) }).strict(),
  ),
}).strict();

function makeStrictSchema(schema) {
  const jsonSchema = z.toJSONSchema(schema);

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "object" && node.properties) {
      node.additionalProperties = false;
      node.required = Object.keys(node.properties);
      Object.values(node.properties).forEach(visit);
    }
    if (node.type === "array") visit(node.items);
    if (node.anyOf) node.anyOf.forEach(visit);
  }

  visit(jsonSchema);
  return jsonSchema;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(date - Date.now(), 0);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestGroq({ messages, responseFormat }) {
  if (!process.env.GROQ_API_KEY) {
    throw new AppError(500, "Groq API credentials are not configured.", "AI_NOT_CONFIGURED");
  }

  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0,
          response_format: responseFormat,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(payload?.error?.message || "The AI provider rejected the request.");
        error.status = response.status;
        error.retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        error.code = response.status === 404 ? "AI_MODEL_UNAVAILABLE" : "AI_PROVIDER_ERROR";
        throw error;
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new AppError(503, "The AI provider returned an empty response.", "AI_EMPTY_RESPONSE");
      }
      return content.trim();
    } catch (error) {
      lastError = error;
      if (!isRetryableStatus(error.status) || attempt === MAX_ATTEMPTS - 1) break;
      const retryDelay = error.retryAfter ?? 1000 * 2 ** attempt;
      await wait(retryDelay + Math.floor(Math.random() * 250));
    }
  }

  if (lastError?.code === "AI_MODEL_UNAVAILABLE") {
    throw new AppError(503, "The configured AI model is unavailable. Please try again later.", "AI_MODEL_UNAVAILABLE");
  }
  if (isRetryableStatus(lastError?.status) || lastError?.status === undefined) {
    throw new AppError(503, "AI is temporarily unavailable. Please try again shortly.", "AI_UNAVAILABLE");
  }
  throw new AppError(502, "The AI provider could not process this request.", "AI_PROVIDER_ERROR");
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const rawReport = await requestGroq({
    messages: [
      {
        role: "system",
        content: "Create a practical interview preparation report. Be specific to the candidate and role. Return only data matching the supplied JSON schema.",
      },
      {
        role: "user",
        content: `Candidate resume:\n${resume}\n\nCandidate self-description:\n${selfDescription}\n\nJob description:\n${jobDescription}`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: { name: "interview_report", strict: true, schema: makeStrictSchema(interviewReportSchema) },
    },
  });

  let parsedReport;
  try {
    parsedReport = JSON.parse(rawReport);
  } catch {
    throw new AppError(502, "The AI provider returned invalid report data.", "AI_INVALID_RESPONSE");
  }

  const result = interviewReportSchema.safeParse(parsedReport);
  if (!result.success) {
    throw new AppError(502, "The AI provider returned an incomplete report.", "AI_INVALID_RESPONSE");
  }
  return result.data;
}

async function generateGroundedAnswer({ question, sources }) {
  const sourceContext = sources
    .map((source, index) => `[${index + 1}] ${source.title}${source.heading ? ` - ${source.heading}` : ""}\n${source.content}`)
    .join("\n\n");
  const rawAnswer = await requestGroq({
    messages: [
      {
        role: "system",
        content: "Answer only from the supplied interview knowledge. If the knowledge does not answer the question, say so plainly. Cite source titles in square brackets when making a claim. Do not invent sources.",
      },
      { role: "user", content: `Interview knowledge:\n${sourceContext}\n\nQuestion: ${question}` },
    ],
    responseFormat: { type: "json_object" },
  });

  let answer = rawAnswer;
  try {
    const parsed = JSON.parse(rawAnswer);
    if (typeof parsed.answer === "string" && parsed.answer.trim()) answer = parsed.answer.trim();
  } catch {
    answer = rawAnswer;
  }
  const missingCitations = [...new Set(sources.map((source) => source.title))]
    .filter((title) => !answer.includes(`[${title}]`));
  return missingCitations.length
    ? `${answer}\n\nSources: ${missingCitations.map((title) => `[${title}]`).join(" ")}`
    : answer;
}

module.exports = {
  GROQ_MODEL,
  generateGroundedAnswer,
  generateInterviewReport,
  interviewReportSchema,
  requestGroq,
};
