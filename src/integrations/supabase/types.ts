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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adaptations: {
        Row: {
          adapted_text: string | null
          created_at: string
          difficulty: string | null
          grade: string
          id: string
          include_answer: boolean | null
          include_example: boolean | null
          justification: string | null
          mode: string
          neurodivergence: string[] | null
          notes: string | null
          objective: string
          original_file_url: string | null
          original_text: string | null
          question_count: number | null
          questionnaire_answers: Json | null
          strategy_settings: Json | null
          subject: string
          teacher_guidance: string | null
          topic: string
          type: string
          user_id: string
        }
        Insert: {
          adapted_text?: string | null
          created_at?: string
          difficulty?: string | null
          grade: string
          id?: string
          include_answer?: boolean | null
          include_example?: boolean | null
          justification?: string | null
          mode?: string
          neurodivergence?: string[] | null
          notes?: string | null
          objective: string
          original_file_url?: string | null
          original_text?: string | null
          question_count?: number | null
          questionnaire_answers?: Json | null
          strategy_settings?: Json | null
          subject: string
          teacher_guidance?: string | null
          topic: string
          type: string
          user_id: string
        }
        Update: {
          adapted_text?: string | null
          created_at?: string
          difficulty?: string | null
          grade?: string
          id?: string
          include_answer?: boolean | null
          include_example?: boolean | null
          justification?: string | null
          mode?: string
          neurodivergence?: string[] | null
          notes?: string | null
          objective?: string
          original_file_url?: string | null
          original_text?: string | null
          question_count?: number | null
          questionnaire_answers?: Json | null
          strategy_settings?: Json | null
          subject?: string
          teacher_guidance?: string | null
          topic?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          name: string
          notes: string | null
          registration_code: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          registration_code?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          registration_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          school_year: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          school_year?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          school_year?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_usage: {
        Row: {
          action: string
          created_at: string
          credits_used: number
          id: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          credits_used?: number
          id?: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          credits_used?: number
          id?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          display_name: string
          features: Json
          id: string
          is_active: boolean
          monthly_credits: number
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean
          monthly_credits?: number
          name: string
          price_cents?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean
          monthly_credits?: number
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          education_level: string | null
          email: string | null
          full_name: string | null
          id: string
          main_goal: string | null
          main_subject: string | null
          name: string | null
          onboarding_completed: boolean | null
          output_preference: string | null
          role: string | null
          school_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          main_goal?: string | null
          main_subject?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          output_preference?: string | null
          role?: string | null
          school_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          main_goal?: string | null
          main_subject?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          output_preference?: string | null
          role?: string | null
          school_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          correct_answer: number | null
          created_at: string | null
          created_by: string
          difficulty: string | null
          id: string
          image_url: string | null
          is_public: boolean | null
          options: Json | null
          resolution: string | null
          school_id: string | null
          source: string | null
          source_file_name: string | null
          subject: string
          text: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          correct_answer?: number | null
          created_at?: string | null
          created_by: string
          difficulty?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          options?: Json | null
          resolution?: string | null
          school_id?: string | null
          source?: string | null
          source_file_name?: string | null
          subject: string
          text: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: number | null
          created_at?: string | null
          created_by?: string
          difficulty?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          options?: Json | null
          resolution?: string | null
          school_id?: string | null
          source?: string | null
          source_file_name?: string | null
          subject?: string
          text?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      school_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          school_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          school_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_barriers: {
        Row: {
          barrier_key: string
          dimension: string
          id: string
          is_active: boolean | null
          notes: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          barrier_key: string
          dimension: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          barrier_key?: string
          dimension?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_barriers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "class_students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          kiwify_subscription_id: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          kiwify_subscription_id?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          kiwify_subscription_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_credits_used: { Args: { p_user_id: string }; Returns: number }
      is_class_owner: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_admin: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_member: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      sanitize_input: {
        Args: { input: string; max_length?: number }
        Returns: string
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
  public: {
    Enums: {},
  },
} as const
