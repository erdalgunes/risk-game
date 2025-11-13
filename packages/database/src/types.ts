// Re-export generated types
export * from './types-generated';

// Custom type aliases for better type safety
export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'neutral';
export type LobbyStatus = 'waiting' | 'starting' | 'in_progress' | 'finished';
export type GameStatus = 'active' | 'finished' | 'abandoned';
