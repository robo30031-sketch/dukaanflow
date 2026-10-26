/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shop, Product, Customer, CartItem, PaymentMethod, Sale, SaleItem } from '../types/database';
import { getProducts, getCustomers, createSaleTransaction, createCustomer, getSaleWithItems } from '../services/db';
import { calculateSaleTotals } from '../utils/calculations';
import { formatINR } from '../utils/formatters';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  QrCode,
  Users,
  CheckCircle,
  AlertCircle,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface POSPageProps {
  shop: Shop;
  onNavigate?: (page: any) => void;
}

export const POSPage: React.FC<POSPageProps> = ({ shop }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Customer inline modal
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Completed sale receipt state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedItems, setCompletedItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [prods, custs] = await Promise.all([
        getProducts(shop.id, { includeArchived: false }),
        getCustomers(shop.id),
      ]);
      setProducts(prods);
      setCustomers(custs);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [shop.id]);

  // Categories
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filtered products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  // Cart totals
  const cartTotals = calculateSaleTotals(cart, discount);

  const handleAddToCart = (product: Product) => {
    setErrorMessage(null);
    if (product.stock_quantity <= 0) {
      setErrorMessage(`"${product.name}" is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setErrorMessage(`Cannot exceed available stock of ${product.stock_quantity} units.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    setErrorMessage(null);
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (newQty > prod.stock_quantity) {
      setErrorMessage(`Insufficient stock. Maximum available: ${prod.stock_quantity} units.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscount(0);
    setPaymentReference('');
    setNotes('');
    setErrorMessage(null);
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    try {
      const newCust = await createCustomer(shop.id, {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      setCustomers((prev) => [...prev, newCust]);
      setSelectedCustomerId(newCust.id);
      setIsNewCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create customer');
    }
  };

  const handleCheckout = async () => {
    setErrorMessage(null);
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items to checkout.');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomerId) {
      setErrorMessage('Please select a customer for Udhar (Credit) sales.');
      return;
    }

    setIsLoading(true);
    try {
      // Execute atomic transaction
      const result = await createSaleTransaction(shop.owner_id, {
        shop_id: shop.id,
        customer_id: selectedCustomerId || null,
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        discount: discount || 0,
        notes: notes || undefined,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
        })),
      });

      // Reload product stock and customers
      await loadData();

      // Fetch completed sale for printing
      const { sale, items } = await getSaleWithItems(shop.id, result.sale_id);
      setCompletedSale(sale);
      setCompletedItems(items);
      setIsReceiptOpen(true);

      // Reset cart
      handleClearCart();
    } catch (err: any) {
      setErrorMessage(err.message || 'Transaction failed. No changes were committed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* POS Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (7 cols): PRODUCT CATALOG & FAST SEARCH
            ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar & Category filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode / Search by product name or SKU..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 focus:bg-white text-slate-800"
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-teal-800 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-700">No products match your search</p>
                <p className="text-xs text-slate-500 mt-1">Try another keyword or add new inventory.</p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock_quantity <= 0;
                const isLow = prod.stock_quantity <= prod.low_stock_threshold;
                const cartQty = cart.find((i) => i.product.id === prod.id)?.quantity || 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(prod)}
                    className={`p-3.5 text-left rounded-xl border transition-all flex flex-col justify-between min-h-[110px] relative ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : cartQty > 0
                        ? 'bg-teal-50/50 border-teal-300 shadow-xs hover:border-teal-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                          {prod.name}
                        </span>
                        {cartQty > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-800 text-white font-mono">
                            {cartQty}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {prod.sku || prod.category}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {formatINR(prod.selling_price)}
                      </span>
                      <span
                        className={`text-[10px] font-mono tabular-nums ${
                          isOutOfStock
                            ? 'text-rose-600 font-semibold'
                            : isLow
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {isOutOfStock ? 'Out of stock' : `${prod.stock_quantity} ${prod.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (5 cols): ACTIVE BILLING CART & CHECKOUT
            ========================================================================= */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Sale Bill</h3>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {cart.length} unique items · {cartTotals.totalQuantity} units
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[290px] divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <p className="text-xs font-medium text-slate-600">Cart is empty</p>
                <p className="text-[11px] text-slate-400">Click products on the left to add items to bill.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.product.name}</p>
                    <p className="text-[11px] font-mono tabular-nums text-slate-500">
                      {formatINR(item.product.selling_price)} × {item.quantity} ={' '}
                      <span className="font-semibold text-slate-800">
                        {formatINR(item.product.selling_price * item.quantity)}
                      </span>
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-xs text-slate-800 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Method Selector & Customer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/40 space-y-3.5">
            {/* Payment Method Tabs */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-teal-800 border-teal-800 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'upi'
                      ? 'bg-teal-800 border-teal-800 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'credit'
                      ? 'bg-amber-700 border-amber-700 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Udhar (Credit)</span>
                </button>
              </div>
            </div>

            {/* Customer Selector (Mandatory for credit, optional for cash/upi) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Customer {paymentMethod === 'credit' ? '(Required for Udhar)' : '(Optional)'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="text-xs font-semibold text-teal-800 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>New Customer</span>
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800 ${
                  paymentMethod === 'credit' && !selectedCustomerId
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <option value="">Walk-in Customer (General)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} — Balance: {formatINR(c.current_balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* UPI Reference (if UPI selected) */}
            {paymentMethod === 'upi' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  UPI Ref / UTR No. (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UPI-987654321"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800 font-mono"
                />
              </div>
            )}

            {/* Discount & Totals */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatINR(cartTotals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-20 text-right px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="font-mono tabular-nums text-teal-900 text-lg">
                  {formatINR(cartTotals.finalTotal)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={isLoading || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Saving Sale...' : `Charge ${formatINR(cartTotals.finalTotal)} (Complete Sale)`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inline New Customer Modal */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Quick Add Customer"
        subtitle="For Udhar credit tracking & customer receipts"
      >
        <form onSubmit={handleCreateNewCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Full Name *
            </label>
            <input
              type="text"
              required
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="e.g. Suresh Patel"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number (10 digits)
            </label>
            <input
              type="tel"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Completed Sale Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        items={completedItems}
        shop={shop}
      />
    </div>
  );
};
