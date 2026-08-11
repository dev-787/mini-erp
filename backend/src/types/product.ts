export type MovementType = 'IN' | 'OUT';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  location?: string | null;
  is_low_stock?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: MovementType;
  reason: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface ProductListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  low_stock?: boolean;
}

export interface ProductPaginatedResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}
