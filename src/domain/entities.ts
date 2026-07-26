export type AppRole = "admin" | "preparation" | "customer";
export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
export type InventoryAdjustmentType =
  | "initial_stock"
  | "stock_received"
  | "manual_increase"
  | "manual_decrease"
  | "damaged_or_expired"
  | "order_deduction"
  | "order_cancellation_restoration";

export interface ActiveProfile {
  id: string;
  display_name: string;
  role: AppRole;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  image_public_id: string | null;
  image_secure_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  image_public_id: string | null;
  image_secure_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand_id: string;
  cover_public_id: string | null;
  cover_secure_url: string | null;
  short_description: string | null;
  search_keywords: string[] | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brands?: Pick<Brand, "id" | "name"> | null;
  product_categories?: Array<{
    category_id: string;
    categories?: Pick<Category, "id" | "name"> | null;
  }>;
}

export interface Flavor {
  id: string;
  product_id: string;
  name: string;
  main_image_public_id: string;
  main_image_secure_url: string;
  search_keywords: string[] | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: Pick<Product, "id" | "name"> | null;
  inventory?: { current_quantity: number; updated_at: string } | null;
}

export interface InventoryRow {
  flavor_id: string;
  current_quantity: number;
  created_at: string;
  updated_at: string;
  flavors?: Flavor & { products?: Pick<Product, "id" | "name"> | null };
}

export interface InventoryAdjustment {
  id: string;
  flavor_id: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  adjustment_type: InventoryAdjustmentType;
  reason: string | null;
  created_by: string;
  created_at: string;
  order_id: string | null;
  flavors?: Pick<Flavor, "id" | "name"> & {
    products?: Pick<Product, "id" | "name"> | null;
  };
}

export interface OrderItem {
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
}

export interface Order {
  id: string;
  display_number: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  order_items?: OrderItem[];
}

export interface StoreSettings {
  id: string;
  store_name: string;
  logo_public_id: string | null;
  logo_secure_url: string | null;
  global_low_stock_threshold: number;
  customer_success_reset_seconds: number;
  store_timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}
