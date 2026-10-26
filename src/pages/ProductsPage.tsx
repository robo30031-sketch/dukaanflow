/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shop, Product, StockMovementType } from '../types/database';
import {
  getProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  adjustStock,
  exportCsv,
} from '../services/db';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatINR, formatDate } from '../utils/formatters';
import {
  Package,
  Plus,
  Edit2,
  Archive,
  ArrowUpDown,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface ProductsPageProps {
  shop: Shop;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ shop }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formThreshold, setFormThreshold] = useState('5');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<StockMovementType>('received');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Archive Confirm
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archivingProduct, setArchivingProduct] = useState<Product | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts(shop.id, {
        includeArchived,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [shop.id, selectedCategory, includeArchived]);

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory('General');
    setFormCostPrice('');
    setFormSellingPrice('');
    setFormStock('10');
    setFormThreshold('5');
    setFormUnit('pcs');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku || '');
    setFormCategory(p.category);
    setFormCostPrice(String(p.cost_price));
    setFormSellingPrice(String(p.selling_price));
    setFormStock(String(p.stock_quantity));
    setFormThreshold(String(p.low_stock_threshold));
    setFormUnit(p.unit);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cost = Number(formCostPrice) || 0;
    const price = Number(formSellingPrice) || 0;
    const stock = Number(formStock) || 0;
    const threshold = Number(formThreshold) || 5;

    if (!formName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (cost < 0 || price < 0 || stock < 0 || threshold < 0) {
      setFormError('Prices and stock quantities cannot be negative.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(shop.id, editingProduct.id, {
          name: formName.trim(),
          sku: formSku.trim() || undefined,
          category: formCategory.trim() || 'General',
          cost_price: cost,
          selling_price: price,
          low_stock_threshold: threshold,
          unit: formUnit.trim() || 'pcs',
        });
      } else {
        await createProduct(shop.id, {
          name: formName.trim(),
          sku: formSku.trim() || undefined,
          category: formCategory.trim() || 'General',
          cost_price: cost,
          selling_price: price,
          stock_quantity: stock,
          low_stock_threshold: threshold,
          unit: formUnit.trim() || 'pcs',
        });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustType('received');
    setAdjustQuantity('');
    setAdjustNotes('');
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const qty = Number(adjustQuantity);
    if (!qty || qty <= 0) {
      setAdjustError('Please enter a valid quantity greater than zero.');
      return;
    }

    if (adjustType === 'sold' && adjustingProduct.stock_quantity < qty) {
      setAdjustError(`Cannot deduct more than available stock (${adjustingProduct.stock_quantity}).`);
      return;
    }

    setIsSaving(true);
    try {
      await adjustStock(shop.id, adjustingProduct.id, adjustType, qty, adjustNotes);
      setIsAdjustModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setAdjustError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archivingProduct) return;
    try {
      await archiveProduct(shop.id, archivingProduct.id);
      setIsArchiveConfirmOpen(false);
      setArchivingProduct(null);
      loadProducts();
    } catch (err: any) {
      console.error('Failed to archive product:', err);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Product ID',
      'Name',
      'SKU',
      'Category',
      'Cost Price (INR)',
      'Selling Price (INR)',
      'Stock Quantity',
      'Low Stock Threshold',
      'Unit',
      'Archived',
      'Created At',
    ];
    const rows = products.map((p) => [
      p.id,
      p.name,
      p.sku || '',
      p.category,
      p.cost_price,
      p.selling_price,
      p.stock_quantity,
      p.low_stock_threshold,
      p.unit,
      p.is_archived ? 'Yes' : 'No',
      p.created_at,
    ]);
    exportCsv(`${shop.name}_Inventory`, headers, rows);
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product / SKU',
      render: (p) => (
        <div>
          <span className="font-semibold text-slate-900">{p.name}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span>{p.sku || 'No SKU'}</span>
            <span>·</span>
            <span>{p.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'pricing',
      header: 'Pricing & Margin',
      align: 'right',
      render: (p) => {
        const margin = p.selling_price > 0
          ? Math.round(((p.selling_price - p.cost_price) / p.selling_price) * 100)
          : 0;
        return (
          <div className="text-right">
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {formatINR(p.selling_price)}
            </span>
            <p className="text-[10px] text-slate-400 font-mono">
              Cost: {formatINR(p.cost_price)} ({margin}% margin)
            </p>
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Current Stock',
      align: 'center',
      render: (p) => {
        const isOutOfStock = p.stock_quantity <= 0;
        const isLow = p.stock_quantity <= p.low_stock_threshold;
        return (
          <div className="text-center">
            <span
              className={`font-mono tabular-nums font-bold text-xs ${
                isOutOfStock
                  ? 'text-rose-700'
                  : isLow
                  ? 'text-amber-700'
                  : 'text-slate-800'
              }`}
            >
              {p.stock_quantity} {p.unit}
            </span>
            {isLow && (
              <span className="block text-[10px] text-amber-700 font-medium">
                Low stock (&le;{p.low_stock_threshold})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => (
        <span
          className={`text-[11px] font-medium ${
            p.is_archived ? 'text-slate-400' : 'text-emerald-700'
          }`}
        >
          {p.is_archived ? 'Archived' : 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenAdjustModal(p)}
            title="Adjust Stock"
            className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditModal(p)}
            title="Edit Product"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!p.is_archived && (
            <button
              onClick={() => {
                setArchivingProduct(p);
                setIsArchiveConfirmOpen(true);
              }}
              title="Archive Product"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Inventory & Products
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage catalog, price margins, and audit stock movements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="w-3.5 h-3.5 text-teal-800 rounded border-slate-300"
          />
          <span>Show archived products</span>
        </label>
      </div>

      {/* Main Table */}
      <DataTable
        data={products}
        columns={columns}
        keyExtractor={(p) => p.id}
        searchable={true}
        searchPlaceholder="Search by product name or SKU..."
        searchFilter={(p, q) =>
          p.name.toLowerCase().includes(q) || (p.sku ? p.sku.toLowerCase().includes(q) : false)
        }
        isLoading={isLoading}
        pageSize={12}
        emptyTitle="No products found"
        emptySubtitle="Start adding products to your store catalog."
        emptyAction={{
          label: 'Add First Product',
          onClick: handleOpenAddModal,
        }}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle="Catalog record with cost and selling price thresholds"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Aashirvaad Shudh Chakki Atta (10kg)"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / Barcode (Optional)
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. ATT-10KG"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. Grains, Dairy, Snacks"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                placeholder="410.00"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(e.target.value)}
                placeholder="460.00"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!editingProduct && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Stock Qty *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="20"
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low Stock Warning Level
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={formThreshold}
                onChange={(e) => setFormThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="pcs, kg, bottle, bag"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
            >
              {isSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Inventory Stock"
        subtitle={`Product: ${adjustingProduct?.name}`}
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          {adjustError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {adjustError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-500">Current Stock:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {adjustingProduct?.stock_quantity} {adjustingProduct?.unit}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Type
            </label>
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="received">Stock Received (Purchased from Distributor)</option>
              <option value="returned">Customer Returned</option>
              <option value="manual_adjustment">Manual Audit Adjustment (Physical Count)</option>
              <option value="sold">Stock Deduct (Damage / Loss)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity ({adjustingProduct?.unit}) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Reference Notes (Optional)
            </label>
            <input
              type="text"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="e.g. New delivery from wholesaler, Po #882"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg"
            >
              {isSaving ? 'Updating...' : 'Commit Stock Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Product"
        message={`Are you sure you want to archive "${archivingProduct?.name}"? It will be hidden from new POS sales, but historical sales invoices will retain this product snapshot.`}
        confirmLabel="Archive Product"
        isDestructive={true}
      />
    </div>
  );
};
