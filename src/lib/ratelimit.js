import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Routes IA (Anthropic) — les plus coûteuses
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1h"),
  analytics: true,
  prefix: "rl:ai",
})

// Routes email (Resend)
export const emailRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1h"),
  analytics: true,
  prefix: "rl:email",
})

// Routes PDF
export const pdfRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1h"),
  analytics: true,
  prefix: "rl:pdf",
})

// Routes générales
export const generalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1m"),
  analytics: true,
  prefix: "rl:general",
})
