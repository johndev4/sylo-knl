/**
 * Token Bucket Rate Limiter & Backoff Utility
 *
 * Designed to keep API calls safely within strict provider quotas,
 * such as Google AI Free Tier (30,000 tokens/minute for embeddings).
 *
 * Implements:
 * 1. Proactive token pacing (budgeting ~25,000 TPM over rolling 60s window).
 * 2. Reactive 429 backoff parsing Google's "Please retry in Xs" message.
 */

export interface RateLimiterOptions {
  maxTokensPerWindow?: number;
  windowMs?: number;
}

interface TokenRecord {
  timestamp: number;
  tokens: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error represents a rate limit / quota exhaustion.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  // Check status codes if present
  const err = error as {
    statusCode?: number;
    status?: number;
    message?: string;
    cause?: unknown;
  };
  if (err.statusCode === 429 || err.status === 429) {
    return true;
  }

  // Check error message string patterns
  const message =
    err.message ||
    (typeof err.cause === 'object' && err.cause !== null
      ? (err.cause as { message?: string }).message
      : '') ||
    String(error);

  return /429|quota exceeded|rate[ -]?limit|resource has been exhausted|tokens per minute/i.test(
    message
  );
}

/**
 * Extract retry delay in milliseconds from an error message (e.g. "Please retry in 23.077813466s").
 */
export function parseRetryDelay(
  error: unknown,
  defaultDelayMs = 25000
): number {
  if (!error) return defaultDelayMs;

  const message = (error as { message?: string }).message || String(error);

  const match = message.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)\s*s/i);
  if (match && match[1]) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds) && seconds > 0) {
      // Add 1.5s buffer to ensure Google's quota window has officially reset
      return Math.ceil(seconds * 1000) + 1500;
    }
  }

  return defaultDelayMs;
}

/**
 * Estimate token count from text using standard ~4 characters per token heuristic.
 */
export function estimateTokens(textOrTexts: string | string[]): number {
  if (Array.isArray(textOrTexts)) {
    let totalChars = 0;
    for (const text of textOrTexts) {
      totalChars += text.length;
    }
    return Math.ceil(totalChars / 4);
  }
  return Math.ceil(textOrTexts.length / 4);
}

/**
 * Rolling window token bucket limiter.
 */
export class TokenBucketLimiter {
  private maxTokensPerWindow: number;
  private windowMs: number;
  private records: TokenRecord[] = [];

  constructor(options?: RateLimiterOptions) {
    // Default: 25,000 tokens per 60,000ms window (safe under 30k Google free limit)
    this.maxTokensPerWindow = options?.maxTokensPerWindow ?? 25000;
    this.windowMs = options?.windowMs ?? 60000;
  }

  /**
   * Remove expired token records outside the rolling window.
   */
  private pruneOldRecords(now: number): void {
    const threshold = now - this.windowMs;
    this.records = this.records.filter((r) => r.timestamp > threshold);
  }

  /**
   * Get total tokens consumed in the current rolling window.
   */
  private getCurrentTokenUsage(now: number): number {
    this.pruneOldRecords(now);
    return this.records.reduce((sum, r) => sum + r.tokens, 0);
  }

  /**
   * Proactively wait until there is sufficient token budget for the incoming batch.
   */
  async waitForBudget(tokens: number): Promise<void> {
    while (true) {
      const now = Date.now();
      const currentUsage = this.getCurrentTokenUsage(now);

      if (currentUsage + tokens <= this.maxTokensPerWindow) {
        // Budget available
        this.records.push({ timestamp: now, tokens });
        return;
      }

      // Budget exceeded: calculate wait time until oldest record expires
      if (this.records.length > 0) {
        const oldest = this.records[0];
        const waitMs = Math.max(
          500,
          oldest.timestamp + this.windowMs - now + 200
        );

        await sleep(waitMs);
      } else {
        // If single batch itself is larger than maxTokensPerWindow, record and proceed
        this.records.push({ timestamp: now, tokens });
        return;
      }
    }
  }

  /**
   * Execute an operation with proactive token pacing and reactive 429 backoff retry.
   */
  async executeWithRateLimit<T>(
    texts: string[],
    fn: () => Promise<T>,
    options?: { maxRetries?: number }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const tokens = estimateTokens(texts);

    // 1. Proactive pacing
    await this.waitForBudget(tokens);

    // 2. Reactive execution with retry on 429 / quota errors
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt <= maxRetries && isRateLimitError(error)) {
          const delayMs = parseRetryDelay(error);
          await sleep(delayMs);

          // After waiting, clear expired records
          this.pruneOldRecords(Date.now());
          continue;
        }

        throw error;
      }
    }
  }
}

/**
 * Global singleton rate limiter for Google Embeddings (25,000 TPM limit).
 */
export const googleEmbeddingLimiter = new TokenBucketLimiter({
  maxTokensPerWindow: 25000,
  windowMs: 60000,
});
