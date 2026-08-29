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
      ai2_queries: {
        Row: {
          concept_key: string
          created_at: string
          id: string
          question_text: string
          revealed_answer: string | null
          user_guess: string | null
          user_id: string
          was_guess_correct: boolean | null
        }
        Insert: {
          concept_key: string
          created_at?: string
          id?: string
          question_text: string
          revealed_answer?: string | null
          user_guess?: string | null
          user_id: string
          was_guess_correct?: boolean | null
        }
        Update: {
          concept_key?: string
          created_at?: string
          id?: string
          question_text?: string
          revealed_answer?: string | null
          user_guess?: string | null
          user_id?: string
          was_guess_correct?: boolean | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          credits: number
          plan: string | null
          stripe_customer_id: string | null
          stripe_subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          credits?: number
          plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          credits?: number
          plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          stripe_event_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          stripe_event_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          stripe_event_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      drill_attempts: {
        Row: {
          ai1_response: Json
          created_at: string
          id: string
          image_photographer_name: string | null
          image_photographer_url: string | null
          image_url: string
          submitted_text: string
          user_id: string
        }
        Insert: {
          ai1_response: Json
          created_at?: string
          id?: string
          image_photographer_name?: string | null
          image_photographer_url?: string | null
          image_url: string
          submitted_text: string
          user_id: string
        }
        Update: {
          ai1_response?: Json
          created_at?: string
          id?: string
          image_photographer_name?: string | null
          image_photographer_url?: string | null
          image_url?: string
          submitted_text?: string
          user_id?: string
        }
        Relationships: []
      }
      listening_scenarios: {
        Row: {
          base_rate: number
          created_at: string
          id: string
          is_onboarding: boolean
          max_turns: number | null
          mode: string
          noise_profile: string
          onboarding_step: number | null
          situation_brief: string
          slug: string
          target_reductions: Json
          target_vocab: Json
          tier: number
          title: string
          voice_accent: string
        }
        Insert: {
          base_rate?: number
          created_at?: string
          id?: string
          is_onboarding?: boolean
          max_turns?: number | null
          mode?: string
          noise_profile?: string
          onboarding_step?: number | null
          situation_brief: string
          slug: string
          target_reductions?: Json
          target_vocab?: Json
          tier: number
          title: string
          voice_accent?: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          id?: string
          is_onboarding?: boolean
          max_turns?: number | null
          mode?: string
          noise_profile?: string
          onboarding_step?: number | null
          situation_brief?: string
          slug?: string
          target_reductions?: Json
          target_vocab?: Json
          tier?: number
          title?: string
          voice_accent?: string
        }
        Relationships: []
      }
      listening_sessions: {
        Row: {
          clarification_rate: number | null
          completed_at: string | null
          created_at: string
          credits_charged: number
          id: string
          scenario_id: string
          status: string
          tier_at_start: number
          transcript_revealed: boolean
          transcript_revealed_at: string | null
          user_id: string
        }
        Insert: {
          clarification_rate?: number | null
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          id?: string
          scenario_id: string
          status?: string
          tier_at_start: number
          transcript_revealed?: boolean
          transcript_revealed_at?: string | null
          user_id: string
        }
        Update: {
          clarification_rate?: number | null
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          id?: string
          scenario_id?: string
          status?: string
          tier_at_start?: number
          transcript_revealed?: boolean
          transcript_revealed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "listening_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_turns: {
        Row: {
          clarification_strategy: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          target_items_used: Json
          turn_index: number
          turn_type: string
          user_id: string
        }
        Insert: {
          clarification_strategy?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          target_items_used?: Json
          turn_index: number
          turn_type: string
          user_id: string
        }
        Update: {
          clarification_strategy?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          target_items_used?: Json
          turn_index?: number
          turn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "listening_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      painting_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_charged: number
          id: string
          image_url: string
          painting_id: string
          reveal_missed_labels: string[]
          reveal_narrative: Json
          reveal_noticed_labels: string[]
          reveal_tour_page_bodies: string[]
          reveal_tour_page_headings: string[]
          round1_grading: Json
          round1_text: string
          round2_grading: Json | null
          round2_text: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_charged: number
          id?: string
          image_url: string
          painting_id: string
          reveal_missed_labels?: string[]
          reveal_narrative: Json
          reveal_noticed_labels?: string[]
          reveal_tour_page_bodies?: string[]
          reveal_tour_page_headings?: string[]
          round1_grading: Json
          round1_text: string
          round2_grading?: Json | null
          round2_text?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          id?: string
          image_url?: string
          painting_id?: string
          reveal_missed_labels?: string[]
          reveal_narrative?: Json
          reveal_noticed_labels?: string[]
          reveal_tour_page_bodies?: string[]
          reveal_tour_page_headings?: string[]
          round1_grading?: Json
          round1_text?: string
          round2_grading?: Json | null
          round2_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painting_attempts_painting_id_fkey"
            columns: ["painting_id"]
            isOneToOne: false
            referencedRelation: "paintings"
            referencedColumns: ["id"]
          },
        ]
      }
      painting_noticeable_elements: {
        Row: {
          id: string
          keywords: string[]
          label: string
          painting_id: string
          position: number
        }
        Insert: {
          id?: string
          keywords?: string[]
          label: string
          painting_id: string
          position: number
        }
        Update: {
          id?: string
          keywords?: string[]
          label?: string
          painting_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "painting_noticeable_elements_painting_id_fkey"
            columns: ["painting_id"]
            isOneToOne: false
            referencedRelation: "paintings"
            referencedColumns: ["id"]
          },
        ]
      }
      painting_tour_pages: {
        Row: {
          focus_x: number
          focus_y: number
          grounding_body: string
          heading: string
          id: string
          painting_id: string
          position: number
          zoom: number
        }
        Insert: {
          focus_x: number
          focus_y: number
          grounding_body: string
          heading: string
          id?: string
          painting_id: string
          position: number
          zoom: number
        }
        Update: {
          focus_x?: number
          focus_y?: number
          grounding_body?: string
          heading?: string
          id?: string
          painting_id?: string
          position?: number
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "painting_tour_pages_painting_id_fkey"
            columns: ["painting_id"]
            isOneToOne: false
            referencedRelation: "paintings"
            referencedColumns: ["id"]
          },
        ]
      }
      paintings: {
        Row: {
          artist: string
          background: string
          created_at: string
          id: string
          image_url: string
          intent: string
          interpretations: string[]
          slug: string
          tier: number
          title: string
          year: string
        }
        Insert: {
          artist: string
          background: string
          created_at?: string
          id?: string
          image_url: string
          intent: string
          interpretations?: string[]
          slug: string
          tier?: number
          title: string
          year: string
        }
        Update: {
          artist?: string
          background?: string
          created_at?: string
          id?: string
          image_url?: string
          intent?: string
          interpretations?: string[]
          slug?: string
          tier?: number
          title?: string
          year?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          grade_band: string | null
          level_score: number | null
          listening_tier_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          grade_band?: string | null
          level_score?: number | null
          listening_tier_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          grade_band?: string | null
          level_score?: number | null
          listening_tier_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      vocabulary_log: {
        Row: {
          first_used_at: string
          last_used_at: string
          lemma: string
          part_of_speech: string | null
          use_count: number
          user_id: string
        }
        Insert: {
          first_used_at?: string
          last_used_at?: string
          lemma: string
          part_of_speech?: string | null
          use_count?: number
          user_id: string
        }
        Update: {
          first_used_at?: string
          last_used_at?: string
          lemma?: string
          part_of_speech?: string | null
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      weak_points: {
        Row: {
          category: string
          concept_key: string
          display_label: string | null
          last_seen_at: string
          times_flagged: number
          user_id: string
        }
        Insert: {
          category: string
          concept_key: string
          display_label?: string | null
          last_seen_at?: string
          times_flagged?: number
          user_id: string
        }
        Update: {
          category?: string
          concept_key?: string
          display_label?: string | null
          last_seen_at?: string
          times_flagged?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credit: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: boolean
      }
      decrement_weak_point: {
        Args: { p_concept_key: string; p_user_id: string }
        Returns: undefined
      }
      grant_credit: {
        Args: {
          p_amount: number
          p_reason: string
          p_stripe_event_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      refund_credit: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      set_stripe_customer_id: {
        Args: { p_stripe_customer_id: string; p_user_id: string }
        Returns: undefined
      }
      update_level_score: {
        Args: { p_alpha?: number; p_level_estimate: number; p_user_id: string }
        Returns: number
      }
      update_listening_tier_score: {
        Args: { p_alpha?: number; p_tier_estimate: number; p_user_id: string }
        Returns: number
      }
      upsert_vocabulary_log: {
        Args: { p_lemma: string; p_part_of_speech: string; p_user_id: string }
        Returns: undefined
      }
      upsert_weak_point: {
        Args: {
          p_category: string
          p_concept_key: string
          p_display_label?: string
          p_user_id: string
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

