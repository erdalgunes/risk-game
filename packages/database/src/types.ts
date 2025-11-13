export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'neutral';
export type LobbyStatus = 'waiting' | 'starting' | 'in_progress' | 'finished';
export type GameStatus = 'active' | 'finished' | 'abandoned';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          last_active: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          created_at?: string;
          last_active?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
          last_active?: string;
        };
      };
      game_lobbies: {
        Row: {
          id: string;
          lobby_code: string;
          host_player_id: string;
          max_players: number;
          status: LobbyStatus;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          lobby_code: string;
          host_player_id: string;
          max_players: number;
          status?: LobbyStatus;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          lobby_code?: string;
          host_player_id?: string;
          max_players?: number;
          status?: LobbyStatus;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
      };
      lobby_players: {
        Row: {
          lobby_id: string;
          player_id: string;
          player_color: PlayerColor | null;
          join_order: number;
          joined_at: string;
          last_heartbeat: string;
        };
        Insert: {
          lobby_id: string;
          player_id: string;
          player_color?: PlayerColor | null;
          join_order: number;
          joined_at?: string;
          last_heartbeat?: string;
        };
        Update: {
          lobby_id?: string;
          player_id?: string;
          player_color?: PlayerColor | null;
          join_order?: number;
          joined_at?: string;
          last_heartbeat?: string;
        };
      };
      games: {
        Row: {
          id: string;
          state: any;
          mode: 'single' | 'multi';
          lobby_id: string | null;
          player_count: number;
          status: GameStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          state: any;
          mode: 'single' | 'multi';
          lobby_id?: string | null;
          player_count?: number;
          status?: GameStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          state?: any;
          mode?: 'single' | 'multi';
          lobby_id?: string | null;
          player_count?: number;
          status?: GameStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      game_players: {
        Row: {
          game_id: string;
          player_id: string;
          player_color: PlayerColor;
          is_active: boolean;
          joined_at: string;
          last_move_at: string;
        };
        Insert: {
          game_id: string;
          player_id: string;
          player_color: PlayerColor;
          is_active?: boolean;
          joined_at?: string;
          last_move_at?: string;
        };
        Update: {
          game_id?: string;
          player_id?: string;
          player_color?: PlayerColor;
          is_active?: boolean;
          joined_at?: string;
          last_move_at?: string;
        };
      };
    };
    Functions: {
      generate_lobby_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      cleanup_abandoned_lobbies: {
        Args: Record<string, never>;
        Returns: number;
      };
      cleanup_old_games: {
        Args: Record<string, never>;
        Returns: number;
      };
      cleanup_inactive_lobby_players: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
}
