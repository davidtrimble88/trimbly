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
      agreement_audit_log: {
        Row: {
          agreement_id: string
          created_at: string
          email: string | null
          esign_consent: boolean
          event: string
          id: string
          ip_address: string | null
          role: string
          signature_name: string | null
          terms_hash: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreement_id: string
          created_at?: string
          email?: string | null
          esign_consent?: boolean
          event: string
          id?: string
          ip_address?: string | null
          role: string
          signature_name?: string | null
          terms_hash?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreement_id?: string
          created_at?: string
          email?: string | null
          esign_consent?: boolean
          event?: string
          id?: string
          ip_address?: string | null
          role?: string
          signature_name?: string | null
          terms_hash?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_providers: {
        Row: {
          created_at: string
          id: string
          provider_name: string | null
          provider_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_name?: string | null
          provider_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_name?: string | null
          provider_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          audience: string
          author_id: string
          body: string
          id: string
          recipient_count: number | null
          sent_at: string
          subject: string
        }
        Insert: {
          audience: string
          author_id: string
          body: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          subject: string
        }
        Update: {
          audience?: string
          author_id?: string
          body?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          ai_attempt_count: number
          body: string
          created_at: string
          email: string
          id: string
          name: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_attempt_count?: number
          body: string
          created_at?: string
          email: string
          id?: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_attempt_count?: number
          body?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coverage_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          home_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_url: string
          home_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          home_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_documents_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_optouts: {
        Row: {
          business_name: string | null
          email: string
          id: string
          opted_out_at: string
        }
        Insert: {
          business_name?: string | null
          email: string
          id?: string
          opted_out_at?: string
        }
        Update: {
          business_name?: string | null
          email?: string
          id?: string
          opted_out_at?: string
        }
        Relationships: []
      }
      equipment_rentals: {
        Row: {
          available: boolean
          category: string
          city: string
          condition: string
          country: string
          created_at: string
          currency: string
          deposit_amount: number
          description: string
          id: string
          insurance_required: boolean
          max_rental_days: number
          min_rental_hours: number
          owner_provider_id: string
          owner_user_id: string
          photo_urls: string[]
          pickup_notes: string
          postal_code: string
          price_day: number | null
          price_hour: number | null
          price_week: number | null
          rentable_to: string
          state: string
          terms: string
          title: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          category?: string
          city?: string
          condition?: string
          country?: string
          created_at?: string
          currency?: string
          deposit_amount?: number
          description?: string
          id?: string
          insurance_required?: boolean
          max_rental_days?: number
          min_rental_hours?: number
          owner_provider_id: string
          owner_user_id: string
          photo_urls?: string[]
          pickup_notes?: string
          postal_code?: string
          price_day?: number | null
          price_hour?: number | null
          price_week?: number | null
          rentable_to?: string
          state?: string
          terms?: string
          title: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          category?: string
          city?: string
          condition?: string
          country?: string
          created_at?: string
          currency?: string
          deposit_amount?: number
          description?: string
          id?: string
          insurance_required?: boolean
          max_rental_days?: number
          min_rental_hours?: number
          owner_provider_id?: string
          owner_user_id?: string
          photo_urls?: string[]
          pickup_notes?: string
          postal_code?: string
          price_day?: number | null
          price_hour?: number | null
          price_week?: number | null
          rentable_to?: string
          state?: string
          terms?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          ai_suggestion: string | null
          component: string | null
          created_at: string
          id: string
          message: string
          metadata: Json
          resolved_at: string | null
          route: string | null
          severity: string
          source: string
          stack: string | null
          status: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ai_suggestion?: string | null
          component?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          resolved_at?: string | null
          route?: string | null
          severity?: string
          source?: string
          stack?: string | null
          status?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ai_suggestion?: string | null
          component?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          resolved_at?: string | null
          route?: string | null
          severity?: string
          source?: string
          stack?: string | null
          status?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      garage_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          plan_interval: string
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_interval?: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_interval?: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          manual_title: string | null
          manual_url: string | null
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
          manual_title?: string | null
          manual_url?: string | null
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
          manual_title?: string | null
          manual_url?: string | null
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
      home_weather_alerts: {
        Row: {
          alert_type: string
          created_at: string
          dismissed: boolean
          home_id: string
          id: string
          message: string
          valid_date: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          dismissed?: boolean
          home_id: string
          id?: string
          message: string
          valid_date: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          dismissed?: boolean
          home_id?: string
          id?: string
          message?: string
          valid_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_weather_alerts_home_id_fkey"
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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
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
      job_bids: {
        Row: {
          bid_amount: number | null
          call_approved: boolean
          created_at: string
          estimated_hours: number | null
          id: string
          job_id: string
          message: string
          phone_number: string | null
          provider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bid_amount?: number | null
          call_approved?: boolean
          created_at?: string
          estimated_hours?: number | null
          id?: string
          job_id: string
          message: string
          phone_number?: string | null
          provider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bid_amount?: number | null
          call_approved?: boolean
          created_at?: string
          estimated_hours?: number | null
          id?: string
          job_id?: string
          message?: string
          phone_number?: string | null
          provider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bids_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_bids_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "job_bids_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "job_bids_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_milestones: {
        Row: {
          amount_cents: number
          created_at: string
          funded_at: string | null
          homeowner_id: string
          id: string
          job_id: string | null
          provider_id: string
          quote_id: string | null
          refunded_at: string | null
          released_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          title: string
          transfer_group: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          funded_at?: string | null
          homeowner_id: string
          id?: string
          job_id?: string | null
          provider_id: string
          quote_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          title: string
          transfer_group?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          funded_at?: string | null
          homeowner_id?: string
          id?: string
          job_id?: string | null
          provider_id?: string
          quote_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          title?: string
          transfer_group?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_milestones_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "job_milestones_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "job_milestones_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_milestones_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string
          city: string
          country: string
          created_at: string
          description: string | null
          home_id: string | null
          homeowner_id: string
          id: string
          photo_urls: string[]
          provider_id: string | null
          state: string
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category: string
          city: string
          country?: string
          created_at?: string
          description?: string | null
          home_id?: string | null
          homeowner_id: string
          id?: string
          photo_urls?: string[]
          provider_id?: string | null
          state: string
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          home_id?: string | null
          homeowner_id?: string
          id?: string
          photo_urls?: string[]
          provider_id?: string | null
          state?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
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
          ai_meta: Json | null
          body: string
          contact_message_id: string | null
          created_at: string
          id: string
          provider_id: string | null
          read: boolean
          recipient_id: string
          rental_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          ai_meta?: Json | null
          body: string
          contact_message_id?: string | null
          created_at?: string
          id?: string
          provider_id?: string | null
          read?: boolean
          recipient_id: string
          rental_id?: string | null
          sender_id: string
          subject?: string
        }
        Update: {
          ai_meta?: Json | null
          body?: string
          contact_message_id?: string | null
          created_at?: string
          id?: string
          provider_id?: string | null
          read?: boolean
          recipient_id?: string
          rental_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_message_id_fkey"
            columns: ["contact_message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
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
      mileage_logs: {
        Row: {
          created_at: string
          end_location: string
          id: string
          job_id: string | null
          miles: number
          notes: string
          provider_id: string
          purpose: string
          rate_per_mile: number
          start_location: string
          trip_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_location?: string
          id?: string
          job_id?: string | null
          miles?: number
          notes?: string
          provider_id: string
          purpose?: string
          rate_per_mile?: number
          start_location?: string
          trip_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_location?: string
          id?: string
          job_id?: string | null
          miles?: number
          notes?: string
          provider_id?: string
          purpose?: string
          rate_per_mile?: number
          start_location?: string
          trip_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          created_at: string
          push_bid_accepted: boolean
          push_new_job: boolean
          push_new_message: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          push_bid_accepted?: boolean
          push_new_job?: boolean
          push_new_message?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          push_bid_accepted?: boolean
          push_new_job?: boolean
          push_new_message?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          provider_category: string
          provider_city: string
          provider_country: string
          provider_name: string
          provider_phone: string | null
          provider_state: string
          provider_website: string | null
          sender_id: string
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          provider_category?: string
          provider_city?: string
          provider_country?: string
          provider_name: string
          provider_phone?: string | null
          provider_state?: string
          provider_website?: string | null
          sender_id: string
          status?: string
          subject?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          provider_category?: string
          provider_city?: string
          provider_country?: string
          provider_name?: string
          provider_phone?: string | null
          provider_state?: string
          provider_website?: string | null
          sender_id?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      plan_subscriptions: {
        Row: {
          created_at: string
          homeowner_id: string
          id: string
          next_service_date: string | null
          notes: string
          plan_id: string
          provider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          homeowner_id: string
          id?: string
          next_service_date?: string | null
          notes?: string
          plan_id: string
          provider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          homeowner_id?: string
          id?: string
          next_service_date?: string | null
          notes?: string
          plan_id?: string
          provider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      profile_views: {
        Row: {
          id: string
          provider_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          gallery_urls: string[]
          id: string
          is_public: boolean
          subscription_tier: string
          suspended: boolean
          suspended_reason: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          gallery_urls?: string[]
          id: string
          is_public?: boolean
          subscription_tier?: string
          suspended?: boolean
          suspended_reason?: string | null
          updated_at?: string
          user_type?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          gallery_urls?: string[]
          id?: string
          is_public?: boolean
          subscription_tier?: string
          suspended?: boolean
          suspended_reason?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      provider_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          provider_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          provider_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          provider_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_verifications: {
        Row: {
          background_check_completed_at: string | null
          background_check_expires_at: string | null
          background_check_requested_at: string | null
          background_check_status: string
          checkr_candidate_id: string | null
          checkr_invitation_id: string | null
          checkr_report_id: string | null
          created_at: string
          id: string
          insurance_rejection_reason: string | null
          insurance_verification_status: string
          insurance_verified_at: string | null
          insurance_verified_by: string | null
          license_rejection_reason: string | null
          license_verification_status: string
          license_verified_at: string | null
          license_verified_by: string | null
          provider_id: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          verification_fee_amount_cents: number | null
          verification_fee_paid_at: string | null
          verification_fee_status: string
        }
        Insert: {
          background_check_completed_at?: string | null
          background_check_expires_at?: string | null
          background_check_requested_at?: string | null
          background_check_status?: string
          checkr_candidate_id?: string | null
          checkr_invitation_id?: string | null
          checkr_report_id?: string | null
          created_at?: string
          id?: string
          insurance_rejection_reason?: string | null
          insurance_verification_status?: string
          insurance_verified_at?: string | null
          insurance_verified_by?: string | null
          license_rejection_reason?: string | null
          license_verification_status?: string
          license_verified_at?: string | null
          license_verified_by?: string | null
          provider_id: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          verification_fee_amount_cents?: number | null
          verification_fee_paid_at?: string | null
          verification_fee_status?: string
        }
        Update: {
          background_check_completed_at?: string | null
          background_check_expires_at?: string | null
          background_check_requested_at?: string | null
          background_check_status?: string
          checkr_candidate_id?: string | null
          checkr_invitation_id?: string | null
          checkr_report_id?: string | null
          created_at?: string
          id?: string
          insurance_rejection_reason?: string | null
          insurance_verification_status?: string
          insurance_verified_at?: string | null
          insurance_verified_by?: string | null
          license_rejection_reason?: string | null
          license_verification_status?: string
          license_verified_at?: string | null
          license_verified_by?: string | null
          provider_id?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          verification_fee_amount_cents?: number | null
          verification_fee_paid_at?: string | null
          verification_fee_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_verifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_verifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_verifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          available: boolean
          bio: string | null
          business_hours: Json
          business_name: string
          category: string
          city: string
          country: string
          created_at: string
          currency: string
          description: string | null
          emergency_available: boolean
          emergency_end_time: string
          emergency_rate_multiplier: number
          emergency_start_time: string
          emergency_weekends: boolean
          featured: boolean
          gallery_urls: string[]
          hidden: boolean
          hourly_rate_max: number
          hourly_rate_min: number
          id: string
          insurance_details: string | null
          insurance_expiry: string | null
          insured: boolean
          license_expiry: string | null
          license_number: string | null
          licensed: boolean
          phone: string | null
          postal_code: string | null
          provider_type: string
          service_radius_miles: number
          show_phone_publicly: boolean
          payment_methods: string[]
          payment_handles: Json
          slug: string | null
          state: string
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean
          stripe_connect_payouts_enabled: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status: string
          subscription_tier: string
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
          years_experience: number | null
        }
        Insert: {
          available?: boolean
          bio?: string | null
          business_hours?: Json
          business_name: string
          category: string
          city: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          emergency_available?: boolean
          emergency_end_time?: string
          emergency_rate_multiplier?: number
          emergency_start_time?: string
          emergency_weekends?: boolean
          featured?: boolean
          gallery_urls?: string[]
          hidden?: boolean
          hourly_rate_max?: number
          hourly_rate_min?: number
          id?: string
          insurance_details?: string | null
          insurance_expiry?: string | null
          insured?: boolean
          license_expiry?: string | null
          license_number?: string | null
          licensed?: boolean
          phone?: string | null
          postal_code?: string | null
          provider_type?: string
          service_radius_miles?: number
          show_phone_publicly?: boolean
          payment_methods?: string[]
          payment_handles?: Json
          slug?: string | null
          state: string
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean
          stripe_connect_payouts_enabled?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          available?: boolean
          bio?: string | null
          business_hours?: Json
          business_name?: string
          category?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          emergency_available?: boolean
          emergency_end_time?: string
          emergency_rate_multiplier?: number
          emergency_start_time?: string
          emergency_weekends?: boolean
          featured?: boolean
          gallery_urls?: string[]
          hidden?: boolean
          hourly_rate_max?: number
          hourly_rate_min?: number
          id?: string
          insurance_details?: string | null
          insurance_expiry?: string | null
          insured?: boolean
          license_expiry?: string | null
          license_number?: string | null
          licensed?: boolean
          phone?: string | null
          postal_code?: string | null
          provider_type?: string
          service_radius_miles?: number
          show_phone_publicly?: boolean
          payment_methods?: string[]
          payment_handles?: Json
          slug?: string | null
          state?: string
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean
          stripe_connect_payouts_enabled?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          accepted_at: string | null
          created_at: string
          homeowner_id: string
          id: string
          job_id: string | null
          line_items: Json
          notes: string | null
          provider_id: string
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          title: string
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          homeowner_id: string
          id?: string
          job_id?: string | null
          line_items?: Json
          notes?: string | null
          provider_id: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title: string
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          homeowner_id?: string
          id?: string
          job_id?: string | null
          line_items?: Json
          notes?: string | null
          provider_id?: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          credit_months: number
          credited_at: string | null
          id: string
          referee_email: string | null
          referee_user_id: string | null
          referrer_provider_id: string
          referrer_user_id: string
          signed_up_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          credit_months?: number
          credited_at?: string | null
          id?: string
          referee_email?: string | null
          referee_user_id?: string | null
          referrer_provider_id: string
          referrer_user_id: string
          signed_up_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          credit_months?: number
          credited_at?: string | null
          id?: string
          referee_email?: string | null
          referee_user_id?: string | null
          referrer_provider_id?: string
          referrer_user_id?: string
          signed_up_at?: string | null
          status?: string
        }
        Relationships: []
      }
      rental_agreements: {
        Row: {
          created_at: string
          currency: string
          deposit: number
          end_date: string
          id: string
          insurance_acknowledged: boolean
          owner_esign_consent: boolean
          owner_provider_id: string | null
          owner_signature: string | null
          owner_signed_at: string | null
          owner_user_id: string
          quantity: number
          rate_amount: number
          rate_basis: string
          rental_id: string
          renter_esign_consent: boolean
          renter_provider_id: string | null
          renter_signature: string | null
          renter_signed_at: string | null
          renter_user_id: string
          start_date: string
          status: string
          subtotal: number
          terms_hash: string | null
          terms_snapshot: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deposit?: number
          end_date: string
          id?: string
          insurance_acknowledged?: boolean
          owner_esign_consent?: boolean
          owner_provider_id?: string | null
          owner_signature?: string | null
          owner_signed_at?: string | null
          owner_user_id: string
          quantity?: number
          rate_amount?: number
          rate_basis?: string
          rental_id: string
          renter_esign_consent?: boolean
          renter_provider_id?: string | null
          renter_signature?: string | null
          renter_signed_at?: string | null
          renter_user_id: string
          start_date: string
          status?: string
          subtotal?: number
          terms_hash?: string | null
          terms_snapshot?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deposit?: number
          end_date?: string
          id?: string
          insurance_acknowledged?: boolean
          owner_esign_consent?: boolean
          owner_provider_id?: string | null
          owner_signature?: string | null
          owner_signed_at?: string | null
          owner_user_id?: string
          quantity?: number
          rate_amount?: number
          rate_basis?: string
          rental_id?: string
          renter_esign_consent?: boolean
          renter_provider_id?: string | null
          renter_signature?: string | null
          renter_signed_at?: string | null
          renter_user_id?: string
          start_date?: string
          status?: string
          subtotal?: number
          terms_hash?: string | null
          terms_snapshot?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          channel: string
          completed_at: string | null
          homeowner_id: string
          id: string
          job_id: string | null
          provider_id: string
          sent_at: string
          status: string
        }
        Insert: {
          channel?: string
          completed_at?: string | null
          homeowner_id: string
          id?: string
          job_id?: string | null
          provider_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          channel?: string
          completed_at?: string | null
          homeowner_id?: string
          id?: string
          job_id?: string | null
          provider_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          flagged: boolean
          flagged_reason: string | null
          hidden: boolean
          id: string
          provider_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          flagged_reason?: string | null
          hidden?: boolean
          id?: string
          provider_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          flagged_reason?: string | null
          hidden?: boolean
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
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
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
      saved_providers: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          category: string | null
          created_at: string
          id: string
          location: string | null
          metadata: Json
          query: string
          results_count: number | null
          search_type: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          metadata?: Json
          query?: string
          results_count?: number | null
          search_type?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          metadata?: Json
          query?: string
          results_count?: number | null
          search_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          active: boolean
          category: string
          created_at: string
          currency: string
          description: string
          frequency: string
          id: string
          name: string
          price: number
          provider_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          currency?: string
          description?: string
          frequency?: string
          id?: string
          name: string
          price?: number
          provider_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          currency?: string
          description?: string
          frequency?: string
          id?: string
          name?: string
          price?: number
          provider_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_activity_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      staff_notes: {
        Row: {
          author_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          note: string
        }
        Insert: {
          author_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string
        }
        Relationships: []
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
      vehicle_coverage_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          policy_number: string | null
          provider_name: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          policy_number?: string | null
          provider_name?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          policy_number?: string | null
          provider_name?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_coverage_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string
          doc_type: string
          expires_on: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          owner_user_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          expires_on?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          owner_user_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          expires_on?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          owner_user_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_logs: {
        Row: {
          cost: number | null
          created_at: string
          full_tank: boolean
          id: string
          logged_at: string
          mileage: number
          notes: string | null
          owner_user_id: string
          station: string | null
          updated_at: string
          vehicle_id: string
          volume: number
        }
        Insert: {
          cost?: number | null
          created_at?: string
          full_tank?: boolean
          id?: string
          logged_at?: string
          mileage: number
          notes?: string | null
          owner_user_id: string
          station?: string | null
          updated_at?: string
          vehicle_id: string
          volume: number
        }
        Update: {
          cost?: number | null
          created_at?: string
          full_tank?: boolean
          id?: string
          logged_at?: string
          mileage?: number
          notes?: string | null
          owner_user_id?: string
          station?: string | null
          updated_at?: string
          vehicle_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspection_items: {
        Row: {
          category: string
          condition: string
          cost_estimate: number | null
          created_at: string
          id: string
          inspection_id: string
          item_name: string
          notes: string | null
          photo_url: string | null
          sort_order: number
        }
        Insert: {
          category?: string
          condition?: string
          cost_estimate?: number | null
          created_at?: string
          id?: string
          inspection_id: string
          item_name: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number
        }
        Update: {
          category?: string
          condition?: string
          cost_estimate?: number | null
          created_at?: string
          id?: string
          inspection_id?: string
          item_name?: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          provider_id: string
          sent_at: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          vehicle_id: string
          vehicle_job_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          provider_id: string
          sent_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          vehicle_id: string
          vehicle_job_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          provider_id?: string
          sent_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "vehicle_inspections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "vehicle_inspections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_job_id_fkey"
            columns: ["vehicle_job_id"]
            isOneToOne: false
            referencedRelation: "vehicle_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_job_bids: {
        Row: {
          bid_amount: number | null
          call_approved: boolean
          created_at: string
          estimated_hours: number | null
          id: string
          message: string
          phone_number: string | null
          provider_id: string
          status: string
          updated_at: string
          vehicle_job_id: string
        }
        Insert: {
          bid_amount?: number | null
          call_approved?: boolean
          created_at?: string
          estimated_hours?: number | null
          id?: string
          message: string
          phone_number?: string | null
          provider_id: string
          status?: string
          updated_at?: string
          vehicle_job_id: string
        }
        Update: {
          bid_amount?: number | null
          call_approved?: boolean
          created_at?: string
          estimated_hours?: number | null
          id?: string
          message?: string
          phone_number?: string | null
          provider_id?: string
          status?: string
          updated_at?: string
          vehicle_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_job_bids_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_response_times"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "vehicle_job_bids_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_stats"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "vehicle_job_bids_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_job_bids_vehicle_job_id_fkey"
            columns: ["vehicle_job_id"]
            isOneToOne: false
            referencedRelation: "vehicle_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          mobile_service: boolean
          owner_user_id: string
          photo_urls: string[] | null
          service_type: string
          state: string
          status: string
          title: string
          updated_at: string
          vehicle_id: string | null
          video_url: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category: string
          city: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          mobile_service?: boolean
          owner_user_id: string
          photo_urls?: string[] | null
          service_type?: string
          state: string
          status?: string
          title: string
          updated_at?: string
          vehicle_id?: string | null
          video_url?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          mobile_service?: boolean
          owner_user_id?: string
          photo_urls?: string[] | null
          service_type?: string
          state?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance_tasks: {
        Row: {
          category: string | null
          created_at: string
          id: string
          interval_miles: number | null
          interval_months: number | null
          last_done_date: string | null
          last_done_mileage: number | null
          next_due_date: string | null
          next_due_mileage: number | null
          notes: string | null
          owner_user_id: string
          status: string
          task_name: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          interval_miles?: number | null
          interval_months?: number | null
          last_done_date?: string | null
          last_done_mileage?: number | null
          next_due_date?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          owner_user_id: string
          status?: string
          task_name: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          interval_miles?: number | null
          interval_months?: number | null
          last_done_date?: string | null
          last_done_mileage?: number | null
          next_due_date?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          owner_user_id?: string
          status?: string
          task_name?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          mileage: number
          owner_user_id: string
          source: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          mileage: number
          owner_user_id: string
          source?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          mileage?: number
          owner_user_id?: string
          source?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_service_records: {
        Row: {
          cost: number | null
          created_at: string
          currency: string
          description: string
          id: string
          mileage: number | null
          notes: string | null
          owner_user_id: string
          provider_id: string | null
          receipt_url: string | null
          service_date: string
          service_type: string
          shop_name: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          mileage?: number | null
          notes?: string | null
          owner_user_id: string
          provider_id?: string | null
          receipt_url?: string | null
          service_date?: string
          service_type?: string
          shop_name?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          mileage?: number | null
          notes?: string | null
          owner_user_id?: string
          provider_id?: string | null
          receipt_url?: string | null
          service_date?: string
          service_type?: string
          shop_name?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_service_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          current_mileage: number
          fuel_type: string | null
          id: string
          license_plate: string | null
          make: string
          mileage_unit: string
          model: string
          nickname: string
          notes: string | null
          owner_user_id: string
          photo_url: string | null
          purchase_date: string | null
          trim: string | null
          updated_at: string
          vehicle_type: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_mileage?: number
          fuel_type?: string | null
          id?: string
          license_plate?: string | null
          make?: string
          mileage_unit?: string
          model?: string
          nickname?: string
          notes?: string | null
          owner_user_id: string
          photo_url?: string | null
          purchase_date?: string | null
          trim?: string | null
          updated_at?: string
          vehicle_type?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          current_mileage?: number
          fuel_type?: string | null
          id?: string
          license_plate?: string | null
          make?: string
          mileage_unit?: string
          model?: string
          nickname?: string
          notes?: string | null
          owner_user_id?: string
          photo_url?: string | null
          purchase_date?: string | null
          trim?: string | null
          updated_at?: string
          vehicle_type?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      provider_response_times: {
        Row: {
          avg_reply_minutes: number | null
          provider_id: string | null
          sample_size: number | null
        }
        Relationships: []
      }
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
      has_garage_addon: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mechanic_bids_this_month: {
        Args: { _provider_id: string }
        Returns: number
      }
      pro_active_bids_this_month: {
        Args: { _provider_id: string }
        Returns: number
      }
      update_provider_trusted: {
        Args: {
          p_provider_id: string
          p_stripe_customer_id?: string
          p_stripe_subscription_id?: string
          p_subscription_current_period_end?: string
          p_subscription_status?: string
          p_subscription_tier?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "support" | "analyst"
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
      app_role: ["admin", "moderator", "user", "support", "analyst"],
    },
  },
} as const
