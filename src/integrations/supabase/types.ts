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
      home_binder_items: {
        Row: {
          brand: string | null
          cost: number | null
          created_at: string
          document_name: string | null
          document_url: string | null
          home_id: string
          id: string
          item_type: string
          location_in_home: string | null
          model_number: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          updated_at: string
          user_id: string
          warranty_expiry: string | null
        }
        Insert: {
          brand?: string | null
          cost?: number | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          home_id: string
          id?: string
          item_type?: string
          location_in_home?: string | null
          model_number?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          updated_at?: string
          user_id: string
          warranty_expiry?: string | null
        }
        Update: {
          brand?: string | null
          cost?: number | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          home_id?: string
          id?: string
          item_type?: string
          location_in_home?: string | null
          model_number?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          updated_at?: string
          user_id?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_binder_items_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      homes: {
        Row: {
          city: string
          country: string
          created_at: string
          has_pool: boolean
          has_septic: boolean
          has_well_water: boolean
          home_type: string
          hvac_type: string | null
          id: string
          name: string
          notes: string | null
          roof_type: string | null
          square_feet: number | null
          state: string
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          city?: string
          country?: string
          created_at?: string
          has_pool?: boolean
          has_septic?: boolean
          has_well_water?: boolean
          home_type?: string
          hvac_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          roof_type?: string | null
          square_feet?: number | null
          state?: string
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          has_pool?: boolean
          has_septic?: boolean
          has_well_water?: boolean
          home_type?: string
          hvac_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          roof_type?: string | null
          square_feet?: number | null
          state?: string
          updated_at?: string
          user_id?: string
          year_built?: number | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          category: string
          city: string
          country: string
          created_at: string
          description: string | null
          homeowner_id: string
          id: string
          provider_id: string | null
          state: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          city: string
          country?: string
          created_at?: string
          description?: string | null
          homeowner_id: string
          id?: string
          provider_id?: string | null
          state: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          homeowner_id?: string
          id?: string
          provider_id?: string | null
          state?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "jobs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          home_id: string
          id: string
          priority: string
          products_search_term: string | null
          recurrence_months: number | null
          season: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          home_id: string
          id?: string
          priority?: string
          products_search_term?: string | null
          recurrence_months?: number | null
          season?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          home_id?: string
          id?: string
          priority?: string
          products_search_term?: string | null
          recurrence_months?: number | null
          season?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          provider_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          provider_id?: string | null
          read?: boolean
          recipient_id: string
          sender_id: string
          subject?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          provider_id?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_preferences: {
        Row: {
          created_at: string
          id: string
          preference_key: string
          preference_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_key: string
          preference_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_key?: string
          preference_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          subscription_tier: string
          updated_at: string
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          subscription_tier?: string
          updated_at?: string
          user_type?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          subscription_tier?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          available: boolean
          business_name: string
          category: string
          city: string
          country: string
          created_at: string
          currency: string
          description: string | null
          hourly_rate_max: number
          hourly_rate_min: number
          id: string
          insurance_details: string | null
          insured: boolean
          license_number: string | null
          licensed: boolean
          phone: string | null
          state: string
          subscription_tier: string
          updated_at: string
          user_id: string
          website: string | null
          years_experience: number | null
        }
        Insert: {
          available?: boolean
          business_name: string
          category: string
          city: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          hourly_rate_max?: number
          hourly_rate_min?: number
          id?: string
          insurance_details?: string | null
          insured?: boolean
          license_number?: string | null
          licensed?: boolean
          phone?: string | null
          state: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          available?: boolean
          business_name?: string
          category?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          hourly_rate_max?: number
          hourly_rate_min?: number
          id?: string
          insurance_details?: string | null
          insured?: boolean
          license_number?: string | null
          licensed?: boolean
          phone?: string | null
          state?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      provider_stats: {
        Row: {
          avg_rating: number | null
          provider_id: string | null
          review_count: number | null
          subscription_tier: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
