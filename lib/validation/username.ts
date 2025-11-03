/**
 * Username validation utilities
 *
 * Rules:
 * - 2-16 characters
 * - Alphanumeric only (letters, numbers, underscores, hyphens)
 * - No special characters or XSS attempts
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const MIN_LENGTH = 2;
const MAX_LENGTH = 16;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

export function validateUsername(username: string): ValidationResult {
  // Trim whitespace for validation
  const trimmed = username.trim();

  // Check if empty
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Username is required',
    };
  }

  // Check minimum length
  if (trimmed.length < MIN_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at least ${MIN_LENGTH} characters`,
    };
  }

  // Check maximum length
  if (trimmed.length > MAX_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at most ${MAX_LENGTH} characters`,
    };
  }

  // Check for valid characters (alphanumeric, underscores, hyphens only)
  if (!ALPHANUMERIC_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  return {
    isValid: true,
  };
}
