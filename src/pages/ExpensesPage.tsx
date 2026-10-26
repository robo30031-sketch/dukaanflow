/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shop, Expense, ExpenseCategory } from '../types/database';
import { getExpenses, createExpense, deleteExpense, exportCsv } from '../services/db';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatINR, formatDate } from '../utils/formatters';
import { Receipt, Plus, Trash2, Download, Calendar, Tag } from 'lucide-react';

interface ExpensesPageProps {
  shop: Shop;
}

const CATEGORIES: Array<{ key: ExpenseCategory; label: string }> = [
  { key: 'rent', label: 'Shop Rent' },
  { key: 'electricity', label: 'Electricity & Utilities' },
  { key: 'staff_wages', label: 'Staff Wages / Salary' },
  { key: 'transport', label: 'Inventory Freight & Transport' },
  { key: 'packaging', label: 'Packaging & Bags' },
  { key: 'tea_snacks', label: 'Tea & Refreshments' },
  { key: 'maintenance', label: 'Shop Maintenance & Repairs' },
  { key: 'other', label: 'Miscellaneous' },
];

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ shop }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Add Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [addError, setAddError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirm
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await getExpenses(shop.id, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [shop.id, selectedCategory]);

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setAddError('Expense amount must be greater than zero.');
      return;
    }
    setIsSaving(true);
    setAddError(null);
    try {
      await createExpense(shop.id, {
        category,
        amount: amt,
        payment_method: paymentMethod,
        description: description.trim() || undefined,
        expense_date: expenseDate,
      });
      setIsAddModalOpen(false);
      setAmount('');
      setDescription('');
      loadExpenses();
    } catch (err: any) {
      setAddError(err.message || 'Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense(shop.id, deletingExpense.id);
      setIsDeleteConfirmOpen(false);
      setDeletingExpense(null);
      loadExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Expense ID', 'Date', 'Category', 'Description', 'Amount (INR)', 'Payment Method'];
    const rows = expenses.map((e) => [
      e.id,
      e.expense_date,
      e.category,
      e.description || '',
      e.amount,
      e.payment_method,
    ]);
    exportCsv(`${shop.name}_Expenses`, headers, rows);
  };

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (e) => (
        <span className="font-mono text-slate-700">{formatDate(e.expense_date)}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category & Details',
      render: (e) => {
        const catObj = CATEGORIES.find((c) => c.key === e.category);
        return (
          <div>
            <span className="font-semibold text-slate-900">{catObj?.label || e.category}</span>
            {e.description && (
              <p className="text-[11px] text-slate-500 mt-0.5">{e.description}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'payment_method',
      header: 'Payment Mode',
      render: (e) => (
        <span className="capitalize text-slate-600 font-mono text-[11px]">
          {e.payment_method}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (e) => (
        <span className="font-mono tabular-nums font-bold text-slate-900">
          {formatINR(e.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <button
          onClick={() => {
            setDeletingExpense(e);
            setIsDeleteConfirmOpen(true);
          }}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          title="Delete Expense"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Daily Operating Expenses
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track rent, staff wages, freight, and overheads for accurate net profit
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
            onClick={() => {
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Recorded Expenses</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {formatINR(totalExpenseAmount)}
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <DataTable
        data={expenses}
        columns={columns}
        keyExtractor={(e) => e.id}
        searchable={true}
        searchPlaceholder="Search description..."
        searchFilter={(e, q) =>
          (e.description ? e.description.toLowerCase().includes(q) : false) ||
          e.category.toLowerCase().includes(q)
        }
        isLoading={isLoading}
        emptyTitle="No expenses recorded"
        emptySubtitle="Track your store's overheads to see accurate net operating profits."
        emptyAction={{
          label: 'Log First Expense',
          onClick: () => setIsAddModalOpen(true),
        }}
      />

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Operating Expense"
        subtitle="Business overhead cost deducted from gross profit"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {addError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {addError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="cash">Cash from Register</option>
              <option value="upi">UPI / Bank Account</option>
              <option value="card">Debit / Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Memo (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electricity bill for October, paid to BESCOM"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Entry"
        message="Are you sure you want to remove this expense? It will recalculate operating net profits."
        confirmLabel="Delete Expense"
        isDestructive={true}
      />
    </div>
  );
};
