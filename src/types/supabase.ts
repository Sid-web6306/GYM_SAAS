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
          owner_id?: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string | null
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
      ,
      member_activities: {
        Row: {
          id: string
          member_id: string
          activity_type: string
          activity_date: string
          duration_minutes: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          activity_type: string
          activity_date?: string
          duration_minutes?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          activity_type?: string
          activity_date?: string
          duration_minutes?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_activities_member_id_fkey",
            columns: ["member_id"],
            isOneToOne: false,
            referencedRelation: "members",
            referencedColumns: ["id"],
          },
        ]
      }
      ,
      gym_metrics: {
        Row: {
          id: string
          gym_id: string
          metric_type: string
          metric_value: number
          metric_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          metric_type: string
          metric_value: number
          metric_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          metric_type?: string
          metric_value?: number
          metric_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_metrics_gym_id_fkey",
            columns: ["gym_id"],
            isOneToOne: false,
            referencedRelation: "gyms",
            referencedColumns: ["id"],
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          gym_id: string | null
          id: string
          email: string
          updated_at?: string
          avatar_url?: string | null
          preferences?: Json
          default_role?: string | null
          custom_permissions?: { [key: string]: boolean } | null
          last_role_sync?: string | null
          is_gym_owner?: boolean
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          gym_id?: string | null
          id: string
          email: string
          updated_at?: string
          avatar_url?: string | null
          preferences?: Json
          default_role?: string | null
          custom_permissions?: { [key: string]: boolean } | null
          last_role_sync?: string | null
          is_gym_owner?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string | null
          gym_id?: string | null
          id?: string
          email?: string
          updated_at?: string
          avatar_url?: string | null
          preferences?: Json
          default_role?: string | null
          custom_permissions?: { [key: string]: boolean } | null
          last_role_sync?: string | null
          is_gym_owner?: boolean
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
      ,
      roles: {
        Row: {
          id: string
          name: string
          display_name?: string | null
          description?: string | null
          level: number
          is_system_role?: boolean
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          name: string
          display_name?: string | null
          description?: string | null
          level: number
          is_system_role?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string | null
          description?: string | null
          level?: number
          is_system_role?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ,
      permissions: {
        Row: {
          id: string
          name: string
          display_name?: string | null
          description?: string | null
          resource: string
          action: string
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          display_name?: string | null
          description?: string | null
          resource: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string | null
          description?: string | null
          resource?: string
          action?: string
          created_at?: string
        }
        Relationships: []
      }
      ,
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey",
            columns: ["role_id"],
            isOneToOne: false,
            referencedRelation: "roles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey",
            columns: ["permission_id"],
            isOneToOne: false,
            referencedRelation: "permissions",
            referencedColumns: ["id"],
          },
        ]
      }
      ,
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_inr: number
          billing_cycle: 'monthly' | 'annual'
          razorpay_plan_id: string | null
          plan_type?: string | null
          member_limit?: number | null
          features?: Json | null
          is_active?: boolean
          tier_level?: number | null
          api_access_enabled?: boolean | null
          multi_gym_enabled?: boolean | null
          priority_support?: boolean | null
          advanced_analytics?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_inr: number
          billing_cycle: 'monthly' | 'annual'
          razorpay_plan_id?: string | null
          plan_type?: string | null
          member_limit?: number | null
          features?: Json | null
          is_active?: boolean
          tier_level?: number | null
          api_access_enabled?: boolean | null
          multi_gym_enabled?: boolean | null
          priority_support?: boolean | null
          advanced_analytics?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_inr?: number
          billing_cycle?: 'monthly' | 'annual'
          razorpay_plan_id?: string | null
          plan_type?: string | null
          member_limit?: number | null
          features?: Json | null
          is_active?: boolean
          tier_level?: number | null
          api_access_enabled?: boolean | null
          multi_gym_enabled?: boolean | null
          priority_support?: boolean | null
          advanced_analytics?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ,
      subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription_plan_id: string
          status: string
          billing_cycle?: 'monthly' | 'annual' | null
          current_period_start?: string | null
          current_period_end?: string | null
          paused_at?: string | null
          ends_at?: string | null
          canceled_at?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_status?: 'active' | 'expired' | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_plan_id: string
          status: string
          billing_cycle?: 'monthly' | 'annual' | null
          current_period_start?: string | null
          current_period_end?: string | null
          paused_at?: string | null
          ends_at?: string | null
          canceled_at?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_status?: 'active' | 'expired' | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          subscription_plan_id?: string
          status?: string
          billing_cycle?: 'monthly' | 'annual' | null
          current_period_start?: string | null
          current_period_end?: string | null
          paused_at?: string | null
          ends_at?: string | null
          canceled_at?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_status?: 'active' | 'expired' | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey",
            columns: ["subscription_plan_id"],
            isOneToOne: false,
            referencedRelation: "subscription_plans",
            referencedColumns: ["id"],
          },
        ]
      }
      ,
      feedback: {
        Row: {
          id: string
          subscription_id: string
          user_id: string
          reason: string | null
          feedback_text: string | null
          rating: number | null
          would_recommend: boolean | null
          created_at?: string
        }
        Insert: {
          id?: string
          subscription_id: string
          user_id: string
          reason?: string | null
          feedback_text?: string | null
          rating?: number | null
          would_recommend?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          user_id?: string
          reason?: string | null
          feedback_text?: string | null
          rating?: number | null
          would_recommend?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      ,
      subscription_events: {
        Row: {
          id?: string
          subscription_id: string
          event_type: string
          event_data: Json | null
          webhook_id: string | null
          processing_duration_ms: number | null
          created_at?: string
        }
        Insert: {
          id?: string
          subscription_id: string
          event_type: string
          event_data?: Json | null
          webhook_id?: string | null
          processing_duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          event_type?: string
          event_data?: Json | null
          webhook_id?: string | null
          processing_duration_ms?: number | null
          created_at?: string
        }
        Relationships: []
      }
      ,
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
          metadata: Json | null
          created_at?: string
          updated_at?: string | null
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
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
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
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ,
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
            foreignKeyName: "documents_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }
      ,
      user_roles: {
        Row: {
          id?: string
          user_id: string
          role_id: string
          gym_id: string
          is_active: boolean
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          gym_id: string
          is_active?: boolean
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          gym_id?: string
          is_active?: boolean
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "user_roles_gym_id_fkey",
            columns: ["gym_id"],
            isOneToOne: false,
            referencedRelation: "gyms",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "user_roles_role_id_fkey",
            columns: ["role_id"],
            isOneToOne: false,
            referencedRelation: "roles",
            referencedColumns: ["id"],
          },
        ]
      }
      ,
      gym_invitations: {
        Row: {
          id: string
          gym_id: string
          invited_by: string
          email: string
          role: string
          token: string
          expires_at: string
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          metadata: Json | null
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          gym_id: string
          invited_by: string
          email: string
          role: string
          token: string
          expires_at: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          metadata?: Json | null
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          invited_by?: string
          email?: string
          role?: string
          token?: string
          expires_at?: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          metadata?: Json | null
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_invitations_gym_id_fkey",
            columns: ["gym_id"],
            isOneToOne: false,
            referencedRelation: "gyms",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "gym_invitations_invited_by_fkey",
            columns: ["invited_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "gym_invitations_accepted_by_fkey",
            columns: ["accepted_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_user_profile: {
        Args: {
          p_user_id: string
          gym_name: string
        }
        Returns: unknown
      }
      ,
      get_user_id_by_email: {
        Args: {
          p_email: string
        }
        Returns: string | null
      }
      ,
      has_permission: {
        Args: {
          p_user_id: string
          p_gym_id: string
          p_permission_name: string
        }
        Returns: boolean
      }
      ,
      get_user_role: {
        Args: {
          user_uuid: string
          gym_uuid: string
        }
        Returns: string | null
      }
      ,
      get_user_permissions: {
        Args: {
          user_uuid: string
          gym_uuid: string
        }
        Returns: string[]
      }
      ,
      set_default_payment_method: {
        Args: {
          p_user_id: string
          p_payment_method_id: string
        }
        Returns: unknown
      }
      ,
      check_subscription_access: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      ,
      pause_subscription: {
        Args: {
          p_subscription_id: string
        }
        Returns: unknown
      }
      ,
      resume_subscription: {
        Args: {
          p_subscription_id: string
        }
        Returns: unknown
      }
      ,
      cancel_subscription: {
        Args: {
          p_subscription_id: string
          p_cancel_at_period_end: boolean
        }
        Returns: unknown
      }
      ,
      schedule_subscription_change: {
        Args: {
          p_subscription_id: string
          p_change_type: string
          p_effective_date: string
          p_change_data: Json
        }
        Returns: unknown
      }
      ,
      create_subscription: {
        Args: {
          p_user_id: string
          p_plan_id: string
          p_billing_cycle: 'monthly' | 'annual'
          p_razorpay_customer_id: string
          p_razorpay_subscription_id: string
          p_razorpay_price_id: string
          p_amount: number
          p_current_period_start: string
          p_current_period_end: string
        }
        Returns: unknown
      }
      ,
      mark_expired_invitations: {
        Args: Record<string, never>
        Returns: unknown
      }
      ,
      initialize_trial_subscription: {
        Args: {
          p_user_id: string
        }
        Returns: string
      }
      verify_invitation_by_hash: {
        Args: {
          hashed_token_param: string
        }
        Returns: {
          valid: boolean
          invitation?: {
            id: string
            email: string
            role: string
            gym: {
              id: string
              name: string
            }
            invited_by: {
              name: string
              email: string
            }
            expires_at: string
            created_at: string
            message?: string
          }
          user_status?: {
            exists: boolean
            has_role_in_gym: boolean
            current_role: { name: string } | null
          }
          error?: string
        }
      }
      accept_invitation_by_hash: {
        Args: {
          hashed_token_param: string
          user_id_param: string
          user_email_param: string
        }
        Returns: {
          success: boolean
          message?: string
          assignment?: {
            gym_id: string
            gym_name: string
            role: string
          }
          error?: string
          details?: {
            invitation_email?: string
            user_email?: string
          }
        }
      }
      get_gym_owner_info: {
        Args: {
          gym_uuid: string
        }
        Returns: {
          owner_id: string
          owner_full_name: string | null
          owner_email: string
        }[]
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
