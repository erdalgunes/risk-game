/**
 * Profanity filter for user input validation
 *
 * Lightweight implementation without external dependencies.
 * Uses a curated list of common offensive terms.
 */

// Common profanity patterns (obfuscated for code review)
const PROFANITY_LIST = [
  // Sexual/explicit content
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'piss', 'crap',
  'dick', 'cock', 'pussy', 'cunt', 'slut', 'whore', 'bastard',

  // Slurs and hate speech (partial list for common terms)
  'nigger', 'nigga', 'faggot', 'retard', 'chink', 'spic',

  // Common l33tspeak variations
  'fck', 'fuk', 'sh1t', 'b1tch', 'a55', 'd1ck', 'fag',

  // Partial word obfuscation
  'f*ck', 'f**k', 's*it', 'b*tch', 'a**', 'd*ck',
];

// Regex patterns for leetspeak and obfuscation
const SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '*': '',
  '_': '',
  '-': '',
};

/**
 * Normalize text for profanity detection
 * - Convert to lowercase
 * - Replace common substitutions (l33tspeak, symbols)
 * - Remove spaces, underscores, dashes
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Replace common substitutions
  for (const [symbol, letter] of Object.entries(SUBSTITUTIONS)) {
    normalized = normalized.replace(new RegExp(escapeRegex(symbol), 'g'), letter);
  }

  // Remove spaces, dots, and other separators
  normalized = normalized.replace(/[\s._-]+/g, '');

  return normalized;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if text contains profanity
 *
 * @param text - Text to check
 * @returns Object with isProfane flag and matched terms
 */
export function containsProfanity(text: string): {
  isProfane: boolean;
  matches: string[];
} {
  const normalized = normalizeText(text);
  const matches: string[] = [];

  for (const term of PROFANITY_LIST) {
    // Check for exact match or substring match
    if (normalized.includes(term)) {
      matches.push(term);
    }
  }

  return {
    isProfane: matches.length > 0,
    matches,
  };
}

/**
 * Validate username for profanity
 *
 * @param username - Username to validate
 * @returns Error message if profane, undefined if clean
 */
export function validateUsername(username: string): string | undefined {
  const result = containsProfanity(username);

  if (result.isProfane) {
    return 'Username contains inappropriate language';
  }

  return undefined;
}

/**
 * Sanitize text by replacing profanity with asterisks
 *
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  let sanitized = text;

  for (const term of PROFANITY_LIST) {
    const regex = new RegExp(term, 'gi');
    sanitized = sanitized.replace(regex, (match) => {
      return '*'.repeat(match.length);
    });
  }

  return sanitized;
}
