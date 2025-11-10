import { useState } from 'react';
import { validateUsername } from '@/lib/validation/username';

/**
 * Custom hook for managing username input with validation
 * Reduces duplication across lobby components
 */
export function useUsernameInput(initialValue = '') {
  const [username, setUsername] = useState(initialValue);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  function handleUsernameChange(value: string) {
    setUsername(value);

    // Clear error when user starts typing
    if (usernameError) {
      setUsernameError(null);
    }

    // Validate on change (only if not empty)
    if (value.trim()) {
      const validation = validateUsername(value);
      if (!validation.isValid) {
        setUsernameError(validation.error || null);
      }
    }
  }

  function validateAndGetError(): string | null {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      const error = validation.error || 'Invalid username';
      setUsernameError(error);
      return error;
    }
    return null;
  }

  return {
    username,
    setUsername,
    usernameError,
    setUsernameError,
    handleUsernameChange,
    validateAndGetError,
  };
}
