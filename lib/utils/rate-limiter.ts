/**
 * Client-side rate limiter to prevent spam and abuse
 *
 * Uses in-memory storage with timestamps to track actions
 * Limits: 5 game creations per minute, 10 game actions per minute
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval: number = 60000; // 1 minute

  constructor() {
    // Clean up expired entries every minute
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Check if an action is allowed based on rate limits
   * @param key - Unique identifier for the action (e.g., 'create-game', 'place-armies')
   * @param limit - Maximum number of actions allowed in the window
   * @param windowMs - Time window in milliseconds
   * @returns true if action is allowed, false if rate limited
   */
  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.storage.get(key);

    // No existing entry, allow and create new
    if (!entry) {
      this.storage.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    // Window expired, reset counter
    if (now >= entry.resetAt) {
      this.storage.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    // Within window, check limit
    if (entry.count >= limit) {
      return false; // Rate limited
    }

    // Increment counter
    entry.count++;
    this.storage.set(key, entry);
    return true;
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(key: string): number {
    const entry = this.storage.get(key);
    if (!entry) return 0;

    const now = Date.now();
    if (now >= entry.resetAt) return 0;

    return Math.ceil((entry.resetAt - now) / 1000);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now >= entry.resetAt) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific key (useful for testing)
   */
  reset(key: string): void {
    this.storage.delete(key);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  CREATE_GAME: { limit: 5, windowMs: 60000 }, // 5 games per minute
  JOIN_GAME: { limit: 10, windowMs: 60000 }, // 10 joins per minute
  PLACE_ARMIES: { limit: 30, windowMs: 60000 }, // 30 placements per minute
  ATTACK: { limit: 60, windowMs: 60000 }, // 60 attacks per minute
  FORTIFY: { limit: 30, windowMs: 60000 }, // 30 fortifications per minute
  END_TURN: { limit: 20, windowMs: 60000 }, // 20 turn ends per minute
  CHANGE_PHASE: { limit: 20, windowMs: 60000 }, // 20 phase changes per minute
} as const;
