// Supabase Database Types
// In production, generate this with: supabase gen types typescript --local

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          status: 'waiting' | 'setup' | 'playing' | 'finished';
          phase: 'reinforcement' | 'attack' | 'fortify' | null;
          current_turn: number;
          current_player_order: number | null;
          winner_id: string | null;
          max_players: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: 'waiting' | 'setup' | 'playing' | 'finished';
          phase?: 'reinforcement' | 'attack' | 'fortify' | null;
          current_turn?: number;
          current_player_order?: number | null;
          winner_id?: string | null;
          max_players?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: 'waiting' | 'setup' | 'playing' | 'finished';
          phase?: 'reinforcement' | 'attack' | 'fortify' | null;
          current_turn?: number;
          current_player_order?: number | null;
          winner_id?: string | null;
          max_players?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          game_id: string;
          username: string;
          color: string;
          turn_order: number;
          armies_available: number;
          is_eliminated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          username: string;
          color: string;
          turn_order: number;
          armies_available?: number;
          is_eliminated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          username?: string;
          color?: string;
          turn_order?: number;
          armies_available?: number;
          is_eliminated?: boolean;
          created_at?: string;
        };
      };
      territories: {
        Row: {
          id: string;
          game_id: string;
          territory_name: string;
          owner_id: string | null;
          army_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          territory_name: string;
          owner_id?: string | null;
          army_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          territory_name?: string;
          owner_id?: string | null;
          army_count?: number;
          updated_at?: string;
        };
      };
      game_actions: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          action_type: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          action_type: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string;
          action_type?: string;
          payload?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
