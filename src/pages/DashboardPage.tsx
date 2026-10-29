/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shop, DashboardMetrics, Sale, Product, SaleItem, AppUser } from '../types/database';
import { getDashboardMetrics, getSales, getProducts, getSaleWithItems } from '../services/db';
import { MetricCard } from '../components/common/MetricCard';
import { DataTable, Column } from '../components/common/DataTable';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { formatINR, formatDate } from '../utils/formatters';
import { useTranslation } from '../context/LanguageContext';
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  PiggyBank,
  Users,
  AlertTriangle,
  ShoppingCart,
  Calendar,
  Printer,
  PackagePlus,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardPageProps {
  shop: Shop;
  user?: AppUser | null;
  onNavigate: (page: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ shop, user, onNavigate }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  // Receipt modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const getDateRange = (filter: string) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (filter === 'today') {
      return {
        startDate: `${todayStr}T00:00:00.000Z`,
        endDate: `${todayStr}T23:59:59.999Z`,
      };
    }
    if (filter === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      return {
        startDate: `${yStr}T00:00:00.000Z`,
        endDate: `${yStr}T23:59:59.999Z`,
      };
    }
    if (filter === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return {
        startDate: w.toISOString(),
        endDate: now.toISOString(),
      };
    }
    // month
    const m = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: m.toISOString(),
      endDate: now.toISOString(),
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const range = getDateRange(dateFilter);
      const [metricsData, salesData, prodsData] = await Promise.all([
        getDashboardMetrics(shop.id, range),
        getSales(shop.id, { limit: 6 }),
        getProducts(shop.id, { lowStockOnly: true, includeArchived: false }),
      ]);
      setMetrics(metricsData);
      setRecentSales(salesData);
      setLowStockProducts(prodsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shop.id, dateFilter]);

  const handleOpenReceipt = async (sale: Sale) => {
    try {
      const { sale: fullSale, items } = await getSaleWithItems(shop.id, sale.id);
      setSelectedSale(fullSale);
      setSelectedItems(items);
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Failed to load sale details:', err);
    }
  };

  const salesColumns: Column<Sale>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (s) => (
        <div>
          <span className="font-mono font-medium text-slate-800">{s.invoice_number}</span>
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
      key: 'payment_method',
      header: 'Payment',
      render: (s) => (
        <span className="capitalize font-mono text-[11px] text-slate-600">
          {s.payment_method === 'credit' ? 'Udhar (Credit)' : s.payment_method.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      render: (s) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatINR(s.total_amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenReceipt(s);
          }}
          className="p-1.5 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors"
          title="Print Receipt"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  const lowStockColumns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product Name',
      render: (p) => (
        <div>
          <span className="font-medium text-slate-800">{p.name}</span>
          <p className="text-[10px] text-slate-400">SKU: {p.sku || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Current Stock',
      align: 'center',
      render: (p) => (
        <span className="font-mono tabular-nums font-bold text-amber-700">
          {p.stock_quantity} {p.unit}
        </span>
      ),
    },
    {
      key: 'threshold',
      header: 'Min Threshold',
      align: 'center',
      render: (p) => (
        <span className="font-mono tabular-nums text-slate-500">
          {p.low_stock_threshold} {p.unit}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: () => (
        <button
          onClick={() => onNavigate('products')}
          className="text-xs font-semibold text-teal-800 hover:underline flex items-center gap-1 justify-end"
        >
          <span>Restock</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Namaste Greeting & Shop Owner Header */}
      <div className="bg-gradient-to-r from-[#123C2A]/10 via-[#2E9D58]/5 to-transparent dark:from-[#123C2A]/40 dark:via-[#2E9D58]/20 p-4 sm:p-5 rounded-2xl border border-[#2E9D58]/25 dark:border-[#2E9D58]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D8F3C5] dark:bg-[#1B4B36] border border-[#2E9D58]/30 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            🙏
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#123C2A] dark:text-white">
                Namaste, {user?.name || 'Owner'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D8F3C5] dark:bg-[#1B4B36] text-[#123C2A] dark:text-[#D8F3C5] border border-[#2E9D58]/30">
                Verified Owner
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/80 dark:bg-[#12281E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E4433]">
                Every Sale. Every Stock. Every Rupee.
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Welcome back to <span className="font-semibold text-[#123C2A] dark:text-[#52D284]">{shop.name}</span>. Here is your shop’s live performance and sales pulse.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2E9D58] hover:bg-[#258349] rounded-xl transition-colors shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t('new_sale')}</span>
          </button>
        </div>
      </div>

      {/* Top Banner & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {shop.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial performance and inventory telemetry
          </p>
        </div>

        {/* Date Filter Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('today')}
          </button>
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'yesterday'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('yesterday')}
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'week'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('last_7_days')}
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('this_month')}
          </button>
        </div>
      </div>

      {/* 6 Primary KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title={t('today_sales')}
          value={formatINR(metrics?.today_sales_revenue)}
          subtitle={dateFilter !== 'today' ? `Period: ${formatINR(metrics?.period_sales_revenue)}` : undefined}
          icon={IndianRupee}
          variant="default"
          action={{
            label: 'Start Sale',
            onClick: () => onNavigate('pos'),
          }}
        />

        <MetricCard
          title={t('gross_profit')}
          value={formatINR(metrics?.today_gross_profit)}
          subtitle="Revenue minus item cost snapshots"
          icon={TrendingUp}
          variant="success"
        />

        <MetricCard
          title={t('expenses')}
          value={formatINR(metrics?.today_recorded_expenses)}
          subtitle={dateFilter !== 'today' ? `Period: ${formatINR(metrics?.period_expenses)}` : 'Today operating overhead'}
          icon={Receipt}
          variant="default"
          action={{
            label: 'Log Expense',
            onClick: () => onNavigate('expenses'),
          }}
        />

        <MetricCard
          title={t('net_profit')}
          value={formatINR(metrics?.today_net_operating_profit)}
          subtitle="Gross profit minus expenses"
          icon={PiggyBank}
          variant={
            (metrics?.today_net_operating_profit ?? 0) >= 0 ? 'success' : 'danger'
          }
        />

        <MetricCard
          title={t('outstanding_credit')}
          value={formatINR(metrics?.total_outstanding_credit)}
          subtitle="Total Udhar balance across ledger"
          icon={Users}
          variant={
            (metrics?.total_outstanding_credit ?? 0) > 0 ? 'warning' : 'default'
          }
          action={{
            label: 'View Khata',
            onClick: () => onNavigate('customers'),
          }}
        />

        <MetricCard
          title={t('low_stock_alerts')}
          value={String(metrics?.low_stock_count ?? 0)}
          subtitle="Items at or below reorder threshold"
          icon={AlertTriangle}
          variant={(metrics?.low_stock_count ?? 0) > 0 ? 'warning' : 'default'}
          action={{
            label: 'Manage Stock',
            onClick: () => onNavigate('products'),
          }}
        />
      </div>

      {/* Dual Column Content: Recent Sales & Low Stock List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent Sales Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Sales Invoices</h3>
              <p className="text-xs text-slate-500">Atomic transactions saved to database</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-teal-800 hover:underline"
            >
              All Invoices &rarr;
            </button>
          </div>

          <DataTable
            data={recentSales}
            columns={salesColumns}
            keyExtractor={(s) => s.id}
            searchable={false}
            pageSize={5}
            isLoading={isLoading}
            emptyTitle="No sales recorded yet"
            emptySubtitle="Start your first point-of-sale checkout to see invoices here."
            emptyAction={{
              label: 'Open POS Billing',
              onClick: () => onNavigate('pos'),
            }}
            onRowClick={(s) => handleOpenReceipt(s)}
          />
        </div>

        {/* Low Stock Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Low Stock Warning</h3>
              <p className="text-xs text-slate-500">Products requiring restock soon</p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-teal-800 hover:underline"
            >
              All Inventory &rarr;
            </button>
          </div>

          <DataTable
            data={lowStockProducts}
            columns={lowStockColumns}
            keyExtractor={(p) => p.id}
            searchable={false}
            pageSize={5}
            isLoading={isLoading}
            emptyTitle="All products adequately stocked"
            emptySubtitle="No inventory items are currently below their minimum threshold."
          />
        </div>
      </div>

      {/* Receipt Modal for viewing/reprinting */}
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
