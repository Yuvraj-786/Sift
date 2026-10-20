const mongoose = require("mongoose");

const knowledgeChunkSchema = new mongoose.Schema(
  {
    collection: { type: String, required: true, index: true },
    source: { type: String, required: true },
    title: { type: String, required: true },
    heading: { type: String, default: "" },
    content: { type: String, required: true },
    contentHash: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

knowledgeChunkSchema.index({ collection: 1, source: 1, contentHash: 1 }, { unique: true });

module.exports = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);
