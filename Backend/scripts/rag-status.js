require("dotenv").config();

const dns = require("node:dns");
const mongoose = require("mongoose");
const KnowledgeChunk = require("../src/models/KnowledgeChunk.model");
const connectToDB = require("../src/config/database");
const { VECTOR_INDEX } = require("../src/services/rag.service");

dns.setServers(["8.8.8.8"]);

async function main() {
  await connectToDB();
  const [chunkCount, sources] = await Promise.all([
    KnowledgeChunk.countDocuments({ collection: "interview" }),
    KnowledgeChunk.distinct("source", { collection: "interview" }),
  ]);
  let index = null;
  try {
    index = (await KnowledgeChunk.collection.listSearchIndexes().toArray())
      .find((entry) => entry.name === VECTOR_INDEX) || null;
  } catch {
    index = null;
  }
  console.log(JSON.stringify({ collection: "interview", chunkCount, sourceCount: sources.length, vectorIndex: index?.status || "missing" }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });