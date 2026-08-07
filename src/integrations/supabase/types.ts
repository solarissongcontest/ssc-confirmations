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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      editions: {
        Row: {
          created_at: string
          description: string | null
          edition_number: number
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edition_number: number
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edition_number?: number
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      internal_entries: {
        Row: {
          artist: string | null
          final_clip_end: string | null
          final_clip_start: string | null
          id: string
          preview_end: string | null
          preview_start: string | null
          replacement_video_required: boolean
          replacement_video_url: string | null
          song_title: string | null
          song_url: string | null
          submission_id: string
        }
        Insert: {
          artist?: string | null
          final_clip_end?: string | null
          final_clip_start?: string | null
          id?: string
          preview_end?: string | null
          preview_start?: string | null
          replacement_video_required?: boolean
          replacement_video_url?: string | null
          song_title?: string | null
          song_url?: string | null
          submission_id: string
        }
        Update: {
          artist?: string | null
          final_clip_end?: string | null
          final_clip_start?: string | null
          id?: string
          preview_end?: string | null
          preview_start?: string | null
          replacement_video_required?: boolean
          replacement_video_url?: string | null
          song_title?: string | null
          song_url?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_entries_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      national_final_entries: {
        Row: {
          artist: string | null
          id: string
          national_final_id: string
          position: number
          song_title: string | null
          song_url: string | null
        }
        Insert: {
          artist?: string | null
          id?: string
          national_final_id: string
          position?: number
          song_title?: string | null
          song_url?: string | null
        }
        Update: {
          artist?: string | null
          id?: string
          national_final_id?: string
          position?: number
          song_title?: string | null
          song_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_final_entries_national_final_id_fkey"
            columns: ["national_final_id"]
            isOneToOne: false
            referencedRelation: "national_finals"
            referencedColumns: ["id"]
          },
        ]
      }
      national_finals: {
        Row: {
          expected_entry_count: number | null
          id: string
          nf_name: string | null
          submission_id: string
          winning_entry_id: string | null
        }
        Insert: {
          expected_entry_count?: number | null
          id?: string
          nf_name?: string | null
          submission_id: string
          winning_entry_id?: string | null
        }
        Update: {
          expected_entry_count?: number | null
          id?: string
          nf_name?: string | null
          submission_id?: string
          winning_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_finals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_rounds: {
        Row: {
          closes_at: string | null
          created_at: string
          edition_id: string
          id: string
          name: string
          opens_at: string | null
          response_limit: number | null
          status: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          edition_id: string
          id?: string
          name: string
          opens_at?: string | null
          response_limit?: number | null
          status?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          edition_id?: string
          id?: string
          name?: string
          opens_at?: string | null
          response_limit?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_rounds_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_versions: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          submission_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot: Json
          submission_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          submission_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "submission_versions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          admin_notes: string | null
          country: string
          country_account: string | null
          edit_count: number
          editing_allowed: boolean
          edition_id: string
          entry_unknown: boolean
          has_country_account: boolean
          id: string
          instagram_username: string
          locked: boolean
          nf_approximate_text: string | null
          nf_date_type: string | null
          nf_entries_unknown: boolean
          nf_exact_date: string | null
          nf_result_approximate_text: string | null
          nf_result_date_type: string | null
          nf_result_exact_date: string | null
          participating: boolean
          reveal_approximate_text: string | null
          reveal_date_type: string | null
          reveal_exact_date: string | null
          reviewed: boolean
          round_id: string
          selection_method: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          country: string
          country_account?: string | null
          edit_count?: number
          editing_allowed?: boolean
          edition_id: string
          entry_unknown?: boolean
          has_country_account?: boolean
          id?: string
          instagram_username: string
          locked?: boolean
          nf_approximate_text?: string | null
          nf_date_type?: string | null
          nf_entries_unknown?: boolean
          nf_exact_date?: string | null
          nf_result_approximate_text?: string | null
          nf_result_date_type?: string | null
          nf_result_exact_date?: string | null
          participating?: boolean
          reveal_approximate_text?: string | null
          reveal_date_type?: string | null
          reveal_exact_date?: string | null
          reviewed?: boolean
          round_id: string
          selection_method?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          country?: string
          country_account?: string | null
          edit_count?: number
          editing_allowed?: boolean
          edition_id?: string
          entry_unknown?: boolean
          has_country_account?: boolean
          id?: string
          instagram_username?: string
          locked?: boolean
          nf_approximate_text?: string | null
          nf_date_type?: string | null
          nf_entries_unknown?: boolean
          nf_exact_date?: string | null
          nf_result_approximate_text?: string | null
          nf_result_date_type?: string | null
          nf_result_exact_date?: string | null
          participating?: boolean
          reveal_approximate_text?: string | null
          reveal_date_type?: string | null
          reveal_exact_date?: string | null
          reviewed?: boolean
          round_id?: string
          selection_method?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "submission_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      round_is_open: {
        Args: {
          _count: number
          _round: Database["public"]["Tables"]["submission_rounds"]["Row"]
        }
        Returns: boolean
      }
      submit_confirmation: { Args: { payload: Json }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
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
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
