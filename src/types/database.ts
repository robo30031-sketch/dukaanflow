/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BusinessType =
  | 'kirana'
  | 'general_store'
  | 'apparel'
  | 'electronics'
  | 'pharmacy'
  | 'hardware'
  | 'stationery'
  | 'other';

export type PaymentMethod = 'cash' | 'upi' | 'credit';

export type CreditEntryType = 'credit' | 'repayment';

export type StockMovementType = 'received' | 'sold' | 'returned' | 'manual_adjustment';

export type ExpenseCategory =
  | 'rent'
  | 'electricity'
  | 'staff_wages'
  | 'transport'
  | 'packaging'
  | 'tea_snacks'
  | 'maintenance'
  | 'marketing'
  | 'other';

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  business_type: BusinessType | string;
  currency: string;
  phone?: string;
  address?: string;
  gstin?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  sku?: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed balance (derived from credit ledger)
  current_balance?: number;
}

export interface Sale {
  id: string;
  shop_id: string;
  customer_id?: string | null;
  customer_name?: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name: string;
  unit_cost: number;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface CreditEntry {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string;
  sale_id?: string | null;
  sale_invoice?: string;
  entry_type: CreditEntryType;
  amount: number;
  payment_method?: 'cash' | 'upi' | null;
  notes?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  shop_id: string;
  category: ExpenseCategory | string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'other';
  description?: string;
  expense_date: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  product_name?: string;
  change_type: StockMovementType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  custom_unit_price?: number;
}

export interface SaleTransactionInput {
  shop_id: string;
  customer_id?: string | null;
  payment_method: PaymentMethod;
  payment_reference?: string;
  discount?: number;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price?: number;
  }>;
}

export interface SaleTransactionResult {
  success: boolean;
  sale_id: string;
  invoice_number: string;
  total_amount: number;
  subtotal: number;
  discount: number;
  payment_method: PaymentMethod;
}

export interface DashboardMetrics {
  today_sales_revenue: number;
  today_gross_profit: number;
  today_recorded_expenses: number;
  today_net_operating_profit: number;
  total_outstanding_credit: number;
  low_stock_count: number;
  period_sales_revenue: number;
  period_gross_profit: number;
  period_expenses: number;
  period_net_profit: number;
}

export interface DateFilterRange {
  key: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  label: string;
  startDate: string;
  endDate: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  shop_id?: string;
}
