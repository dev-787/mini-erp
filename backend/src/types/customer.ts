export type CustomerType = 'Retail' | 'Wholesale' | 'Distributor';
export type CustomerStatus = 'Lead' | 'Active' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  business_name?: string | null;
  gst_number?: string | null;
  customer_type: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  follow_up_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  note: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface CustomerListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  customer_type?: CustomerType;
}

export interface CustomerPaginatedResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}
