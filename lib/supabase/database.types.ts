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
      admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string
          id: string
          lister_id: string
          status: Database["public"]["Enums"]["enquiry_status"]
          unread_count_lister: number
          unread_count_user: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lister_id: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          unread_count_lister?: number
          unread_count_user?: number
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lister_id?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          unread_count_lister?: number
          unread_count_user?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_messages: {
        Row: {
          body: string
          created_at: string
          enquiry_id: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          enquiry_id: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          enquiry_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_messages_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_location_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_location_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_location_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          vehicle_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          profile_image_consent: boolean
          profile_image_consent_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_suspended?: boolean
          phone?: string | null
          profile_image_consent?: boolean
          profile_image_consent_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          profile_image_consent?: boolean
          profile_image_consent_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_images: {
        Row: {
          content_hash: string | null
          created_at: string
          id: string
          is_cover: boolean
          medium_url: string | null
          sort_order: number
          thumbnail_url: string | null
          url: string
          vehicle_id: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          medium_url?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          url: string
          vehicle_id: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          medium_url?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          url?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booking_status: Database["public"]["Enums"]["vehicle_booking_status"]
          brand_id: string | null
          category_id: string | null
          color: string | null
          condition: string | null
          contact_phone: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_by_role: Database["public"]["Enums"]["admin_role"] | null
          description: string | null
          direct_owner: boolean
          engine_capacity: string | null
          features: string[]
          fuel_type: string | null
          id: string
          insurance_valid_until: string | null
          is_deleted: boolean
          km_driven: number | null
          lease_amount: number
          lease_period: string
          lister_id: string
          location_id: string | null
          model: string | null
          name: string
          ownership_count: number | null
          permanent_delete_at: string | null
          published_at: string | null
          registration_year: number | null
          rejected_reason: string | null
          seats: number | null
          service_charge_percent: number | null
          slug: string
          status: Database["public"]["Enums"]["vehicle_status"]
          transmission: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booking_status?: Database["public"]["Enums"]["vehicle_booking_status"]
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          condition?: string | null
          contact_phone: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_by_role?: Database["public"]["Enums"]["admin_role"] | null
          description?: string | null
          direct_owner?: boolean
          engine_capacity?: string | null
          features?: string[]
          fuel_type?: string | null
          id?: string
          insurance_valid_until?: string | null
          is_deleted?: boolean
          km_driven?: number | null
          lease_amount: number
          lease_period: string
          lister_id: string
          location_id?: string | null
          model?: string | null
          name: string
          ownership_count?: number | null
          permanent_delete_at?: string | null
          published_at?: string | null
          registration_year?: number | null
          rejected_reason?: string | null
          seats?: number | null
          service_charge_percent?: number | null
          slug: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booking_status?: Database["public"]["Enums"]["vehicle_booking_status"]
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          condition?: string | null
          contact_phone?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_by_role?: Database["public"]["Enums"]["admin_role"] | null
          description?: string | null
          direct_owner?: boolean
          engine_capacity?: string | null
          features?: string[]
          fuel_type?: string | null
          id?: string
          insurance_valid_until?: string | null
          is_deleted?: boolean
          km_driven?: number | null
          lease_amount?: number
          lease_period?: string
          lister_id?: string
          location_id?: string | null
          model?: string | null
          name?: string
          ownership_count?: number | null
          permanent_delete_at?: string | null
          published_at?: string | null
          registration_year?: number | null
          rejected_reason?: string | null
          seats?: number | null
          service_charge_percent?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_logs: {
        Row: {
          country: string | null
          created_at: string
          id: number
          ip: string
          is_authenticated: boolean
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: never
          ip: string
          is_authenticated?: boolean
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: never
          ip?: string
          is_authenticated?: boolean
          path?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email_has_account: { Args: { p_email: string }; Returns: boolean }
      get_brand_vehicle_counts: {
        Args: never
        Returns: {
          brand_id: string
          vehicle_count: number
        }[]
      }
      get_category_vehicle_counts: {
        Args: never
        Returns: {
          category_id: string
          vehicle_count: number
        }[]
      }
      get_daily_listing_counts: {
        Args: { p_days?: number }
        Returns: {
          day: string
          listing_count: number
        }[]
      }
      get_daily_user_counts: {
        Args: { p_days?: number }
        Returns: {
          day: string
          user_count: number
        }[]
      }
      get_district_vehicle_counts: {
        Args: never
        Returns: {
          district_name: string
          vehicle_count: number
        }[]
      }
      get_fuel_type_distribution: {
        Args: never
        Returns: {
          fuel_type: string
          vehicle_count: number
        }[]
      }
      get_login_attack_alerts: {
        Args: { p_minutes?: number; p_threshold?: number }
        Returns: {
          attempt_count: number
          emails: string[]
          ip: string
          last_attempt_at: string
        }[]
      }
      get_popular_searches: {
        Args: { p_limit?: number }
        Returns: {
          brand_name: string
          model: string
          total_views: number
        }[]
      }
      get_transmission_distribution: {
        Args: never
        Returns: {
          transmission: string
          vehicle_count: number
        }[]
      }
      get_vehicle_status_distribution: {
        Args: never
        Returns: {
          status: Database["public"]["Enums"]["vehicle_status"]
          vehicle_count: number
        }[]
      }
      increment_vehicle_view: {
        Args: { p_vehicle_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_lister: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_audit_events_bulk: {
        Args: {
          p_action: string
          p_entity_ids: string[]
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_failed_login: {
        Args: { p_email: string; p_ip: string; p_reason: string }
        Returns: undefined
      }
      restore_vehicle: { Args: { p_vehicle_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_vehicle: {
        Args: { p_vehicle_id: string }
        Returns: undefined
      }
      soft_delete_vehicles: {
        Args: { p_vehicle_ids: string[] }
        Returns: {
          error_message: string
          success: boolean
          vehicle_id: string
        }[]
      }
    }
    Enums: {
      admin_role: "admin" | "lister"
      enquiry_status: "open" | "archived" | "closed"
      notification_type:
        | "new_enquiry"
        | "enquiry_reply"
        | "listing_approved"
        | "listing_rejected"
        | "listing_published"
        | "listing_archived"
        | "listing_sold"
        | "system"
      report_reason:
        | "spam"
        | "duplicate"
        | "fake_listing"
        | "wrong_price"
        | "already_sold"
        | "incorrect_information"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      vehicle_booking_status: "available" | "booked"
      vehicle_status:
        | "draft"
        | "pending_approval"
        | "published"
        | "rejected"
        | "archived"
        | "sold"
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
    Enums: {
      admin_role: ["admin", "lister"],
      enquiry_status: ["open", "archived", "closed"],
      notification_type: [
        "new_enquiry",
        "enquiry_reply",
        "listing_approved",
        "listing_rejected",
        "listing_published",
        "listing_archived",
        "listing_sold",
        "system",
      ],
      report_reason: [
        "spam",
        "duplicate",
        "fake_listing",
        "wrong_price",
        "already_sold",
        "incorrect_information",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      vehicle_booking_status: ["available", "booked"],
      vehicle_status: [
        "draft",
        "pending_approval",
        "published",
        "rejected",
        "archived",
        "sold",
      ],
    },
  },
} as const
