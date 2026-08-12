export type ChallanStatus = 'Draft' | 'Confirmed' | 'Cancelled';

export interface ChallanItem {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_sku_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  created_at: string;
}

export interface Challan {
  id: string;
  challan_number: string;
  customer_id: string;
  customer_name?: string;
  status: ChallanStatus;
  total_quantity: number;
  total_amount?: number;
  created_by: string;
  created_by_name?: string;
  confirmed_by?: string | null;
  confirmed_by_name?: string | null;
  confirmed_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_name?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  items?: ChallanItem[];
}

export interface ChallanListQueryParams {
  page?: number;
  limit?: number;
  status?: ChallanStatus;
  customer_id?: string;
  search?: string;
}

export interface ChallanPaginatedResponse {
  data: Challan[];
  total: number;
  page: number;
  limit: number;
}

export interface ChallanItemInput {
  product_id: string;
  quantity: number;
}

export interface ChallanCreateInput {
  customer_id: string;
  items: ChallanItemInput[];
}

export interface StockShortage {
  product_id: string;
  product: string;
  requested: number;
  available: number;
}
