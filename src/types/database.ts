export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string | null
          couple_id: string
          created_at: string
          id: number
          kind: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          couple_id: string
          created_at?: string
          id?: never
          kind: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          couple_id?: string
          created_at?: string
          id?: never
          kind?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      badges_earned: {
        Row: {
          badge_slug: string
          couple_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_slug: string
          couple_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_slug?: string
          couple_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_earned_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_earned_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_members: {
        Row: {
          couple_id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          couple_id: string
          joined_at?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          couple_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          best_team_streak: number
          created_at: string
          created_by: string
          id: string
          invite_code: string
          lmp_date: string
          team_streak: number
          team_streak_date: string | null
          timezone: string
        }
        Insert: {
          best_team_streak?: number
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          lmp_date: string
          team_streak?: number
          team_streak_date?: string | null
          timezone?: string
        }
        Update: {
          best_team_streak?: number
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          lmp_date?: string
          team_streak?: number
          team_streak_date?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "couples_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          author_id: string
          couple_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["journal_kind"]
          occurred_at: string
          payload: Json
        }
        Insert: {
          author_id: string
          couple_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["journal_kind"]
          occurred_at?: string
          payload?: Json
        }
        Update: {
          author_id?: string
          couple_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["journal_kind"]
          occurred_at?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["member_role"] | null
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          role?: Database["public"]["Enums"]["member_role"] | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"] | null
        }
        Relationships: []
      }
      quest_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          couple_id: string
          created_at: string
          id: string
          period_key: string
          status: Database["public"]["Enums"]["quest_status"]
          template_slug: string
          validated_at: string | null
          validated_by: string | null
          xp: number
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          couple_id: string
          created_at?: string
          id?: string
          period_key: string
          status?: Database["public"]["Enums"]["quest_status"]
          template_slug: string
          validated_at?: string | null
          validated_by?: string | null
          xp: number
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          period_key?: string
          status?: Database["public"]["Enums"]["quest_status"]
          template_slug?: string
          validated_at?: string | null
          validated_by?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_instances_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_instances_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_instances_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "quest_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "quest_instances_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_templates: {
        Row: {
          category: Database["public"]["Enums"]["quest_category"]
          max_week: number
          min_week: number
          recurrence: Database["public"]["Enums"]["quest_recurrence"]
          slug: string
          target: Database["public"]["Enums"]["quest_target"]
          xp: number
        }
        Insert: {
          category: Database["public"]["Enums"]["quest_category"]
          max_week?: number
          min_week?: number
          recurrence: Database["public"]["Enums"]["quest_recurrence"]
          slug: string
          target: Database["public"]["Enums"]["quest_target"]
          xp: number
        }
        Update: {
          category?: Database["public"]["Enums"]["quest_category"]
          max_week?: number
          min_week?: number
          recurrence?: Database["public"]["Enums"]["quest_recurrence"]
          slug?: string
          target?: Database["public"]["Enums"]["quest_target"]
          xp?: number
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          best_streak: number
          cheers_sent: number
          couple_id: string
          current_streak: number
          last_active_date: string | null
          quests_completed: number
          quests_validated: number
          user_id: string
          xp: number
        }
        Insert: {
          best_streak?: number
          cheers_sent?: number
          couple_id: string
          current_streak?: number
          last_active_date?: string | null
          quests_completed?: number
          quests_validated?: number
          user_id: string
          xp?: number
        }
        Update: {
          best_streak?: number
          cheers_sent?: number
          couple_id?: string
          current_streak?: number
          last_active_date?: string | null
          quests_completed?: number
          quests_validated?: number
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: { Args: { p_user: string; p_xp: number }; Returns: undefined }
      check_badges: {
        Args: { p_couple: string; p_user: string }
        Returns: undefined
      }
      check_couple_badges: { Args: { p_couple: string }; Returns: undefined }
      complete_quest: {
        Args: { p_instance: string }
        Returns: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          couple_id: string
          created_at: string
          id: string
          period_key: string
          status: Database["public"]["Enums"]["quest_status"]
          template_slug: string
          validated_at: string | null
          validated_by: string | null
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "quest_instances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      couple_today: { Args: { p_couple: string }; Returns: string }
      couple_week: { Args: { p_couple: string }; Returns: number }
      create_couple: {
        Args: { p_lmp_date: string; p_timezone?: string }
        Returns: {
          best_team_streak: number
          created_at: string
          created_by: string
          id: string
          invite_code: string
          lmp_date: string
          team_streak: number
          team_streak_date: string | null
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "couples"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invite_code: { Args: never; Returns: string }
      grant_badge: {
        Args: { p_badge: string; p_couple: string; p_user: string }
        Returns: undefined
      }
      is_couple_member: { Args: { p_couple: string }; Returns: boolean }
      join_couple: {
        Args: { p_code: string }
        Returns: {
          best_team_streak: number
          created_at: string
          created_by: string
          id: string
          invite_code: string
          lmp_date: string
          team_streak: number
          team_streak_date: string | null
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "couples"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_couple_id: { Args: never; Returns: string }
      period_key: {
        Args: {
          p_day: string
          p_recurrence: Database["public"]["Enums"]["quest_recurrence"]
        }
        Returns: string
      }
      refresh_quests: {
        Args: never
        Returns: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          couple_id: string
          created_at: string
          id: string
          period_key: string
          status: Database["public"]["Enums"]["quest_status"]
          template_slug: string
          validated_at: string | null
          validated_by: string | null
          xp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "quest_instances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_cheer: { Args: { p_message?: string }; Returns: undefined }
      touch_team_streak: {
        Args: { p_couple: string; p_today: string }
        Returns: undefined
      }
      touch_user_streak: {
        Args: { p_today: string; p_user: string }
        Returns: undefined
      }
      update_pregnancy_dates: {
        Args: { p_lmp_date: string }
        Returns: {
          best_team_streak: number
          created_at: string
          created_by: string
          id: string
          invite_code: string
          lmp_date: string
          team_streak: number
          team_streak_date: string | null
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "couples"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_quest: {
        Args: { p_instance: string }
        Returns: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          couple_id: string
          created_at: string
          id: string
          period_key: string
          status: Database["public"]["Enums"]["quest_status"]
          template_slug: string
          validated_at: string | null
          validated_by: string | null
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "quest_instances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      journal_kind: "mood" | "symptom" | "weight" | "appointment" | "note"
      member_role: "carrier" | "partner"
      quest_category: "care" | "prep" | "learn" | "bond" | "health"
      quest_recurrence: "daily" | "weekly" | "once"
      quest_status: "todo" | "done" | "validated"
      quest_target: "carrier" | "partner" | "team"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      journal_kind: ["mood", "symptom", "weight", "appointment", "note"],
      member_role: ["carrier", "partner"],
      quest_category: ["care", "prep", "learn", "bond", "health"],
      quest_recurrence: ["daily", "weekly", "once"],
      quest_status: ["todo", "done", "validated"],
      quest_target: ["carrier", "partner", "team"],
    },
  },
} as const

