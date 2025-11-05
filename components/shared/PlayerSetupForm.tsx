'use client';

import React from 'react';
import { validateUsername } from '@/lib/validation/username';
import type { PlayerColor } from '@/types/game';

/**
 * Props for PlayerSetupForm component
 *
 * @interface PlayerSetupFormProps
 * @description Shared form component for username and color selection used by both Create Game (Lobby) and Join Game flows
 *
 * Features:
 * - Username input with real-time validation (2-16 chars, alphanumeric + underscore/hyphen)
 * - Color selection dropdown with dynamic available colors
 * - Accessible error display with ARIA attributes
 * - Consistent Material Design 3 styling
 * - Profanity filtering on username
 *
 * @example
 * ```tsx
 * // Create Game usage
 * <PlayerSetupForm
 *   username={username}
 *   usernameError={error}
 *   selectedColor={color}
 *   availableColors={PLAYER_COLORS}
 *   onUsernameChange={setUsername}
 *   onUsernameErrorChange={setError}
 *   onColorChange={setColor}
 *   usernameInputId="username-create"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Join Game usage with filtered colors
 * <PlayerSetupForm
 *   username={username}
 *   usernameError={error}
 *   selectedColor={color}
 *   availableColors={availableColors} // Filtered by taken colors
 *   onUsernameChange={setUsername}
 *   onUsernameErrorChange={setError}
 *   onColorChange={setColor}
 *   usernameInputId="username-join"
 *   disabled={loading}
 * />
 * ```
 */
interface PlayerSetupFormProps {
  // Controlled form values
  username: string;
  usernameError: string | null;
  selectedColor: PlayerColor;
  availableColors: PlayerColor[];

  // Callbacks
  onUsernameChange: (value: string) => void;
  onUsernameErrorChange: (error: string | null) => void;
  onColorChange: (color: PlayerColor) => void;

  // Configuration for different contexts
  usernameInputId?: string; // Default: 'username-input'
  colorInputId?: string; // Default: 'color-input'
  usernameLabel?: string; // Default: 'Username'
  colorLabel?: string; // Default: 'Your Color'

  // Conditional rendering
  showColorSelect?: boolean; // Default: true
  disabled?: boolean; // Default: false
}

/**
 * PlayerSetupForm - Reusable form component for username and color selection
 *
 * @description
 * A controlled form component that handles username input and color selection for game setup.
 * Implements real-time validation, accessibility features, and Material Design 3 styling.
 *
 * @component
 *
 * @param {PlayerSetupFormProps} props - Component props
 * @param {string} props.username - Current username value
 * @param {string | null} props.usernameError - Validation error message (if any)
 * @param {PlayerColor} props.selectedColor - Currently selected player color
 * @param {PlayerColor[]} props.availableColors - Array of colors available for selection
 * @param {Function} props.onUsernameChange - Callback fired when username changes
 * @param {Function} props.onUsernameErrorChange - Callback fired when error state changes
 * @param {Function} props.onColorChange - Callback fired when color selection changes
 * @param {string} [props.usernameInputId='username-input'] - ID for username input (for label association)
 * @param {string} [props.colorInputId='color-input'] - ID for color select (for label association)
 * @param {string} [props.usernameLabel='Username'] - Label text for username field
 * @param {string} [props.colorLabel='Your Color'] - Label text for color field
 * @param {boolean} [props.showColorSelect=true] - Whether to show color selector
 * @param {boolean} [props.disabled=false] - Whether form inputs are disabled
 *
 * @returns {JSX.Element} Rendered form component
 *
 * @remarks
 * - Username validation: 2-16 characters, alphanumeric + underscore/hyphen, profanity filtered
 * - Displays "No colors available" message when availableColors is empty
 * - Uses ARIA attributes for accessibility (aria-required, aria-invalid, aria-describedby, role="alert")
 * - Error messages are announced to screen readers via role="alert"
 * - Color dropdown includes count of available colors in aria-label
 *
 * @see {@link /lib/validation/username.ts} for username validation rules
 */
export function PlayerSetupForm({
  username,
  usernameError,
  selectedColor,
  availableColors,
  onUsernameChange,
  onUsernameErrorChange,
  onColorChange,
  usernameInputId = 'username-input',
  colorInputId = 'color-input',
  usernameLabel = 'Username',
  colorLabel = 'Your Color',
  showColorSelect = true,
  disabled = false,
}: PlayerSetupFormProps) {

  /**
   * Handles username input changes with real-time validation
   *
   * @description
   * This function is called on every keystroke in the username input field.
   * It clears any existing errors when the user starts typing and validates
   * non-empty input against the username rules.
   *
   * Validation Rules:
   * - Length: 2-16 characters
   * - Allowed characters: letters, numbers, underscores, hyphens
   * - Profanity filtering applied
   * - No validation for empty string (allows clearing input)
   *
   * @param {string} value - The new username value from the input field
   * @returns {void}
   *
   * @private
   */
  function handleUsernameChange(value: string) {
    onUsernameChange(value);

    // Clear error when user starts typing
    if (usernameError) {
      onUsernameErrorChange(null);
    }

    // Validate on change (only if not empty)
    if (value.trim()) {
      const validation = validateUsername(value);
      if (!validation.isValid) {
        onUsernameErrorChange(validation.error || null);
      }
    }
  }

  return (
    <div className="space-y-md3-4">
      {/* Username Input */}
      <div>
        <label htmlFor={usernameInputId} className="block text-label-large mb-md3-2 text-surface-on">
          {usernameLabel}
        </label>
        <input
          id={usernameInputId}
          type="text"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="Enter your username"
          disabled={disabled}
          className={`w-full px-md3-4 py-md3-3 rounded-md3-sm bg-surface-container border text-surface-on focus:outline-none transition-all duration-md3-short4 disabled:opacity-50 disabled:cursor-not-allowed ${
            usernameError
              ? 'border-error focus:border-error'
              : 'border-outline focus:border-primary'
          }`}
          aria-required="true"
          aria-describedby={usernameError ? `${usernameInputId}-error` : `${usernameInputId}-hint`}
          aria-invalid={!!usernameError}
          autoFocus
        />
        {usernameError ? (
          <p id={`${usernameInputId}-error`} className="text-error text-body-small mt-md3-1" role="alert">
            {usernameError}
          </p>
        ) : (
          <span id={`${usernameInputId}-hint`} className="sr-only">
            Enter a username to join the game (2-16 characters, letters, numbers, underscores, hyphens)
          </span>
        )}
      </div>

      {/* Color Selector */}
      {showColorSelect && (
        <div>
          <label htmlFor={colorInputId} className="block text-label-large mb-md3-2 text-surface-on">
            {colorLabel}
          </label>
          {availableColors.length === 0 ? (
            <p className="text-error text-body-medium p-md3-3 bg-error-container rounded-md3-sm">
              No colors available. Game may be full.
            </p>
          ) : (
            <select
              id={colorInputId}
              value={selectedColor}
              onChange={(e) => onColorChange(e.target.value as PlayerColor)}
              disabled={disabled}
              className="w-full px-md3-4 py-md3-3 rounded-md3-sm bg-surface-container border border-outline text-surface-on focus:outline-none focus:border-primary transition-all duration-md3-short4 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Select your player color. ${availableColors.length} colors available.`}
            >
              {availableColors.map((color) => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
