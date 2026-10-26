/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CartItem, CreditEntry, SaleItem } from '../types/database';

export interface CartCalculationResult {
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  finalTotal: number;
  estimatedCost: number;
  estimatedProfit: number;
}

/**
 * Calculates totals for a POS cart
 */
export function calculateSaleTotals(
  items: CartItem[],
  discount: number = 0
): CartCalculationResult {
  const safeDiscount = Math.max(0, isNaN(discount) ? 0 : discount);
  let subtotal = 0;
  let totalQuantity = 0;
  let estimatedCost = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity || 0);
    const unitPrice =
      item.custom_unit_price !== undefined && item.custom_unit_price >= 0
        ? item.custom_unit_price
        : item.product.selling_price;
    const costPrice = item.product.cost_price || 0;

    subtotal += unitPrice * qty;
    totalQuantity += qty;
    estimatedCost += costPrice * qty;
  }

  // Ensure 2 decimal places precision for financial accuracy
  subtotal = Math.round(subtotal * 100) / 100;
  const finalTotal = Math.max(0, Math.round((subtotal - safeDiscount) * 100) / 100);
  const estimatedProfit = Math.round((finalTotal - estimatedCost) * 100) / 100;

  return {
    itemCount: items.length,
    totalQuantity,
    subtotal,
    discount: safeDiscount,
    finalTotal,
    estimatedCost,
    estimatedProfit,
  };
}

/**
 * Calculates gross profit from historical sale items
 * Gross Profit = Total Selling Revenue - Total Cost of Goods Sold (COGS)
 */
export function calculateGrossProfit(
  items: Array<{ unit_cost: number; unit_price: number; quantity: number }>
): { revenue: number; cogs: number; grossProfit: number; marginPercentage: number } {
  let revenue = 0;
  let cogs = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const cost = Number(item.unit_cost) || 0;

    revenue += price * qty;
    cogs += cost * qty;
  }

  revenue = Math.round(revenue * 100) / 100;
  cogs = Math.round(cogs * 100) / 100;
  const grossProfit = Math.round((revenue - cogs) * 100) / 100;
  const marginPercentage = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    marginPercentage,
  };
}

/**
 * Calculates estimated net operating profit
 * Net Operating Profit = Gross Profit - Total Recorded Operating Expenses
 */
export function calculateNetProfit(
  grossProfit: number,
  totalExpenses: number
): number {
  const gp = isNaN(grossProfit) ? 0 : grossProfit;
  const exp = isNaN(totalExpenses) ? 0 : totalExpenses;
  return Math.round((gp - exp) * 100) / 100;
}

/**
 * Calculates outstanding customer balance from an append-only credit ledger
 * Balance = Total Credit entries - Total Repayment entries
 * Cannot be negative.
 */
export function calculateCustomerBalance(entries: CreditEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  let balance = 0;
  for (const entry of entries) {
    const amt = Number(entry.amount) || 0;
    if (entry.entry_type === 'credit') {
      balance += amt;
    } else if (entry.entry_type === 'repayment') {
      balance -= amt;
    }
  }

  // Round to 2 decimal places and prevent negative balance from floating point inaccuracy
  return Math.max(0, Math.round(balance * 100) / 100);
}

/**
 * Validates stock availability against requested quantity
 */
export function validateStockAvailability(
  currentStock: number,
  requestedQuantity: number
): { valid: boolean; error?: string } {
  if (requestedQuantity <= 0) {
    return { valid: false, error: 'Quantity must be at least 1 unit' };
  }
  if (currentStock < requestedQuantity) {
    return {
      valid: false,
      error: `Insufficient stock (Available: ${currentStock}, Requested: ${requestedQuantity})`,
    };
  }
  return { valid: true };
}

/**
 * Checks if stock is at or below threshold
 */
export function isLowStock(stockQuantity: number, threshold: number): boolean {
  return stockQuantity <= threshold;
}
