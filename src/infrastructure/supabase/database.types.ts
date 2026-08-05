export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      brands: Table<
        Timestamped & {
          id: string;
          name: string;
          image_public_id: string | null;
          image_secure_url: string | null;
          display_order: number;
          is_active: boolean;
        }
      >;
      categories: Table<
        Timestamped & {
          id: string;
          name: string;
          parent_id: string | null;
          image_public_id: string | null;
          image_secure_url: string | null;
          display_order: number;
          is_active: boolean;
        }
      >;
      products: Table<
        Timestamped & {
          id: string;
          name: string;
          brand_id: string;
          cover_public_id: string | null;
          cover_secure_url: string | null;
          short_description: string | null;
          search_keywords: string[] | null;
          display_order: number;
          is_active: boolean;
        }
      >;
      flavors: Table<
        Timestamped & {
          id: string;
          product_id: string;
          name: string;
          main_image_public_id: string;
          main_image_secure_url: string;
          search_keywords: string[] | null;
          display_order: number;
          is_featured: boolean;
          is_active: boolean;
        }
      >;
      inventory: Table<{
        flavor_id: string;
        current_quantity: number;
        created_at: string;
        updated_at: string;
      }>;
      inventory_adjustments: Table<{
        id: string;
        flavor_id: string;
        quantity_change: number;
        quantity_before: number;
        quantity_after: number;
        adjustment_type: string;
        reason: string | null;
        created_by: string;
        created_at: string;
        order_id: string | null;
      }>;
      orders: Table<
        Timestamped & {
          id: string;
          display_number: string;
          client_request_id: string;
          request_fingerprint: string;
          status: string;
          created_by: string;
          assigned_preparation_id: string | null;
          completed_by: string | null;
          completed_at: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
        }
      >;
      order_items: Table<{
        id: string;
        order_id: string;
        product_id: string;
        flavor_id: string;
        product_name: string;
        flavor_name: string;
        brand_name: string;
        image_public_id: string;
        image_secure_url: string;
        quantity: number;
      }>;
      product_categories: Table<{
        product_id: string;
        category_id: string;
        created_at: string;
      }>;
      profiles: Table<
        Timestamped & {
          id: string;
          display_name: string;
          role: string;
          is_active: boolean;
        }
      >;
      store_settings: Table<
        Timestamped & {
          id: boolean;
          store_name: string;
          logo_public_id: string | null;
          logo_secure_url: string | null;
          global_low_stock_threshold: number;
          customer_success_reset_seconds: number;
          store_timezone: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      apply_inventory_adjustment: {
        Args: { flavor_id: string; type: string; delta: number; reason: string };
        Returns: Json;
      };
      cancel_order: {
        Args: { order_id: string; expected_status: string; reason: string };
        Returns: Json;
      };
      complete_order: {
        Args: { order_id: string; expected_status: string };
        Returns: Json;
      };
      create_child_category: {
        Args: { parent_id: string; child_payload: Json };
        Returns: Json;
      };
      create_flavor_with_initial_stock: {
        Args: { flavor_payload: Json; initial_quantity: number };
        Returns: Json;
      };
      current_active_profile: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          display_name: string;
          role: "admin" | "preparation" | "customer";
          is_active: boolean;
        }>;
      };
      save_product_with_categories: {
        Args: { product_payload: Json; category_ids: string[] };
        Returns: Array<{
          product_id: string;
          created: boolean;
          updated_at: string;
        }>;
      };
      set_inventory_quantity: {
        Args: { flavor_id: string; final_quantity: number; reason: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
