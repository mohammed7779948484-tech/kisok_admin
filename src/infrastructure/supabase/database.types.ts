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
      brands: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_public_id: string | null
          image_secure_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_public_id?: string | null
          image_secure_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_public_id?: string | null
          image_secure_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_public_id: string | null
          image_secure_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_public_id?: string | null
          image_secure_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_public_id?: string | null
          image_secure_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      flavors: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          main_image_public_id: string
          main_image_secure_url: string
          name: string
          product_id: string
          search_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          main_image_public_id: string
          main_image_secure_url: string
          name: string
          product_id: string
          search_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          main_image_public_id?: string
          main_image_secure_url?: string
          name?: string
          product_id?: string
          search_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flavors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          current_quantity: number
          flavor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_quantity?: number
          flavor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_quantity?: number
          flavor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: true
            referencedRelation: "flavors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["inventory_adjustment_type"]
          created_at: string
          created_by: string
          flavor_id: string
          id: string
          order_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["inventory_adjustment_type"]
          created_at?: string
          created_by: string
          flavor_id: string
          id?: string
          order_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["inventory_adjustment_type"]
          created_at?: string
          created_by?: string
          flavor_id?: string
          id?: string
          order_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          asset_id: string | null
          bytes: number | null
          created_at: string
          created_by: string | null
          format: string | null
          height: number | null
          id: string
          public_id: string
          secure_url: string
          updated_at: string
          width: number | null
        }
        Insert: {
          asset_id?: string | null
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          format?: string | null
          height?: number | null
          id?: string
          public_id: string
          secure_url: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          asset_id?: string | null
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          format?: string | null
          height?: number | null
          id?: string
          public_id?: string
          secure_url?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          brand_name: string
          flavor_id: string
          flavor_name: string
          id: string
          image_public_id: string
          image_secure_url: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
        }
        Insert: {
          brand_name: string
          flavor_id: string
          flavor_name: string
          id?: string
          image_public_id: string
          image_secure_url: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
        }
        Update: {
          brand_name?: string
          flavor_id?: string
          flavor_name?: string
          id?: string
          image_public_id?: string
          image_secure_url?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_preparation_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_request_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          display_number: string
          id: string
          request_fingerprint: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          assigned_preparation_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_request_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          display_number: string
          id?: string
          request_fingerprint: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          assigned_preparation_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_request_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          display_number?: string
          id?: string
          request_fingerprint?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_preparation_id_fkey"
            columns: ["assigned_preparation_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          cover_public_id: string | null
          cover_secure_url: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          search_keywords: string[] | null
          short_description: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          cover_public_id?: string | null
          cover_secure_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          search_keywords?: string[] | null
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          cover_public_id?: string | null
          cover_secure_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          search_keywords?: string[] | null
          short_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          created_at: string
          customer_success_reset_seconds: number
          global_low_stock_threshold: number
          id: boolean
          logo_public_id: string | null
          logo_secure_url: string | null
          store_name: string
          store_timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_success_reset_seconds?: number
          global_low_stock_threshold?: number
          id?: boolean
          logo_public_id?: string | null
          logo_secure_url?: string | null
          store_name: string
          store_timezone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_success_reset_seconds?: number
          global_low_stock_threshold?: number
          id?: boolean
          logo_public_id?: string | null
          logo_secure_url?: string | null
          store_name?: string
          store_timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_profile: {
        Args: { actor_id: string; changes: Json; target_id: string }
        Returns: {
          display_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }[]
      }
      apply_inventory_adjustment: {
        Args: {
          delta: number
          flavor_id: string
          reason: string
          type: Database["public"]["Enums"]["inventory_adjustment_type"]
        }
        Returns: Json
      }
      cancel_order: {
        Args: {
          expected_status: Database["public"]["Enums"]["order_status"]
          order_id: string
          reason: string
        }
        Returns: Json
      }
      complete_order: {
        Args: {
          expected_status: Database["public"]["Enums"]["order_status"]
          order_id: string
        }
        Returns: Json
      }
      create_child_category: {
        Args: { child_payload: Json; parent_id: string }
        Returns: {
          category_id: string
          created_at: string
          name: string
          parent_category_id: string
        }[]
      }
      create_flavor_with_initial_stock: {
        Args: { flavor_payload: Json; initial_quantity: number }
        Returns: {
          adjustment_id: string
          created_at: string
          flavor_id: string
          inventory_quantity: number
        }[]
      }
      create_order: {
        Args: {
          client_request_id: string
          items: Json
          request_fingerprint: string
        }
        Returns: Json
      }
      current_active_profile: {
        Args: never
        Returns: {
          display_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_customer_catalog_availability: {
        Args: never
        Returns: {
          flavor_id: string
          is_orderable: boolean
        }[]
      }
      get_customer_catalog_home: { Args: never; Returns: Json }
      get_customer_order_tracking: {
        Args: { display_number: string }
        Returns: Json
      }
      get_customer_product_detail: {
        Args: { product_id: string }
        Returns: Json
      }
      get_customer_store_settings: {
        Args: never
        Returns: {
          customer_success_reset_seconds: number
          logo_public_id: string
          logo_secure_url: string
          store_name: string
        }[]
      }
      get_media_asset_usage: {
        Args: { target_public_id: string }
        Returns: Json
      }
      get_preparation_store_settings: {
        Args: never
        Returns: {
          logo_public_id: string
          logo_secure_url: string
          store_name: string
          store_timezone: string
        }[]
      }
      list_customer_products: {
        Args: {
          after_display_order?: number
          after_product_id?: string
          brand_id?: string
          category_id?: string
          page_size?: number
        }
        Returns: Json
      }
      get_admin_catalog_visibility: {
        Args: never
        Returns: {
          active_flavor_count: number
          hidden_reasons: string[]
          low_stock_flavor_count: number
          orderable_flavor_count: number
          product_id: string
          product_visible: boolean
          total_flavor_count: number
        }[]
      }
      list_preparation_order_items: {
        Args: { target_order_id: string }
        Returns: {
          brand_name: string
          flavor_name: string
          image_public_id: string
          image_secure_url: string
          item_id: string
          order_id: string
          product_name: string
          quantity: number
        }[]
      }
      list_preparation_orders: {
        Args: never
        Returns: {
          assigned_preparation_id: string
          cancellation_reason: string
          cancelled_at: string
          completed_at: string
          created_at: string
          display_number: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }[]
      }
      reconcile_customer_cart: {
        Args: { items: Json }
        Returns: {
          available_quantity: number
          flavor_id: string
          flavor_name: string
          image_public_id: string
          image_secure_url: string
          is_orderable: boolean
          is_visible: boolean
          product_name: string
          requested_quantity: number
          requires_correction: boolean
        }[]
      }
      save_product_catalog: {
        Args: {
          category_ids: string[]
          flavor_payloads: Json[]
          product_payload: Json
        }
        Returns: {
          created: boolean
          product_id: string
          updated_at: string
        }[]
      }
      save_product_with_categories: {
        Args: { category_ids: string[]; product_payload: Json }
        Returns: {
          created: boolean
          product_id: string
          updated_at: string
        }[]
      }
      search_customer_catalog: {
        Args: { search_text: string }
        Returns: {
          image_public_id: string
          image_secure_url: string
          is_orderable: boolean
          name: string
          product_id: string
          relevance_rank: number
          result_id: string
          result_kind: Database["public"]["Enums"]["catalog_search_result_kind"]
          supporting_text: string
        }[]
      }
      search_customer_products: {
        Args: { result_limit?: number; search_text: string }
        Returns: {
          available_flavor_count: number
          brand_id: string
          brand_image_public_id: string
          brand_image_secure_url: string
          brand_name: string
          created_at: string
          display_order: number
          image_public_id: string
          image_secure_url: string
          is_orderable: boolean
          product_id: string
          product_name: string
          relevance_rank: number
          short_description: string
          total_flavor_count: number
        }[]
      }
      set_inventory_quantity: {
        Args: { final_quantity: number; flavor_id: string; reason: string }
        Returns: Json
      }
      set_product_active: {
        Args: { active: boolean; target_product_id: string }
        Returns: {
          is_active: boolean
          product_id: string
          updated_at: string
        }[]
      }
      transition_order: {
        Args: {
          expected_status: Database["public"]["Enums"]["order_status"]
          order_id: string
          target_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "preparation" | "customer"
      catalog_search_result_kind: "product" | "flavor" | "brand" | "category"
      inventory_adjustment_type:
        | "initial_stock"
        | "stock_received"
        | "manual_increase"
        | "manual_decrease"
        | "damaged_or_expired"
        | "order_deduction"
        | "order_cancellation_restoration"
      order_status: "new" | "preparing" | "ready" | "completed" | "cancelled"
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
      app_role: ["admin", "preparation", "customer"],
      catalog_search_result_kind: ["product", "flavor", "brand", "category"],
      inventory_adjustment_type: [
        "initial_stock",
        "stock_received",
        "manual_increase",
        "manual_decrease",
        "damaged_or_expired",
        "order_deduction",
        "order_cancellation_restoration",
      ],
      order_status: ["new", "preparing", "ready", "completed", "cancelled"],
    },
  },
} as const
