import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lit UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv();

export const FEEDBACK_QUOTA = 5;

export const feedbackLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(FEEDBACK_QUOTA, "1 h"),
  prefix: "runejack:feedback",
});

export const betaRequestLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 d"),
  prefix: "runejack:beta",
});
