export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_lobbies: {
        Row: {
          created_at: string | null
          finished_at: string | null
          host_player_id: string
          id: string
          lobby_code: string
          max_players: number
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          host_player_id: string
          id?: string
          lobby_code: string
          max_players: number
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          host_player_id?: string
          id?: string
          lobby_code?: string
          max_players?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_lobbies_host_player_id_fkey"
            columns: ["host_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          game_id: string
          is_active: boolean | null
          joined_at: string | null
          last_move_at: string | null
          player_color: string
          player_id: string
        }
        Insert: {
          game_id: string
          is_active?: boolean | null
          joined_at?: string | null
          last_move_at?: string | null
          player_color: string
          player_id: string
        }
        Update: {
          game_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          last_move_at?: string | null
          player_color?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          id: string
          lobby_id: string | null
          mode: string
          player_count: number | null
          state: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lobby_id?: string | null
          mode: string
          player_count?: number | null
          state: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lobby_id?: string | null
          mode?: string
          player_count?: number | null
          state?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "game_lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_players: {
        Row: {
          join_order: number
          joined_at: string | null
          last_heartbeat: string | null
          lobby_id: string
          player_color: string | null
          player_id: string
        }
        Insert: {
          join_order: number
          joined_at?: string | null
          last_heartbeat?: string | null
          lobby_id: string
          player_color?: string | null
          player_id: string
        }
        Update: {
          join_order?: number
          joined_at?: string | null
          last_heartbeat?: string | null
          lobby_id?: string
          player_color?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "game_lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          last_active: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          last_active?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          last_active?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_abandoned_lobbies: { Args: never; Returns: number }
      cleanup_inactive_lobby_players: { Args: never; Returns: number }
      cleanup_old_games: { Args: never; Returns: number }
      generate_lobby_code: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
