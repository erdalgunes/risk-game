/**
 * Server-side rate limiting middleware
 *
 * Prevents abuse by enforcing rate limits on Server Actions.
 * Uses in-memory storage (suitable for single-server deployment).
 * For multi-server production, replace with Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (replace with Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  limit: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Custom identifier (e.g., IP, session ID, player ID)
   */
  identifier: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if request is within rate limit
 *
 * @param config Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { limit, windowMs, identifier } = config;
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  let entry = rateLimitStore.get(key);

  // Initialize or reset if expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      remaining: limit - 1,
      resetTime: entry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Server-side rate limit configurations
 * More restrictive than client-side to prevent abuse
 */
export const SERVER_RATE_LIMITS = {
  CREATE_GAME: { limit: 3, windowMs: 60000 }, // 3 games per minute per IP
  JOIN_GAME: { limit: 5, windowMs: 60000 }, // 5 joins per minute per IP
  START_GAME: { limit: 10, windowMs: 60000 }, // 10 starts per minute per player
  PLACE_ARMIES: { limit: 20, windowMs: 60000 }, // 20 placements per minute per player
  ATTACK: { limit: 40, windowMs: 60000 }, // 40 attacks per minute per player
  FORTIFY: { limit: 20, windowMs: 60000 }, // 20 fortifications per minute per player
  END_TURN: { limit: 15, windowMs: 60000 }, // 15 turn ends per minute per player
  CHANGE_PHASE: { limit: 15, windowMs: 60000 }, // 15 phase changes per minute per player
  UNDO_ACTION: { limit: 5, windowMs: 60000 }, // 5 undos per minute per player (prevent undo abuse)
} as const;

/**
 * Get client IP address from request headers
 * Works with Vercel, Cloudflare, and standard headers
 *
 * @param headers Request headers
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(headers: Headers): string {
  // Vercel
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Standard
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Format rate limit error message
 *
 * @param resetTime Unix timestamp when limit resets
 * @returns Human-readable error message
 */
export function getRateLimitError(resetTime: number): string {
  const secondsRemaining = Math.ceil((resetTime - Date.now()) / 1000);
  return `Rate limit exceeded. Please try again in ${secondsRemaining} seconds.`;
}
