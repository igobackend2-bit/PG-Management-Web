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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advance_ledger: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          reason: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          id?: string
          reason?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          reason?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          date: string
          id: string
          shift_in: string | null
          shift_out: string | null
          staff_id: string
          status: string
        }
        Insert: {
          date: string
          id?: string
          shift_in?: string | null
          shift_out?: string | null
          staff_id: string
          status: string
        }
        Update: {
          date?: string
          id?: string
          shift_in?: string | null
          shift_out?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          created_at: string | null
          id: string
          is_occupied: boolean | null
          label: string | null
          room_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          label?: string | null
          room_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          label?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string | null
          gender: string | null
          id: string
          is_food_available: boolean | null
          location: string | null
          name: string
          owner_id: string
          pincode: string | null
          type: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          is_food_available?: boolean | null
          location?: string | null
          name: string
          owner_id: string
          pincode?: string | null
          type?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          is_food_available?: boolean | null
          location?: string | null
          name?: string
          owner_id?: string
          pincode?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      cashbook: {
        Row: {
          amount: number
          branch_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          method: string
          type: string
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          method: string
          type: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          method?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashbook_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          expiry_date: string | null
          file_url: string | null
          id: string
          owner_id: string | null
          staff_id: string | null
          tenant_id: string | null
          type: string
          uploaded_at: string | null
        }
        Insert: {
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          owner_id?: string | null
          staff_id?: string | null
          tenant_id?: string | null
          type: string
          uploaded_at?: string | null
        }
        Update: {
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          owner_id?: string | null
          staff_id?: string | null
          tenant_id?: string | null
          type?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          is_recurring: boolean | null
          receipt_url: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          category: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          receipt_url?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          receipt_url?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      food_purchases: {
        Row: {
          bill_url: string | null
          branch_id: string
          created_at: string | null
          date: string
          id: string
          items: Json | null
          total: number
          vendor: string | null
        }
        Insert: {
          bill_url?: string | null
          branch_id: string
          created_at?: string | null
          date?: string
          id?: string
          items?: Json | null
          total: number
          vendor?: string | null
        }
        Update: {
          bill_url?: string | null
          branch_id?: string
          created_at?: string | null
          date?: string
          id?: string
          items?: Json | null
          total?: number
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          branch_id: string
          category: string
          condition: string | null
          created_at: string | null
          id: string
          last_audited: string | null
          name: string
          quantity: number | null
          room_id: string | null
        }
        Insert: {
          branch_id: string
          category: string
          condition?: string | null
          created_at?: string | null
          id?: string
          last_audited?: string | null
          name: string
          quantity?: number | null
          room_id?: string | null
        }
        Update: {
          branch_id?: string
          category?: string
          condition?: string | null
          created_at?: string | null
          id?: string
          last_audited?: string | null
          name?: string
          quantity?: number | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          file_url: string | null
          id: string
          tenant_id: string
          type: string
          uploaded_at: string | null
        }
        Insert: {
          file_url?: string | null
          id?: string
          tenant_id: string
          type: string
          uploaded_at?: string | null
        }
        Update: {
          file_url?: string | null
          id?: string
          tenant_id?: string
          type?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          interested_room_type: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          visit_date: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          interested_room_type?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          visit_date?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          interested_room_type?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_tracking: {
        Row: {
          branch_id: string
          cost: number | null
          count: number
          date: string
          id: string
          meal_type: string
        }
        Insert: {
          branch_id: string
          cost?: number | null
          count?: number
          date: string
          id?: string
          meal_type: string
        }
        Update: {
          branch_id?: string
          cost?: number | null
          count?: number
          date?: string
          id?: string
          meal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_tracking_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          custom_guest_fields: Json | null
          custom_room_fields: Json | null
          id: string
          license: string | null
          name: string
          pg_name: string
          price_per_unit: number | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          custom_guest_fields?: Json | null
          custom_room_fields?: Json | null
          id?: string
          license?: string | null
          name: string
          pg_name: string
          price_per_unit?: number | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          custom_guest_fields?: Json | null
          custom_room_fields?: Json | null
          id?: string
          license?: string | null
          name?: string
          pg_name?: string
          price_per_unit?: number | null
        }
        Relationships: []
      }
      rent_records: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_partial: boolean | null
          late_fee: number | null
          month: string
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          is_partial?: boolean | null
          late_fee?: number | null
          month: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_partial?: boolean | null
          late_fee?: number | null
          month?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          branch_id: string
          capacity: number
          created_at: string | null
          custom_data: Json | null
          eb_reading: number | null
          id: string
          number: string
          per_day_rent: number | null
          rent: number
          type: string | null
        }
        Insert: {
          branch_id: string
          capacity?: number
          created_at?: string | null
          custom_data?: Json | null
          eb_reading?: number | null
          id?: string
          number: string
          per_day_rent?: number | null
          rent?: number
          type?: string | null
        }
        Update: {
          branch_id?: string
          capacity?: number
          created_at?: string | null
          custom_data?: Json | null
          eb_reading?: number | null
          id?: string
          number?: string
          per_day_rent?: number | null
          rent?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_checklists: {
        Row: {
          branch_id: string
          checklist: Json | null
          created_at: string | null
          date: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
          shift: string
        }
        Insert: {
          branch_id: string
          checklist?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          shift: string
        }
        Update: {
          branch_id?: string
          checklist?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          shift?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_checklists_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          joined_at: string | null
          name: string
          phone: string | null
          role: string
          salary: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          joined_at?: string | null
          name: string
          phone?: string | null
          role: string
          salary?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          joined_at?: string | null
          name?: string
          phone?: string | null
          role?: string
          salary?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          advance: number | null
          advance_paid: boolean | null
          advance_returned: boolean | null
          bed_id: string | null
          branch_id: string
          company_college: string | null
          created_at: string | null
          custom_data: Json | null
          doj: string | null
          dov: string | null
          email: string | null
          id: string
          kyc_status: string | null
          name: string
          occupation: string | null
          phone: string | null
          room_id: string | null
        }
        Insert: {
          address?: string | null
          advance?: number | null
          advance_paid?: boolean | null
          advance_returned?: boolean | null
          bed_id?: string | null
          branch_id: string
          company_college?: string | null
          created_at?: string | null
          custom_data?: Json | null
          doj?: string | null
          dov?: string | null
          email?: string | null
          id?: string
          kyc_status?: string | null
          name: string
          occupation?: string | null
          phone?: string | null
          room_id?: string | null
        }
        Update: {
          address?: string | null
          advance?: number | null
          advance_paid?: boolean | null
          advance_returned?: boolean | null
          bed_id?: string | null
          branch_id?: string
          company_college?: string | null
          created_at?: string | null
          custom_data?: Json | null
          doj?: string | null
          dov?: string | null
          email?: string | null
          id?: string
          kyc_status?: string | null
          name?: string
          occupation?: string | null
          phone?: string | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          branch_id: string
          category: string
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          resolved_at: string | null
          room_id: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id: string
          category: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          resolved_at?: string | null
          room_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string
          category?: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          resolved_at?: string | null
          room_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_readings: {
        Row: {
          branch_id: string
          created_at: string | null
          eb_current: number | null
          eb_previous: number | null
          id: string
          notes: string | null
          reading_date: string
          room_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          eb_current?: number | null
          eb_previous?: number | null
          id?: string
          notes?: string | null
          reading_date?: string
          room_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          eb_current?: number | null
          eb_previous?: number | null
          id?: string
          notes?: string | null
          reading_date?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_readings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_readings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_logs: {
        Row: {
          branch_id: string
          created_at: string | null
          entry_time: string
          exit_time: string | null
          id: string
          phone: string | null
          purpose: string | null
          room_id: string | null
          visitor_name: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          entry_time?: string
          exit_time?: string | null
          id?: string
          phone?: string | null
          purpose?: string | null
          room_id?: string | null
          visitor_name: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          entry_time?: string
          exit_time?: string | null
          id?: string
          phone?: string | null
          purpose?: string | null
          room_id?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
