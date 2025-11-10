import { PLAYER_COLORS } from '@/constants/map';

interface LobbyFormFieldsProps {
  username: string;
  usernameError: string | null;
  selectedColor: string;
  onUsernameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  usernameId?: string;
  usernameLabel?: string;
}

/**
 * Shared form fields for lobby components
 * Reduces duplication between Lobby and SinglePlayerLobby
 */
export function LobbyFormFields({
  username,
  usernameError,
  selectedColor,
  onUsernameChange,
  onColorChange,
  usernameId = 'username',
  usernameLabel = 'Your Username',
}: LobbyFormFieldsProps) {
  return (
    <>
      {/* Username Input */}
      <div>
        <label
          htmlFor={usernameId}
          className="block text-sm font-medium mb-2 text-gray-300"
        >
          {usernameLabel}
        </label>
        <input
          id={usernameId}
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Enter your username"
          className={`w-full px-4 py-2 rounded bg-gray-700 border text-white focus:outline-none focus:ring-2 transition-colors ${
            usernameError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
          aria-invalid={!!usernameError}
          aria-label={usernameLabel}
        />
        {usernameError && (
          <p className="text-red-400 text-sm mt-1" role="alert">
            {usernameError}
          </p>
        )}
      </div>

      {/* Color Select */}
      <div>
        <label
          htmlFor="color-select"
          className="block text-sm font-medium mb-2 text-gray-300"
        >
          Your Color
        </label>
        <select
          id="color-select"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
          aria-label="Select your player color"
        >
          {PLAYER_COLORS.map((color: string) => (
            <option key={color} value={color}>
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
