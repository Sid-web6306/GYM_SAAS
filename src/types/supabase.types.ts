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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      gyms: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          gym_id: string
          id: string
          join_date: string | null
          last_name: string | null
          phone_number: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          gym_id: string
          id?: string
          join_date?: string | null
          last_name?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          gym_id?: string
          id?: string
          join_date?: string | null
          last_name?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          gym_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          gym_id?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          gym_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          price_inr: number
          billing_cycle: string
          plan_type: string
          razorpay_plan_id: string | null
          member_limit: number | null
          features: string[]
          tier_level: number
          api_access_enabled: boolean
          multi_gym_enabled: boolean
          data_retention_months: number
          priority_support: boolean
          advanced_analytics: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price_inr: number
          billing_cycle: string
          plan_type: string
          razorpay_plan_id?: string | null
          member_limit?: number | null
          features?: string[]
          tier_level?: number
          api_access_enabled?: boolean
          multi_gym_enabled?: boolean
          data_retention_months?: number
          priority_support?: boolean
          advanced_analytics?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_inr?: number
          billing_cycle?: string
          plan_type?: string
          razorpay_plan_id?: string | null
          member_limit?: number | null
          features?: string[]
          tier_level?: number
          api_access_enabled?: boolean
          multi_gym_enabled?: boolean
          data_retention_months?: number
          priority_support?: boolean
          advanced_analytics?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription_plan_id: string
          status: string
          billing_cycle: string
          starts_at: string
          current_period_start: string
          current_period_end: string
          ends_at: string | null
          canceled_at: string | null
          paused_at: string | null
          trial_start_date: string | null
          trial_end_date: string | null
          trial_status: string | null
          scheduled_change_type: string | null
          scheduled_change_effective_date: string | null
          scheduled_change_data: Json | null
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          razorpay_subscription_item_id: string | null
          razorpay_price_id: string | null
          amount: number
          currency: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_plan_id: string
          status?: string
          billing_cycle?: string
          starts_at?: string
          current_period_start?: string
          current_period_end: string
          ends_at?: string | null
          canceled_at?: string | null
          paused_at?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_status?: string | null
          scheduled_change_type?: string | null
          scheduled_change_effective_date?: string | null
          scheduled_change_data?: Json | null
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          razorpay_price_id?: string | null
          amount: number
          currency?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_plan_id?: string
          status?: string
          billing_cycle?: string
          starts_at?: string
          current_period_start?: string
          current_period_end?: string
          ends_at?: string | null
          canceled_at?: string | null
          paused_at?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_status?: string | null
          scheduled_change_type?: string | null
          scheduled_change_effective_date?: string | null
          scheduled_change_data?: Json | null
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          razorpay_price_id?: string | null
          amount?: number
          currency?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          razorpay_payment_method_id: string
          type: string
          card_brand: string | null
          card_last4: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          is_default: boolean
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          razorpay_payment_method_id: string
          type: string
          card_brand?: string | null
          card_last4?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          razorpay_payment_method_id?: string
          type?: string
          card_brand?: string | null
          card_last4?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          id: string
          subscription_id: string
          event_type: string
          event_data: Json
          webhook_id: string
          processing_duration_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          event_type: string
          event_data: Json
          webhook_id: string
          processing_duration_ms: number
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          event_type?: string
          event_data?: Json
          webhook_id?: string
          processing_duration_ms?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          reason: string
          feedback_text: string | null
          rating: number | null
          would_recommend: boolean | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          reason: string
          feedback_text?: string | null
          rating?: number | null
          would_recommend?: boolean | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          reason?: string
          feedback_text?: string | null
          rating?: number | null
          would_recommend?: boolean | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          description: string | null
          razorpay_id: string | null
          download_url: string | null
          hosted_url: string | null
          amount: number | null
          currency: string
          status: string | null
          document_date: string
          tags: string[]
          metadata: Json
          file_size_bytes: number | null
          mime_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          description?: string | null
          razorpay_id?: string | null
          download_url?: string | null
          hosted_url?: string | null
          amount?: number | null
          currency?: string
          status?: string | null
          document_date?: string
          tags?: string[]
          metadata?: Json
          file_size_bytes?: number | null
          mime_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          description?: string | null
          razorpay_id?: string | null
          download_url?: string | null
          hosted_url?: string | null
          amount?: number | null
          currency?: string
          status?: string | null
          document_date?: string
          tags?: string[]
          metadata?: Json
          file_size_bytes?: number | null
          mime_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      complete_user_profile: {
        Args: { user_id: string; gym_name: string }
        Returns: undefined
      }
      create_gym_and_profile: {
        Args: { user_id: string; gym_name: string; user_email: string }
        Returns: undefined
      }
      check_subscription_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      create_subscription: {
        Args: { 
          p_user_id: string
          p_plan_id: string
          p_billing_cycle: string
          p_razorpay_customer_id: string
          p_razorpay_subscription_id: string
          p_razorpay_price_id: string
          p_amount: number
          p_current_period_start: string
          p_current_period_end: string
        }
        Returns: string
      }
      get_user_id_by_email: {
        Args: { p_email: string }
        Returns: string
      }
      pause_subscription: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      resume_subscription: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      cancel_subscription: {
        Args: { p_subscription_id: string; p_cancel_at_period_end: boolean }
        Returns: undefined
      }
      schedule_subscription_change: {
        Args: { 
          p_subscription_id: string
          p_change_type: string
          p_effective_date: string
          p_change_data: Json
        }
        Returns: undefined
      }
      create_document: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_description: string
          p_razorpay_id?: string
          p_download_url?: string
          p_hosted_url?: string
          p_amount?: number
          p_currency?: string
          p_status?: string
          p_document_date?: string
          p_metadata?: Json
        }
        Returns: string
      }
      initialize_trial_subscription: {
        Args: { p_user_id: string }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
