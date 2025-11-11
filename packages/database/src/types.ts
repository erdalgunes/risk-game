/**
 * Database types for simplified Risk PoC
 * Single table schema for real-time game state
 */

export interface GameStateRow {
  id: string;
  state: string; // JSON-serialized GameState from game-engine
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      game_states: {
        Row: GameStateRow;
        Insert: Omit<GameStateRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GameStateRow, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
