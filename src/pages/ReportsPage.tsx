/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shop, Sale, SaleItem, Expense, CreditEntry, Product } from '../types/database';
import {
  getSales,
  getExpenses,
  getCreditEntries,
  getProducts,
  getSaleWithItems,
  exportCsv,
} from '../services/db';
import { calculateGrossProfit, calculateNetProfit, calculateCustomerBalance } from '../utils/calculations';
import { formatINR, formatDate } from '../utils/formatters';
import { DataTable, Column } from '../components/common/DataTable';
import { ReceiptModal } from '../components/common/ReceiptModal';
import {
  BarChart3,
  Download,
  IndianRupee,
  TrendingUp,
  Receipt,
  PiggyBank,
  Wallet,
  Calendar,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportsPageProps {
  shop: Shop;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ shop }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Receipt Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [allSales, allExpenses, allCredit, allProds] = await Promise.all([
        getSales(shop.id),
        getExpenses(shop.id),
        getCreditEntries(shop.id),
        getProducts(shop.id, { includeArchived: true }),
      ]);

      setSales(allSales);
      setExpenses(allExpenses);
      setCreditEntries(allCredit);
      setProducts(allProds);

      // Load items for profit calculations
      const itemPromises = allSales.map((s) => getSaleWithItems(shop.id, s.id));
      const results = await Promise.all(itemPromises);
      const flattenedItems = results.flatMap((r) => r.items);
      setSaleItems(flattenedItems);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [shop.id]);

  // Filter by date range
  const filterDateCutoff = () => {
    const now = new Date();
    if (timeFilter === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
    if (timeFilter === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return w.toISOString();
    }
    if (timeFilter === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
    return '1970-01-01T00:00:00.000Z';
  };

  const cutoff = filterDateCutoff();

  const filteredSales = sales.filter((s) => s.created_at >= cutoff);
  const filteredSaleIdSet = new Set(filteredSales.map((s) => s.id));
  const filteredSaleItems = saleItems.filter((i) => filteredSaleIdSet.has(i.sale_id));

  const filteredExpenses = expenses.filter(
    (e) => `${e.expense_date}T00:00:00.000Z` >= cutoff.slice(0, 10) + 'T00:00:00.000Z'
  );

  const filteredRepayments = creditEntries.filter(
    (c) => c.entry_type === 'repayment' && c.created_at >= cutoff
  );

  // Financial Math Definitions (Strictly per business specification)
  // Revenue: Includes Cash, UPI, and valid Credit sales.
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);

  // COGS: Historical unit cost snapshot * quantity
  const gpResult = calculateGrossProfit(filteredSaleItems);
  const totalCOGS = gpResult.cogs;
  const grossProfit = Math.round((totalSalesRevenue - totalCOGS) * 100) / 100;
  const grossMargin = totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 1000) / 10 : 0;

  // Operating Expenses
  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Net Operating Profit = Gross Profit - Operating Expenses
  const netOperatingProfit = calculateNetProfit(grossProfit, totalOperatingExpenses);
  const netMargin = totalSalesRevenue > 0 ? Math.round((netOperatingProfit / totalSalesRevenue) * 1000) / 10 : 0;

  // Cash Flow Breakdown:
  // Direct Cash/UPI from sales (excludes unpaid credit sales from cash received!)
  const cashSalesReceived = filteredSales
    .filter((s) => s.payment_method === 'cash' || s.payment_method === 'upi')
    .reduce((acc, s) => acc + s.total_amount, 0);

  // Repayments collected (Jama)
  const customerRepaymentsCollected = filteredRepayments.reduce((acc, r) => acc + r.amount, 0);

  // Total cash collected into register
  const totalLiquidCashInflow = cashSalesReceived + customerRepaymentsCollected;

  // Total cash outflow
  const totalCashOutflow = totalOperatingExpenses;
  const netCashFlow = totalLiquidCashInflow - totalCashOutflow;

  // Outstanding Udhar
  const totalOutstandingCredit = calculateCustomerBalance(creditEntries);

  const handleOpenReceipt = async (sale: Sale) => {
    try {
      const { sale: fullSale, items } = await getSaleWithItems(shop.id, sale.id);
      setSelectedSale(fullSale);
      setSelectedItems(items);
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Failed to load sale receipt:', err);
    }
  };

  // CSV Exporters
  const exportSalesReport = () => {
    const headers = [
      'Invoice Number',
      'Date & Time',
      'Customer',
      'Payment Method',
      'Payment Ref',
      'Subtotal (INR)',
      'Discount (INR)',
      'Total Amount (INR)',
      'Notes',
    ];
    const rows = filteredSales.map((s) => [
      s.invoice_number,
      s.created_at,
      s.customer_name || 'Walk-in',
      s.payment_method,
      s.payment_reference || '',
      s.subtotal,
      s.discount,
      s.total_amount,
      s.notes || '',
    ]);
    exportCsv(`${shop.name}_Sales_Report`, headers, rows);
  };

  const exportItemizedSalesReport = () => {
    const headers = [
      'Sale ID',
      'Product Name',
      'Unit Cost (INR)',
      'Unit Selling Price (INR)',
      'Quantity',
      'Line Total (INR)',
      'Item Gross Margin (INR)',
    ];
    const rows = filteredSaleItems.map((i) => [
      i.sale_id,
      i.product_name,
      i.unit_cost,
      i.unit_price,
      i.quantity,
      i.line_total,
      Math.round((i.unit_price - i.unit_cost) * i.quantity * 100) / 100,
    ]);
    exportCsv(`${shop.name}_Itemized_Sales_Snapshot`, headers, rows);
  };

  const salesColumns: Column<Sale>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (s) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{s.invoice_number}</span>
          <p className="text-[10px] text-slate-400 font-mono">{formatDate(s.created_at, true)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (s) => (
        <span className="font-medium text-slate-700">
          {s.customer_name || 'Walk-in Customer'}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Payment',
      render: (s) => (
        <span className="capitalize font-mono text-[11px] text-slate-600">
          {s.payment_method === 'credit' ? 'Udhar (Credit)' : s.payment_method.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Bill',
      align: 'right',
      render: (s) => (
        <span className="font-mono tabular-nums font-bold text-slate-900">
          {formatINR(s.total_amount)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (s) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenReceipt(s);
          }}
          className="p-1.5 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors"
          title="Print Invoice"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Financial Reports & Profitability
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict accounting definitions: COGS from historical item snapshots, operating expenses, and cash flow reconciliation
          </p>
        </div>

        {/* Segmented Time Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              timeFilter === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              timeFilter === 'week'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              timeFilter === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              timeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Primary Financial Overview: P&L Statement Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Profit & Loss Statement */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-800" />
              <span>Profit & Loss Statement (P&L)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {timeFilter.toUpperCase()} PERIOD
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* 1. Gross Sales Revenue */}
            <div className="flex justify-between items-center py-1.5">
              <div>
                <span className="font-sans font-semibold text-slate-800 text-sm">
                  1. Total Sales Revenue
                </span>
                <p className="font-sans text-[11px] text-slate-400">
                  Gross sales across Cash, UPI, and Udhar credit
                </p>
              </div>
              <span className="font-bold text-base text-slate-900 tabular-nums">
                {formatINR(totalSalesRevenue)}
              </span>
            </div>

            {/* 2. COGS */}
            <div className="flex justify-between items-center py-1.5 text-slate-600 pl-4 border-l-2 border-slate-200">
              <div>
                <span className="font-sans font-medium text-slate-700">
                  (-) Cost of Goods Sold (COGS)
                </span>
                <p className="font-sans text-[10px] text-slate-400">
                  Calculated from unit cost snapshots at time of sale
                </p>
              </div>
              <span className="tabular-nums font-semibold text-rose-700">
                -{formatINR(totalCOGS)}
              </span>
            </div>

            {/* 3. Gross Profit */}
            <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
              <div>
                <span className="font-sans font-bold text-slate-900">
                  (=) Gross Profit
                </span>
                <span className="font-sans text-[11px] text-emerald-700 font-semibold ml-2">
                  ({grossMargin}% Gross Margin)
                </span>
              </div>
              <span className="font-bold text-sm text-emerald-800 tabular-nums">
                {formatINR(grossProfit)}
              </span>
            </div>

            {/* 4. Operating Expenses */}
            <div className="flex justify-between items-center py-1.5 text-slate-600 pl-4 border-l-2 border-slate-200">
              <div>
                <span className="font-sans font-medium text-slate-700">
                  (-) Recorded Operating Overheads
                </span>
                <p className="font-sans text-[10px] text-slate-400">
                  Rent, electricity, staff wages, freight, packaging
                </p>
              </div>
              <span className="tabular-nums font-semibold text-rose-700">
                -{formatINR(totalOperatingExpenses)}
              </span>
            </div>

            {/* 5. Net Operating Profit */}
            <div className="flex justify-between items-center pt-3 pb-2 border-t-2 border-slate-200">
              <div>
                <span className="font-sans font-bold text-slate-950 text-base">
                  (=) Estimated Net Operating Profit
                </span>
                <span
                  className={`font-sans text-xs font-semibold ml-2 ${
                    netMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  ({netMargin}% Net Margin)
                </span>
              </div>
              <span
                className={`font-bold text-xl tabular-nums ${
                  netOperatingProfit >= 0 ? 'text-teal-900' : 'text-rose-700'
                }`}
              >
                {formatINR(netOperatingProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Cash Register Reconciliation & Credit Summary */}
        <div className="lg:col-span-5 space-y-4">
          {/* Liquid Cash Flow Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-teal-700" />
                <span>Liquid Cash Reconciliation</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Cash & UPI</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Immediate Cash / UPI Sales:</span>
                <span className="tabular-nums font-semibold">{formatINR(cashSalesReceived)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span className="font-sans">+ Customer Repayments (Jama):</span>
                <span className="tabular-nums font-semibold">+{formatINR(customerRepaymentsCollected)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span className="font-sans">- Operating Overheads Paid:</span>
                <span className="tabular-nums font-semibold">-{formatINR(totalCashOutflow)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span className="font-sans">Net Cash Generation:</span>
                <span className="tabular-nums text-sm text-teal-800">{formatINR(netCashFlow)}</span>
              </div>
            </div>
          </div>

          {/* Outstanding Udhar Balance Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding Customer Credit (Udhar)
            </p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                {formatINR(totalOutstandingCredit)}
              </span>
              <span className="text-xs text-slate-400 font-sans">
                Deriving from append-only ledger
              </span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              Included in sales revenue, but excluded from cash in hand until repayment is recorded.
            </p>
          </div>

          {/* Export Actions Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>Export Accounting Reports</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportSalesReport}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors text-center"
              >
                Export Invoices (CSV)
              </button>
              <button
                onClick={exportItemizedSalesReport}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors text-center"
              >
                Export Line Items (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Sales Invoices Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Sales Invoices in Period</h3>
            <p className="text-xs text-slate-500">Click any row to view or reprint thermal tax invoice</p>
          </div>
          <button
            onClick={exportSalesReport}
            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <DataTable
          data={filteredSales}
          columns={salesColumns}
          keyExtractor={(s) => s.id}
          searchable={true}
          searchPlaceholder="Search invoice # or customer..."
          searchFilter={(s, q) =>
            s.invoice_number.toLowerCase().includes(q) ||
            (s.customer_name ? s.customer_name.toLowerCase().includes(q) : false)
          }
          pageSize={10}
          isLoading={isLoading}
          emptyTitle="No sales in selected period"
          emptySubtitle="Recorded POS transactions will appear here with itemized margins."
          onRowClick={(s) => handleOpenReceipt(s)}
        />
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={selectedSale}
        items={selectedItems}
        shop={shop}
      />
    </div>
  );
};
