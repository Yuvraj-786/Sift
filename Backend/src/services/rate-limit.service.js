const AiRateLimit = require("../models/AiRateLimit.model");
const { AppError } = require("../utils/app-error");

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const GLOBAL_RPM_WINDOW_MS = 60 * 1000;
const GLOBAL_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_GLOBAL_RPM = 20;
const MAX_GLOBAL_DAILY_REQUESTS = 800;
const GLOBAL_LIMITER_ID = "000000000000000000000001";

async function incrementLimit({ scope, user, windowStart, windowMs }) {
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const filter = { user, windowStart };
  if (scope === "user") {
    filter.$or = [{ scope: "user" }, { scope: { $exists: false } }];
  } else {
    filter.scope = scope;
  }
  const limit = await AiRateLimit.findOneAndUpdate(
    filter,
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return limit.count;
}

async function enforceAiRateLimit(userId) {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
  const userCount = await incrementLimit({ scope: "user", user: userId, windowStart, windowMs: WINDOW_MS });
  if (userCount > MAX_REQUESTS_PER_WINDOW) {
    throw new AppError(429, "AI request limit reached. Please try again in a few minutes.", "AI_RATE_LIMITED");
  }

  const minuteStart = new Date(Math.floor(now.getTime() / GLOBAL_RPM_WINDOW_MS) * GLOBAL_RPM_WINDOW_MS);
  const minuteCount = await incrementLimit({ scope: "global-minute", user: GLOBAL_LIMITER_ID, windowStart: minuteStart, windowMs: GLOBAL_RPM_WINDOW_MS });
  if (minuteCount > MAX_GLOBAL_RPM) {
    throw new AppError(429, "AI service is at capacity. Please try again in a minute.", "AI_CAPACITY_LIMITED");
  }

  const dayStart = new Date(Math.floor(now.getTime() / GLOBAL_DAILY_WINDOW_MS) * GLOBAL_DAILY_WINDOW_MS + 1);
  const dayCount = await incrementLimit({ scope: "global-day", user: GLOBAL_LIMITER_ID, windowStart: dayStart, windowMs: GLOBAL_DAILY_WINDOW_MS });
  if (dayCount > MAX_GLOBAL_DAILY_REQUESTS) {
    throw new AppError(429, "The daily AI request budget has been reached. Please try again tomorrow.", "AI_DAILY_LIMITED");
  }
}

module.exports = { enforceAiRateLimit };
