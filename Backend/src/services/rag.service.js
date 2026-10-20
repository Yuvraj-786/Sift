const { createEmbeddings } = require("./embedding.service");
const { generateGroundedAnswer } = require("./ai.services");
const KnowledgeChunk = require("../models/KnowledgeChunk.model");
const { AppError } = require("../utils/app-error");

const VECTOR_INDEX = "interview_knowledge_vector";
const MIN_SCORE = 0.35;
const TOP_K = 5;

function buildVectorPipeline(queryVector) {
  return [
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: "embedding",
        queryVector,
        numCandidates: 100,
        limit: TOP_K,
        filter: { collection: "interview" },
      },
    },
    { $set: { score: { $meta: "vectorSearchScore" } } },
    { $match: { score: { $gte: MIN_SCORE } } },
    { $project: { title: 1, heading: 1, content: 1, score: 1 } },
  ];
}

async function answerInterviewQuestion(question, dependencies = {}) {
  const embed = dependencies.createEmbeddings || createEmbeddings;
  const retrieve = dependencies.retrieveSources || ((pipeline) => KnowledgeChunk.aggregate(pipeline));
  const generateAnswer = dependencies.generateGroundedAnswer || generateGroundedAnswer;
  const [queryVector] = await embed([question]);
  let sources;
  try {
    sources = await retrieve(buildVectorPipeline(queryVector));
  } catch {
    throw new AppError(503, "Interview knowledge search is not ready. Please try again later.", "RAG_UNAVAILABLE");
  }

  if (sources.length === 0) {
    return { answer: "I do not have enough interview guidance in this library to answer that question yet.", sources: [] };
  }

  const answer = await generateAnswer({ question, sources });
  return {
    answer,
    sources: sources.map((source) => ({
      title: source.title,
      heading: source.heading,
      snippet: source.content.slice(0, 220).trim(),
    })),
  };
}

module.exports = { answerInterviewQuestion, buildVectorPipeline, MIN_SCORE, TOP_K, VECTOR_INDEX };
