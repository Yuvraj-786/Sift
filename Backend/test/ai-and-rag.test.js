const test = require("node:test");
const assert = require("node:assert/strict");
const { extractResumeText, generateAndPersistReport } = require("../src/controllers/ai.controller");
const { generateGroundedAnswer, generateInterviewReport, interviewReportSchema, requestGroq } = require("../src/services/ai.services");
const { chunkDocument, parseDocument, synchronizeSource } = require("../scripts/rag-index");
const { answerInterviewQuestion, buildVectorPipeline, MIN_SCORE, TOP_K } = require("../src/services/rag.service");
const { AppError } = require("../src/utils/app-error");

const validReport = {
  matchScore: 80,
  technicalQuestions: [{ question: "Question?", intention: "Assess reasoning", answer: "Answer" }],
  behavioralQuestions: [{ question: "Example?", intention: "Assess ownership", answer: "Answer" }],
  skillGaps: [{ skills: ["Testing"], severity: "medium" }],
  preparationPlan: [{ day: 1, focus: "Review", tasks: ["Prepare an example"] }],
};

function providerResponse(status, content = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => status >= 200 && status < 300
      ? { choices: [{ message: { content } }] }
      : { error: { message: "provider error" } },
  };
}

test("report schema requires every field and rejects unknown fields", () => {
  assert.equal(interviewReportSchema.safeParse(validReport).success, true);
  assert.equal(interviewReportSchema.safeParse({ ...validReport, extra: true }).success, false);
  assert.equal(interviewReportSchema.safeParse({ ...validReport, skillGaps: [{ skills: "Testing", severity: "low" }] }).success, false);
  assert.deepEqual(interviewReportSchema.parse(validReport), validReport);
});

test("Groq report generation sends strict JSON schema and accepts a valid report", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  let requestBody;
  process.env.GROQ_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return providerResponse(200, JSON.stringify(validReport));
  };
  try {
    assert.deepEqual(await generateInterviewReport({ resume: "Resume", selfDescription: "About", jobDescription: "Role" }), validReport);
    assert.equal(requestBody.model, "openai/gpt-oss-20b");
    assert.equal(requestBody.response_format.json_schema.strict, true);
    assert.deepEqual(requestBody.response_format.json_schema.schema.required, Object.keys(validReport));
    assert.equal(requestBody.response_format.json_schema.schema.additionalProperties, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});

test("Groq retries 408, 429, and 5xx four times, but does not retry unavailable models", async () => {
  const previousFetch = globalThis.fetch;
  const previousTimer = globalThis.setTimeout;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key";
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  try {
    for (const status of [408, 429, 503]) {
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts += 1;
        return providerResponse(status);
      };
      await assert.rejects(requestGroq({ messages: [], responseFormat: { type: "json_object" } }), (error) => error.status === 503);
      assert.equal(attempts, 4);
    }
    let modelAttempts = 0;
    globalThis.fetch = async () => {
      modelAttempts += 1;
      return providerResponse(404);
    };
    await assert.rejects(requestGroq({ messages: [], responseFormat: { type: "json_object" } }), (error) => error.code === "AI_MODEL_UNAVAILABLE");
    assert.equal(modelAttempts, 1);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.setTimeout = previousTimer;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});

test("PDF validation rejects missing, incorrect MIME, invalid, and empty content", async () => {
  await assert.rejects(extractResumeText(null), (error) => error instanceof AppError && error.status === 400);
  await assert.rejects(extractResumeText({ mimetype: "text/plain", buffer: Buffer.from("text") }), (error) => error.status === 400);
  await assert.rejects(extractResumeText({ mimetype: "application/pdf", buffer: Buffer.from("not a PDF") }), (error) => error.status === 400);
  class EmptyPdfParser {
    async getText() { return { text: " \n " }; }
    async destroy() {}
  }
  await assert.rejects(
    extractResumeText({ mimetype: "application/pdf", buffer: Buffer.from("valid empty PDF") }, EmptyPdfParser),
    (error) => error.code === "EMPTY_RESUME" && error.status === 400,
  );
});

test("failed generation never reaches report persistence", async () => {
  let persisted = false;
  await assert.rejects(generateAndPersistReport(
    { resume: "Resume", selfDescription: "About", jobDescription: "Role", userId: "user-id" },
    {
      generateInterviewReport: async () => { throw new AppError(503, "Provider unavailable"); },
      createReport: async () => { persisted = true; },
    },
  ));
  assert.equal(persisted, false);
});

test("interview chunks include title and nearest heading within the configured limit", () => {
  const parsed = parseDocument("interview.md", "# Interview Guide\n\n## Behavioral answers\n\nUse a specific example and describe your actions.");
  const chunks = chunkDocument("interview.md", parsed.title, parsed.body);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0].content, /^Interview Guide\nBehavioral answers/);
  assert.ok(chunks[0].content.length <= 1200);
  const paragraph = "intact ".repeat(120).trim();
  assert.equal(chunkDocument("short.md", "Interview Guide", `## Preparation\n\n${paragraph}`).length, 1);
  assert.throws(() => parseDocument("broken.md", "## Missing title\n\nNo h1 title."), /Missing Markdown title/);
});

test("interview chunks split long paragraphs and retain bounded overlap", () => {
  const longText = Array.from({ length: 600 }, (_, index) => `word${index}`).join(" ");
  const chunks = chunkDocument("long.md", "Interview Guide", `## Preparation\n\n${longText}`);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.content.length <= 1200));
  assert.ok(chunks.every((chunk) => chunk.content.startsWith("Interview Guide\nPreparation\n\n")));
  const chunkBodies = chunks.map((chunk) => chunk.content.split("\n\n").slice(1).join("\n\n"));
  assert.ok(chunkBodies[1].startsWith(chunkBodies[0].slice(-180)));
});

test("RAG indexing is idempotent and changed source content replaces stale chunks", async () => {
  const records = [];
  let embeddingsRequested = 0;
  const Model = {
    find: (query) => ({
      select: () => ({
        lean: async () => records.filter((record) => record.collection === query.collection && record.source === query.source && query.contentHash.$in.includes(record.contentHash)),
      }),
    }),
    bulkWrite: async (writes) => {
      for (const { updateOne } of writes) {
        const existing = records.find((record) => record.source === updateOne.filter.source && record.contentHash === updateOne.filter.contentHash);
        if (existing) Object.assign(existing, updateOne.update.$set);
        else records.push({ ...updateOne.update.$set });
      }
    },
    deleteMany: async (filter) => {
      const keep = new Set(filter.contentHash.$nin);
      for (let index = records.length - 1; index >= 0; index -= 1) {
        if (records[index].source === filter.source && !keep.has(records[index].contentHash)) records.splice(index, 1);
      }
    },
  };
  const dependencies = {
    KnowledgeChunk: Model,
    createEmbeddings: async (texts) => {
      embeddingsRequested += texts.length;
      return texts.map(() => [0.1, 0.2]);
    },
  };
  const source = "src/knowledge/interview/guide.md";
  const first = { source, title: "Guide", body: "## First\n\nPrepare a specific example." };
  await synchronizeSource(first, dependencies);
  const originalHash = records[0].contentHash;
  await synchronizeSource(first, dependencies);
  assert.equal(records.length, 1);
  assert.equal(records[0].contentHash, originalHash);
  assert.equal(embeddingsRequested, 1);

  const changed = { source, title: "Guide", body: "## First\n\nPrepare a stronger, measurable example." };
  const result = await synchronizeSource(changed, dependencies);
  assert.equal(result.refreshedCount, 1);
  assert.equal(records.length, 1);
  assert.notEqual(records[0].contentHash, originalHash);
  assert.equal(records[0].content.includes("stronger, measurable"), true);
});

test("Atlas retrieval filters interview scope and minimum score; answers return cited source metadata", async () => {
  let usedPipeline;
  const source = { title: "Interview Guide", heading: "Behavioral answers", content: "Use a specific example.", score: MIN_SCORE };
  const result = await answerInterviewQuestion("How do I explain a setback?", {
    createEmbeddings: async () => [[0.1, 0.2]],
    retrieveSources: async (pipeline) => {
      usedPipeline = pipeline;
      return [source];
    },
    generateGroundedAnswer: async ({ sources }) => `Use a specific example [${sources[0].title}].`,
  });
  assert.equal(usedPipeline[0].$vectorSearch.filter.collection, "interview");
  assert.equal(usedPipeline[0].$vectorSearch.limit, TOP_K);
  assert.deepEqual(usedPipeline[2].$match.score, { $gte: MIN_SCORE });
  assert.equal(result.answer, "Use a specific example [Interview Guide].");
  assert.deepEqual(result.sources, [{ title: source.title, heading: source.heading, snippet: source.content }]);
});

test("interview Q&A with no retrieved sources does not call Groq", async () => {
  let generated = false;
  const result = await answerInterviewQuestion("Question outside the library", {
    createEmbeddings: async () => [[0.1, 0.2]],
    retrieveSources: async () => [],
    generateGroundedAnswer: async () => { generated = true; return "unexpected"; },
  });
  assert.equal(generated, false);
  assert.deepEqual(result.sources, []);
  assert.match(result.answer, /do not have enough interview guidance/);
});

test("grounded answers cite every returned source title", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key";
  globalThis.fetch = async () => providerResponse(200, JSON.stringify({ answer: "Prepare a specific example." }));
  try {
    const answer = await generateGroundedAnswer({
      question: "How should I answer a behavioral question?",
      sources: [{ title: "Interview Guide", heading: "Behavioral answers", content: "Use a specific example." }],
    });
    assert.match(answer, /Sources: \[Interview Guide\]/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});