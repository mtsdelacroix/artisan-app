import { NextResponse } from "next/server"

export async function withRateLimit(request, ratelimiter, handler) {
  // Skip rate limiting if Upstash is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return handler(request)
  }

  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1"
    const clientIp = ip.split(",")[0].trim()

    const { success, limit, remaining, reset } = await ratelimiter.limit(clientIp)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: "Trop de requêtes. Veuillez patienter avant de réessayer.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      )
    }

    return handler(request)
  } catch (error) {
    // Fail open — if Upstash is down, don't block users
    console.error("Rate limit error:", error)
    return handler(request)
  }
}
