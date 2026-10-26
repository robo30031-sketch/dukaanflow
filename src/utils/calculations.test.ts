/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  calculateSaleTotals,
  calculateGrossProfit,
  calculateNetProfit,
  calculateCustomerBalance,
  validateStockAvailability,
} from './calculations';
import { CartItem, CreditEntry } from '../types/database';

export interface TestResult {
  name: string;
  passed: boolean;
  expected?: any;
  received?: any;
  error?: string;
}

/**
 * Executes unit tests for DukaanFlow business logic
 */
export function runBusinessLogicTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, expected?: any, received?: any) {
    results.push({
      name,
      passed: condition,
      expected,
      received,
      error: condition ? undefined : `Assertion failed: expected ${expected}, got ${received}`,
    });
  }

  // 1. Sale totals calculation test
  const mockCart: CartItem[] = [
    {
      product: {
        id: 'p1',
        shop_id: 's1',
        name: 'Basmati Rice 1kg',
        category: 'Grains',
        cost_price: 90,
        selling_price: 120,
        stock_quantity: 50,
        low_stock_threshold: 10,
        unit: 'kg',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      quantity: 3,
    },
    {
      product: {
        id: 'p2',
        shop_id: 's1',
        name: 'Mustard Oil 1L',
        category: 'Oils',
        cost_price: 140,
        selling_price: 175,
        stock_quantity: 20,
        low_stock_threshold: 5,
        unit: 'bottle',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      quantity: 2,
    },
  ];

  // Subtotal = (120 * 3) + (175 * 2) = 360 + 350 = 710
  // Discount = 50 -> Final Total = 660
  // Estimated Cost = (90 * 3) + (140 * 2) = 270 + 280 = 550
  // Estimated Profit = 660 - 550 = 110
  const totalsWithDiscount = calculateSaleTotals(mockCart, 50);
  assert('Sale Totals: Subtotal calculation', totalsWithDiscount.subtotal === 710, 710, totalsWithDiscount.subtotal);
  assert('Sale Totals: Final total with discount', totalsWithDiscount.finalTotal === 660, 660, totalsWithDiscount.finalTotal);
  assert('Sale Totals: Estimated profit', totalsWithDiscount.estimatedProfit === 110, 110, totalsWithDiscount.estimatedProfit);

  // Discount exceeding subtotal shouldn't make total negative
  const totalsExcessiveDiscount = calculateSaleTotals(mockCart, 1000);
  assert('Sale Totals: Discount never produces negative total', totalsExcessiveDiscount.finalTotal === 0, 0, totalsExcessiveDiscount.finalTotal);

  // 2. Gross profit calculation test
  const mockSoldItems = [
    { unit_cost: 80, unit_price: 100, quantity: 5 }, // Rev: 500, Cost: 400, GP: 100
    { unit_cost: 20, unit_price: 30, quantity: 10 },  // Rev: 300, Cost: 200, GP: 100
  ];
  const gpResult = calculateGrossProfit(mockSoldItems);
  assert('Gross Profit: Revenue total', gpResult.revenue === 800, 800, gpResult.revenue);
  assert('Gross Profit: COGS total', gpResult.cogs === 600, 600, gpResult.cogs);
  assert('Gross Profit: Margin value', gpResult.grossProfit === 200, 200, gpResult.grossProfit);
  assert('Gross Profit: Margin percentage (200/800 = 25%)', gpResult.marginPercentage === 25, 25, gpResult.marginPercentage);

  // 3. Net profit calculation test
  const netProfitPositive = calculateNetProfit(5000, 1200);
  assert('Net Profit: Deduct operating expenses', netProfitPositive === 3800, 3800, netProfitPositive);

  const netProfitNegative = calculateNetProfit(1000, 1500);
  assert('Net Profit: Handles net operating loss', netProfitNegative === -500, -500, netProfitNegative);

  // 4. Stock validation test
  const validStock = validateStockAvailability(10, 5);
  assert('Stock Validation: Sufficient stock returns valid true', validStock.valid === true, true, validStock.valid);

  const insufficientStock = validateStockAvailability(2, 5);
  assert('Stock Validation: Overselling prevented', insufficientStock.valid === false, false, insufficientStock.valid);

  const zeroOrNegativeQuantity = validateStockAvailability(10, 0);
  assert('Stock Validation: Zero quantity rejected', zeroOrNegativeQuantity.valid === false, false, zeroOrNegativeQuantity.valid);

  // 5. Credit ledger balance calculation test
  const mockLedger: CreditEntry[] = [
    {
      id: 'c1',
      shop_id: 's1',
      customer_id: 'cust1',
      entry_type: 'credit',
      amount: 1200,
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'c2',
      shop_id: 's1',
      customer_id: 'cust1',
      entry_type: 'credit',
      amount: 800,
      created_at: '2026-10-05T10:00:00Z',
    },
    {
      id: 'c3',
      shop_id: 's1',
      customer_id: 'cust1',
      entry_type: 'repayment',
      amount: 1500,
      payment_method: 'upi',
      created_at: '2026-10-10T10:00:00Z',
    },
  ];
  // 1200 + 800 - 1500 = 500
  const balance = calculateCustomerBalance(mockLedger);
  assert('Credit Ledger: Correct balance calculation from append-only entries', balance === 500, 500, balance);

  // Repayment exceeding credit cannot result in negative balance
  const excessiveRepaymentLedger: CreditEntry[] = [
    {
      id: 'c4',
      shop_id: 's1',
      customer_id: 'cust2',
      entry_type: 'credit',
      amount: 200,
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'c5',
      shop_id: 's1',
      customer_id: 'cust2',
      entry_type: 'repayment',
      amount: 300,
      created_at: '2026-10-02T10:00:00Z',
    },
  ];
  const clampedBalance = calculateCustomerBalance(excessiveRepaymentLedger);
  assert('Credit Ledger: Balance never falls below zero', clampedBalance === 0, 0, clampedBalance);

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
