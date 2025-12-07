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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      attendance_sessions: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string | null
          method: string | null
          notes: string | null
          staff_user_id: string | null
          subject_type: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          created_by?: string | null
          gym_id: string
          id?: string
          member_id?: string | null
          method?: string | null
          notes?: string | null
          staff_user_id?: string | null
          subject_type: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          created_by?: string | null
          gym_id?: string
          id?: string
          member_id?: string | null
          method?: string | null
          notes?: string | null
          staff_user_id?: string | null
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_portal_adoption"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          description: string | null
          document_date: string
          download_url: string | null
          file_size_bytes: number | null
          hosted_url: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          razorpay_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          document_date?: string
          download_url?: string | null
          file_size_bytes?: number | null
          hosted_url?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          razorpay_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          document_date?: string
          download_url?: string | null
          file_size_bytes?: number | null
          hosted_url?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          razorpay_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          metadata: Json | null
          rating: number | null
          reason: string
          subscription_id: string | null
          updated_at: string
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          metadata?: Json | null
          rating?: number | null
          reason: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          metadata?: Json | null
          rating?: number | null
          reason?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          gym_id: string | null
          id: string
          invited_by: string | null
          metadata: Json | null
          role: string
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          gym_id?: string | null
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          role: string
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          gym_id?: string | null
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          role?: string
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_metrics: {
        Row: {
          active_members: number | null
          checked_in_today: number | null
          created_at: string
          gym_id: string
          id: string
          metric_date: string
          month_year: string
          new_members: number | null
          retention_rate: number | null
          revenue: number | null
          total_members: number | null
          updated_at: string
        }
        Insert: {
          active_members?: number | null
          checked_in_today?: number | null
          created_at?: string
          gym_id: string
          id?: string
          metric_date?: string
          month_year: string
          new_members?: number | null
          retention_rate?: number | null
          revenue?: number | null
          total_members?: number | null
          updated_at?: string
        }
        Update: {
          active_members?: number | null
          checked_in_today?: number | null
          created_at?: string
          gym_id?: string
          id?: string
          metric_date?: string
          month_year?: string
          new_members?: number | null
          retention_rate?: number | null
          revenue?: number | null
          total_members?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_metrics_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          phone: string | null
          settings: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          settings?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          settings?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      member_activities: {
        Row: {
          activity_time: string | null
          activity_type: string
          created_at: string
          id: string
          member_id: string
          notes: string | null
          timestamp: string
        }
        Insert: {
          activity_time?: string | null
          activity_type: string
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          timestamp?: string
        }
        Update: {
          activity_time?: string | null
          activity_type?: string
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_activities_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_portal_adoption"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_activities_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          gym_id: string
          id: string
          invitation_count: number | null
          join_date: string | null
          last_activity_at: string | null
          last_name: string | null
          metadata: Json | null
          phone_number: string | null
          portal_activated_at: string | null
          portal_invited_at: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          gym_id: string
          id?: string
          invitation_count?: number | null
          join_date?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone_number?: string | null
          portal_activated_at?: string | null
          portal_invited_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          gym_id?: string
          id?: string
          invitation_count?: number | null
          join_date?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone_number?: string | null
          portal_activated_at?: string | null
          portal_invited_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
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
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          razorpay_payment_method_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          razorpay_payment_method_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          razorpay_payment_method_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_permissions: Json | null
          default_role: string | null
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          gym_id: string | null
          id: string
          is_gym_owner: boolean | null
          last_role_sync: string | null
          phone: string | null
          phone_verified: boolean | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_permissions?: Json | null
          default_role?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          gym_id?: string | null
          id: string
          is_gym_owner?: boolean | null
          last_role_sync?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_permissions?: Json | null
          default_role?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          gym_id?: string | null
          id?: string
          is_gym_owner?: boolean | null
          last_role_sync?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferences?: Json | null
          updated_at?: string
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
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          processing_duration_ms: number | null
          retry_count: number | null
          subscription_id: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          processing_duration_ms?: number | null
          retry_count?: number | null
          subscription_id: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          processing_duration_ms?: number | null
          retry_count?: number | null
          subscription_id?: string
          webhook_id?: string | null
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
      subscription_owners: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          is_primary_owner: boolean | null
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          is_primary_owner?: boolean | null
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          is_primary_owner?: boolean | null
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_owners_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_owners_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          advanced_analytics: boolean | null
          api_access_enabled: boolean | null
          billing_cycle: string
          created_at: string | null
          currency: string | null
          custom_reporting: boolean | null
          data_retention_months: number | null
          description: string | null
          display_name: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          max_members: number | null
          max_staff: number | null
          member_limit: number | null
          multi_gym_enabled: boolean | null
          name: string
          plan_type: string
          price_inr: number
          price_monthly: number | null
          price_yearly: number | null
          priority_support: boolean | null
          razorpay_plan_id: string | null
          sort_order: number | null
          tier_level: number
          updated_at: string | null
        }
        Insert: {
          advanced_analytics?: boolean | null
          api_access_enabled?: boolean | null
          billing_cycle: string
          created_at?: string | null
          currency?: string | null
          custom_reporting?: boolean | null
          data_retention_months?: number | null
          description?: string | null
          display_name?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_members?: number | null
          max_staff?: number | null
          member_limit?: number | null
          multi_gym_enabled?: boolean | null
          name: string
          plan_type: string
          price_inr: number
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          razorpay_plan_id?: string | null
          sort_order?: number | null
          tier_level?: number
          updated_at?: string | null
        }
        Update: {
          advanced_analytics?: boolean | null
          api_access_enabled?: boolean | null
          billing_cycle?: string
          created_at?: string | null
          currency?: string | null
          custom_reporting?: boolean | null
          data_retention_months?: number | null
          description?: string | null
          display_name?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_members?: number | null
          max_staff?: number | null
          member_limit?: number | null
          multi_gym_enabled?: boolean | null
          name?: string
          plan_type?: string
          price_inr?: number
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          razorpay_plan_id?: string | null
          sort_order?: number | null
          tier_level?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          canceled_at: string | null
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          ends_at: string | null
          failed_payment_count: number | null
          gym_id: string
          id: string
          last_payment_date: string | null
          metadata: Json | null
          next_payment_date: string | null
          razorpay_customer_id: string | null
          razorpay_price_id: string | null
          razorpay_subscription_id: string | null
          scheduled_change_data: Json | null
          scheduled_change_effective_date: string | null
          scheduled_change_type: string | null
          starts_at: string
          status: string
          subscription_plan_id: string
          trial_end_date: string | null
          trial_start_date: string | null
          trial_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end: string
          current_period_start?: string
          ends_at?: string | null
          failed_payment_count?: number | null
          gym_id: string
          id?: string
          last_payment_date?: string | null
          metadata?: Json | null
          next_payment_date?: string | null
          razorpay_customer_id?: string | null
          razorpay_price_id?: string | null
          razorpay_subscription_id?: string | null
          scheduled_change_data?: Json | null
          scheduled_change_effective_date?: string | null
          scheduled_change_type?: string | null
          starts_at?: string
          status?: string
          subscription_plan_id: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          ends_at?: string | null
          failed_payment_count?: number | null
          gym_id?: string
          id?: string
          last_payment_date?: string | null
          metadata?: Json | null
          next_payment_date?: string | null
          razorpay_customer_id?: string | null
          razorpay_price_id?: string | null
          razorpay_subscription_id?: string | null
          scheduled_change_data?: Json | null
          scheduled_change_effective_date?: string | null
          scheduled_change_type?: string | null
          starts_at?: string
          status?: string
          subscription_plan_id?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          expires_at: string | null
          gym_id: string
          id: string
          is_active: boolean | null
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          gym_id: string
          id?: string
          is_active?: boolean | null
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean | null
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          gym_id: string | null
          id: string
          last_retry_at: string | null
          processed_at: string | null
          processing_duration_ms: number | null
          raw_event: Json
          razorpay_event_id: string | null
          retry_count: number | null
          status: string
          subscription_id: string | null
          webhook_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          gym_id?: string | null
          id?: string
          last_retry_at?: string | null
          processed_at?: string | null
          processing_duration_ms?: number | null
          raw_event: Json
          razorpay_event_id?: string | null
          retry_count?: number | null
          status: string
          subscription_id?: string | null
          webhook_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          gym_id?: string | null
          id?: string
          last_retry_at?: string | null
          processed_at?: string | null
          processing_duration_ms?: number | null
          raw_event?: Json
          razorpay_event_id?: string | null
          retry_count?: number | null
          status?: string
          subscription_id?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_portal_adoption: {
        Row: {
          activation_time_hours: number | null
          days_since_last_activity: number | null
          email: string | null
          first_name: string | null
          gym_id: string | null
          invitation_count: number | null
          last_activity_at: string | null
          last_name: string | null
          member_created_at: string | null
          member_id: string | null
          portal_activated_at: string | null
          portal_invited_at: string | null
          portal_status: string | null
          status: string | null
        }
        Insert: {
          activation_time_hours?: never
          days_since_last_activity?: never
          email?: string | null
          first_name?: string | null
          gym_id?: string | null
          invitation_count?: number | null
          last_activity_at?: string | null
          last_name?: string | null
          member_created_at?: string | null
          member_id?: string | null
          portal_activated_at?: string | null
          portal_invited_at?: string | null
          portal_status?: never
          status?: string | null
        }
        Update: {
          activation_time_hours?: never
          days_since_last_activity?: never
          email?: string | null
          first_name?: string | null
          gym_id?: string | null
          invitation_count?: number | null
          last_activity_at?: string | null
          last_name?: string | null
          member_created_at?: string | null
          member_id?: string | null
          portal_activated_at?: string | null
          portal_invited_at?: string | null
          portal_status?: never
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
      user_permissions_view: {
        Row: {
          gym_id: string | null
          permissions: string[] | null
          role_level: number | null
          role_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation_by_hash: {
        Args: {
          hashed_token_param: string
          user_email_param: string
          user_id_param: string
        }
        Returns: Json
      }
      add_payment_method: {
        Args: {
          p_card_brand?: string
          p_card_exp_month?: number
          p_card_exp_year?: number
          p_card_last4?: string
          p_is_default?: boolean
          p_razorpay_payment_method_id: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      bulk_invite_members_to_portal: {
        Args: {
          p_expires_in_hours?: number
          p_gym_id: string
          p_member_ids: string[]
          p_message?: string
        }
        Returns: Json
      }
      cancel_subscription: {
        Args: { p_cancel_at_period_end?: boolean; p_subscription_id: string }
        Returns: boolean
      }
      check_subscription_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_trial_access: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_expired_invitations: { Args: never; Returns: Json }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      complete_user_profile: {
        Args: { gym_name: string; p_user_id: string }
        Returns: string
      }
      convert_trial_to_subscription: {
        Args: {
          p_plan_name: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      create_document: {
        Args: {
          p_amount?: number
          p_currency?: string
          p_description?: string
          p_document_date?: string
          p_download_url?: string
          p_hosted_url?: string
          p_metadata?: Json
          p_razorpay_id?: string
          p_status?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_subscription: {
        Args: {
          p_amount: number
          p_billing_cycle: string
          p_current_period_end: string
          p_current_period_start: string
          p_plan_id: string
          p_razorpay_customer_id: string
          p_razorpay_price_id: string
          p_razorpay_subscription_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_subscription_with_analytics: {
        Args: {
          p_amount: number
          p_billing_cycle: string
          p_current_period_end: string
          p_plan_id: string
          p_stripe_customer_id: string
          p_stripe_price_id: string
          p_stripe_subscription_id: string
          p_user_id: string
        }
        Returns: string
      }
      end_attendance_session: {
        Args: { p_checkout_at?: string; p_session_id: string }
        Returns: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string | null
          method: string | null
          notes: string | null
          staff_user_id: string | null
          subject_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_gym_owner_info: {
        Args: { gym_uuid: string }
        Returns: {
          owner_email: string
          owner_full_name: string
          owner_id: string
        }[]
      }
      get_invitation_stats: { Args: { gym_id_param?: string }; Returns: Json }
      get_member_attendance: {
        Args: {
          p_from?: string
          p_gym_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_to?: string
        }
        Returns: {
          check_in_at: string
          check_out_at: string
          member_id: string
          name: string
          role: string
          session_id: string
          total_seconds: number
        }[]
      }
      get_member_by_user_id: {
        Args: { p_gym_id?: string; p_user_id: string }
        Returns: {
          created_at: string
          email: string | null
          first_name: string | null
          gym_id: string
          id: string
          invitation_count: number | null
          join_date: string | null
          last_activity_at: string | null
          last_name: string | null
          metadata: Json | null
          phone_number: string | null
          portal_activated_at: string | null
          portal_invited_at: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_member_current_status: {
        Args: never
        Returns: {
          check_in_at: string
          is_checked_in: boolean
          session_id: string
          total_seconds: number
        }[]
      }
      get_member_portal_stats: {
        Args: { p_gym_id: string; p_period_days?: number }
        Returns: Json
      }
      get_members_eligible_for_portal: {
        Args: { p_gym_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          email: string
          first_name: string
          invitation_count: number
          join_date: string
          last_invited_at: string
          last_name: string
          member_id: string
        }[]
      }
      get_my_member_attendance: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_to?: string
        }
        Returns: {
          check_in_at: string
          check_out_at: string
          method: string
          notes: string
          session_id: string
          total_seconds: number
        }[]
      }
      get_staff_attendance: {
        Args: {
          p_from?: string
          p_gym_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_to?: string
        }
        Returns: {
          check_in_at: string
          check_out_at: string
          name: string
          role: string
          session_id: string
          staff_user_id: string
          total_seconds: number
        }[]
      }
      get_user_gym_id: { Args: never; Returns: string }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_user_permissions: {
        Args: { gym_uuid: string; user_uuid: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { gym_uuid: string; user_uuid: string }
        Returns: string
      }
      has_permission: {
        Args: { p_gym_id: string; p_permission_name: string; p_user_id: string }
        Returns: boolean
      }
      has_role_level: {
        Args: { gym_uuid: string; required_level: number; user_uuid: string }
        Returns: boolean
      }
      initialize_trial_subscription: {
        Args: { p_user_id: string }
        Returns: string
      }
      log_subscription_analytics: {
        Args: {
          p_amount?: number
          p_billing_cycle?: string
          p_churn_reason?: string
          p_event_data?: Json
          p_event_type: string
          p_mrr_impact?: number
          p_plan_name?: string
          p_subscription_id?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_expired_invitations: { Args: never; Returns: undefined }
      member_check_in: {
        Args: { p_method?: string; p_notes?: string }
        Returns: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string | null
          method: string | null
          notes: string | null
          staff_user_id: string | null
          subject_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      member_check_out: {
        Args: { p_checkout_at?: string }
        Returns: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string | null
          method: string | null
          notes: string | null
          staff_user_id: string | null
          subject_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pause_subscription: {
        Args: { p_subscription_id: string }
        Returns: boolean
      }
      record_member_activity: {
        Args: {
          activity_notes?: string
          activity_type?: string
          member_id: string
        }
        Returns: string
      }
      remove_payment_method: {
        Args: { p_payment_method_id: string; p_user_id: string }
        Returns: boolean
      }
      resume_subscription: {
        Args: { p_subscription_id: string }
        Returns: boolean
      }
      schedule_subscription_change: {
        Args: {
          p_change_data?: Json
          p_change_type: string
          p_effective_date: string
          p_subscription_id: string
        }
        Returns: boolean
      }
      set_default_payment_method: {
        Args: { p_payment_method_id: string; p_user_id: string }
        Returns: boolean
      }
      start_attendance_session: {
        Args: {
          p_member_id?: string
          p_method?: string
          p_notes?: string
          p_staff_user_id?: string
          p_subject_type: string
        }
        Returns: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string | null
          method: string | null
          notes: string | null
          staff_user_id: string | null
          subject_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      track_document_download: {
        Args: {
          p_document_type: string
          p_download_method?: string
          p_file_size?: number
          p_ip_address?: unknown
          p_stripe_invoice_id?: string
          p_stripe_payment_intent_id?: string
          p_stripe_session_id?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      track_member_portal_activation: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: undefined
      }
      track_payment_session: {
        Args: {
          p_amount_total?: number
          p_customer_email?: string
          p_customer_name?: string
          p_expires_at?: string
          p_payment_status?: string
          p_session_status?: string
          p_stripe_payment_intent_id?: string
          p_stripe_session_id: string
          p_user_id: string
        }
        Returns: string
      }
      update_attendance_session: {
        Args: {
          p_check_in_at: string
          p_check_out_at?: string
          p_notes?: string
          p_session_id: string
        }
        Returns: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string | null
          method: string | null
          notes: string | null
          staff_user_id: string | null
          subject_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_gym_metrics: {
        Args: { date_param?: string; gym_id_param: string }
        Returns: undefined
      }
      user_has_role_in_gym: {
        Args: { p_gym_id: string; p_role_names: string[]; p_user_id: string }
        Returns: boolean
      }
      verify_invitation_by_hash: {
        Args: { hashed_token_param: string }
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
