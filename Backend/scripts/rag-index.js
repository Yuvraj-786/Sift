require("dotenv").config();

const crypto = require("node:crypto");
const dns = require("node:dns");
const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const KnowledgeChunk = require("../src/models/KnowledgeChunk.model");
const { createEmbeddings, EMBEDDING_DIMENSIONS } = require("../src/services/embedding.service");
const connectToDB = require("../src/config/database");
const { VECTOR_INDEX } = require("../src/services/rag.service");

dns.setServers(["8.8.8.8"]);

const COLLECTION = "interview";
const MAX_CHUNK_LENGTH = 1200;
const OVERLAP_LENGTH = 180;
const KNOWLEDGE_ROOT = path.join(__dirname, "..", "src", "knowledge", COLLECTION);
const INDEX_DEFINITION = {
  fields: [
    { type: "vector", path: "embedding", numDimensions: EMBEDDING_DIMENSIONS, similarity: "cosine" },
    { type: "filter", path: "collection" },
  ],
};

function parseDocument(source, markdown) {
  const fenceCount = (markdown.match(/^```/gm) || []).length;
  if (markdown.includes("\0") || !markdown.trim() || fenceCount % 2 !== 0) {
    throw new Error(`Malformed interview source: ${source}`);
  }
  const titleMatch = markdown.match(/^#\s+(.+)\s*$/m);
  if (!titleMatch || !titleMatch[1].trim()) throw new Error(`Missing Markdown title in ${source}`);
  const title = titleMatch[1].trim();
  const body = markdown.replace(titleMatch[0], "").trim();
  if (!body) throw new Error(`Interview source has no content: ${source}`);
  return { title, body };
}

function splitParagraph(paragraph, maxLength) {
  const parts = [];
  let start = 0;
  while (start < paragraph.length) {
    let end = Math.min(start + maxLength, paragraph.length);
    if (end < paragraph.length) {
      const boundary = paragraph.lastIndexOf(" ", end);
      if (boundary > start + Math.floor(maxLength * 0.6)) end = boundary;
    }
    parts.push(paragraph.slice(start, end).trim());
    if (end >= paragraph.length) break;
    start = end;
  }
  return parts;
}

function chunkDocument(source, title, body) {
  const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let heading = "Introduction";
  let currentHeading = heading;
  let current = [];

  function render(text, chunkHeading) {
    const content = `${title}\n${chunkHeading}\n\n${text}`.trim();
    if (content.length > MAX_CHUNK_LENGTH) throw new Error(`Chunk exceeds ${MAX_CHUNK_LENGTH} characters in ${source}`);
    if (!content.replace(title, "").replace(chunkHeading, "").trim()) return;
    chunks.push({ source, title, heading: chunkHeading, content });
  }

  function flush() {
    if (!current.length) return;
    render(current.join("\n\n"), currentHeading);
    current = [];
  }

  for (const paragraph of paragraphs) {
    const headingMatch = paragraph.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      flush();
      heading = headingMatch[1].trim();
      continue;
    }
    const prefixLength = title.length + heading.length + 4;
    const maxBodyLength = MAX_CHUNK_LENGTH - prefixLength;
    if (maxBodyLength <= OVERLAP_LENGTH) throw new Error(`Title or heading is too long in ${source}`);
    const parts = splitParagraph(paragraph, maxBodyLength - OVERLAP_LENGTH);
    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      let part = parts[partIndex];
      if (partIndex > 0) {
        const previous = parts[partIndex - 1];
        part = `${previous.slice(-OVERLAP_LENGTH)} ${part}`;
        flush();
      }
      if (!current.length) currentHeading = heading;
      const currentLimit = MAX_CHUNK_LENGTH - title.length - currentHeading.length - 4;
      const next = [...current, part].join("\n\n");
      if (current.length && next.length > currentLimit) {
        const overlap = current.join("\n\n").slice(-OVERLAP_LENGTH);
        flush();
        currentHeading = heading;
        current.push(part.length + overlap.length + 1 <= currentLimit ? `${overlap} ${part}` : part);
      } else {
        current.push(part);
      }
    }
  }
  flush();
  return chunks;
}

async function ensureVectorIndex() {
  const indexes = await KnowledgeChunk.collection.listSearchIndexes().toArray();
  if (!indexes.some((index) => index.name === VECTOR_INDEX)) {
    await KnowledgeChunk.collection.createSearchIndex({ name: VECTOR_INDEX, type: "vectorSearch", definition: INDEX_DEFINITION });
    console.log(`Created Atlas index ${VECTOR_INDEX}; Atlas may take time to finish building it.`);
  } else {
    console.log(`Atlas index present: ${VECTOR_INDEX}`);
  }
}

async function synchronizeSource({ source, title, body }, dependencies = {}) {
  const Model = dependencies.KnowledgeChunk || KnowledgeChunk;
  const embed = dependencies.createEmbeddings || createEmbeddings;
  const chunks = chunkDocument(source, title, body);
  const hashes = chunks.map((chunk) => crypto.createHash("sha256").update(chunk.content).digest("hex"));
  const existing = await Model.find({ collection: COLLECTION, source, contentHash: { $in: hashes } })
    .select("contentHash")
    .lean();
  const existingHashes = new Set(existing.map((chunk) => chunk.contentHash));
  const changedEntries = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ index }) => !existingHashes.has(hashes[index]));
  const embeddings = await embed(changedEntries.map(({ chunk }) => chunk.content));
  const writes = changedEntries.map(({ chunk, index }, embeddingIndex) => ({
    updateOne: {
      filter: { collection: COLLECTION, source, contentHash: hashes[index] },
      update: {
        $set: {
          collection: COLLECTION,
          source,
          title: chunk.title,
          heading: chunk.heading,
          content: chunk.content,
          contentHash: hashes[index],
          embedding: embeddings[embeddingIndex],
        },
      },
      upsert: true,
    },
  }));
  if (writes.length) await Model.bulkWrite(writes, { ordered: true });
  await Model.deleteMany({ collection: COLLECTION, source, contentHash: { $nin: hashes } });
  return { chunkCount: chunks.length, refreshedCount: changedEntries.length };
}

async function main() {
  await connectToDB();
  await ensureVectorIndex();
  const files = (await fs.readdir(KNOWLEDGE_ROOT)).filter((file) => file.endsWith(".md")).sort();
  if (!files.length) throw new Error(`No Markdown sources found in ${KNOWLEDGE_ROOT}`);

  const sourcePaths = [];
  let indexedCount = 0;
  for (const file of files) {
    const absolutePath = path.join(KNOWLEDGE_ROOT, file);
    const source = path.relative(path.join(__dirname, ".."), absolutePath).split(path.sep).join("/");
    sourcePaths.push(source);
    const { title, body } = parseDocument(source, await fs.readFile(absolutePath, "utf8"));
    const result = await synchronizeSource({ source, title, body });
    indexedCount += result.chunkCount;
    console.log(`Indexed ${source}: ${result.chunkCount} chunks (${result.refreshedCount} refreshed).`);
  }

  await KnowledgeChunk.deleteMany({ collection: COLLECTION, source: { $nin: sourcePaths } });
  console.log(`Interview indexing complete: ${indexedCount} chunks across ${sourcePaths.length} sources.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { chunkDocument, parseDocument, synchronizeSource };