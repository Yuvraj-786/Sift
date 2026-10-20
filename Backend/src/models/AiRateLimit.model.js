const mongoose = require("mongoose");

const aiRateLimitSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ["user", "global-minute", "global-day"], default: "user", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

aiRateLimitSchema.index({ scope: 1, user: 1, windowStart: 1 }, { unique: true });
aiRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AiRateLimit", aiRateLimitSchema);
