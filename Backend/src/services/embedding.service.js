const { AppError } = require("../utils/app-error");

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
const EMBEDDING_DIMENSIONS = 768;

function getEmbeddingUrl() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId || !process.env.CLOUDFLARE_API_TOKEN) {
    throw new AppError(500, "Cloudflare embedding credentials are not configured.", "EMBEDDING_NOT_CONFIGURED");
  }
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBEDDING_MODEL}`;
}

function extractEmbeddings(payload) {
  const data = payload?.result?.data;
  if (!Array.isArray(data)) return null;
  if (Array.isArray(data[0])) return data;

  const shape = payload?.result?.shape;
  if (Array.isArray(shape) && shape.length === 2 && shape[1] === EMBEDDING_DIMENSIONS) {
    const embeddings = [];
    for (let index = 0; index < data.length; index += EMBEDDING_DIMENSIONS) {
      embeddings.push(data.slice(index, index + EMBEDDING_DIMENSIONS));
    }
    return embeddings;
  }
  return null;
}

async function createEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const response = await fetch(getEmbeddingUrl(), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts, pooling: "cls" }),
  });
  const payload = await response.json().catch(() => ({}));
  const embeddings = extractEmbeddings(payload);

  if (!response.ok || !embeddings || embeddings.length !== texts.length) {
    throw new AppError(503, "Embedding service is temporarily unavailable.", "EMBEDDING_UNAVAILABLE");
  }
  if (embeddings.some((embedding) => embedding.length !== EMBEDDING_DIMENSIONS)) {
    throw new AppError(503, "Embedding service returned an unexpected vector size.", "EMBEDDING_INVALID_RESPONSE");
  }
  return embeddings;
}

module.exports = { createEmbeddings, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };
