/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shop, Customer, CreditEntry } from '../types/database';
import {
  getCustomers,
  createCustomer,
  getCreditEntries,
  recordCreditRepayment,
  exportCsv,
} from '../services/db';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { formatINR, formatDate } from '../utils/formatters';
import {
  Users,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Phone,
  BookOpen,
  CheckCircle2,
  Clock,
  History,
} from 'lucide-react';

interface CustomersPageProps {
  shop: Shop;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ shop }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLedger, setCustomerLedger] = useState<CreditEntry[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Repayment Modal
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'upi'>('cash');
  const [repayNotes, setRepayNotes] = useState('');
  const [repayError, setRepayError] = useState<string | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomers(shop.id);
      setCustomers(data);
      if (selectedCustomer) {
        const updated = data.find((c) => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [shop.id]);

  const loadCustomerLedger = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsLedgerLoading(true);
    try {
      const entries = await getCreditEntries(shop.id, customer.id);
      setCustomerLedger(entries);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      setAddError('Customer name is required.');
      return;
    }
    setAddError(null);
    try {
      const newCust = await createCustomer(shop.id, {
        name: custName.trim(),
        phone: custPhone.trim() || undefined,
        address: custAddress.trim() || undefined,
        notes: custNotes.trim() || undefined,
      });
      setIsAddModalOpen(false);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustNotes('');
      await loadCustomers();
      loadCustomerLedger(newCust);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create customer');
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = Number(repayAmount);
    const balance = selectedCustomer.current_balance || 0;

    if (!amount || amount <= 0) {
      setRepayError('Repayment amount must be greater than zero.');
      return;
    }
    if (amount > balance) {
      setRepayError(`Amount (₹${amount}) cannot exceed current outstanding balance (₹${balance}).`);
      return;
    }

    setIsRepaying(true);
    setRepayError(null);
    try {
      await recordCreditRepayment(
        shop.owner_id,
        shop.id,
        selectedCustomer.id,
        amount,
        repayMethod,
        repayNotes
      );
      setIsRepaymentModalOpen(false);
      setRepayAmount('');
      setRepayNotes('');
      await loadCustomers();
      // Reload this customer's ledger
      const entries = await getCreditEntries(shop.id, selectedCustomer.id);
      setCustomerLedger(entries);
    } catch (err: any) {
      setRepayError(err.message || 'Failed to record repayment.');
    } finally {
      setIsRepaying(false);
    }
  };

  const handleExportLedgerCsv = () => {
    if (!selectedCustomer) return;
    const headers = ['Entry ID', 'Date', 'Entry Type', 'Amount (INR)', 'Payment Method', 'Notes'];
    const rows = customerLedger.map((e) => [
      e.id,
      e.created_at,
      e.entry_type === 'credit' ? 'Udhar Given (Credit)' : 'Repayment Received (Jama)',
      e.amount,
      e.payment_method || 'N/A',
      e.notes || '',
    ]);
    exportCsv(`${selectedCustomer.name}_Khata_Ledger`, headers, rows);
  };

  const customerColumns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Details',
      render: (c) => (
        <div>
          <span className="font-semibold text-slate-900">{c.name}</span>
          {c.phone && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{c.phone}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Outstanding Balance',
      align: 'right',
      render: (c) => (
        <div className="text-right">
          <span
            className={`font-mono tabular-nums font-bold text-xs ${
              (c.current_balance || 0) > 0 ? 'text-amber-700' : 'text-slate-600'
            }`}
          >
            {formatINR(c.current_balance)}
          </span>
          <p className="text-[10px] text-slate-400">
            {(c.current_balance || 0) > 0 ? 'Balance Due' : 'All Settled'}
          </p>
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (c) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            loadCustomerLedger(c);
          }}
          className="text-xs font-semibold text-teal-800 hover:underline flex items-center gap-1 justify-end"
        >
          <span>View Khata</span>
          <BookOpen className="w-3.5 h-3.5" />
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
            Customer Credit Ledger (Udhar Khata)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only digital ledger with derived balances and repayment tracking
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Two Column Layout: Customer Directory (Left) & Customer Ledger Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Directory */}
        <div className="lg:col-span-5 space-y-3">
          <DataTable
            data={customers}
            columns={customerColumns}
            keyExtractor={(c) => c.id}
            searchable={true}
            searchPlaceholder="Search customer by name or phone..."
            searchFilter={(c, q) =>
              c.name.toLowerCase().includes(q) || (c.phone ? c.phone.includes(q) : false)
            }
            isLoading={isLoading}
            pageSize={8}
            emptyTitle="No customers registered"
            emptySubtitle="Add customers to record credit sales and maintain your Udhar Khata."
            emptyAction={{
              label: 'Add Customer',
              onClick: () => setIsAddModalOpen(true),
            }}
            onRowClick={(c) => loadCustomerLedger(c)}
          />
        </div>

        {/* Right Column (7 cols): Selected Customer Ledger */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {selectedCustomer ? (
            <div>
              {/* Customer Khata Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    {selectedCustomer.phone && <span>Ph: {selectedCustomer.phone}</span>}
                    {selectedCustomer.address && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-xs">{selectedCustomer.address}</span>
                      </>
                    )}
                  </div>
                  {selectedCustomer.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      Note: {selectedCustomer.notes}
                    </p>
                  )}
                </div>

                {/* Balance & Action */}
                <div className="text-right sm:text-right shrink-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Current Udhar Balance
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                    {formatINR(selectedCustomer.current_balance)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button
                      onClick={handleExportLedgerCsv}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                    {(selectedCustomer.current_balance || 0) > 0 && (
                      <button
                        onClick={() => {
                          setRepayAmount(String(selectedCustomer.current_balance || ''));
                          setRepayError(null);
                          setIsRepaymentModalOpen(true);
                        }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs flex items-center gap-1"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Record Repayment</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Append-Only Ledger Entries Table */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Append-Only Khata Statement</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {customerLedger.length} ledger entries
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold">
                        <th className="py-2 px-3 text-left">Date & Time</th>
                        <th className="py-2 px-3 text-left">Description</th>
                        <th className="py-2 px-3 text-right">Debit (+) / Credit (-)</th>
                        <th className="py-2 px-3 text-right">Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLedgerLoading ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            Loading ledger entries...
                          </td>
                        </tr>
                      ) : customerLedger.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No credit history for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        customerLedger.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {formatDate(entry.created_at, true)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-800 block">
                                {entry.entry_type === 'credit'
                                  ? 'Udhar (Credit Sale)'
                                  : 'Repayment Received (Jama)'}
                              </span>
                              {entry.notes && (
                                <span className="text-[10px] text-slate-400 block">{entry.notes}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                              {entry.entry_type === 'credit' ? (
                                <span className="text-amber-700">+{formatINR(entry.amount)}</span>
                              ) : (
                                <span className="text-emerald-700">-{formatINR(entry.amount)}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[11px] uppercase text-slate-500">
                              {entry.payment_method || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 space-y-2 p-6">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Select a Customer</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click on any customer in the left directory to view their complete append-only Udhar ledger, running balance, and payment history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
        subtitle="Customer account for credit transactions & billing"
      >
        <form onSubmit={handleAddCustomer} className="space-y-4">
          {addError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {addError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Full Name *
            </label>
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="e.g. Anand Sharma"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address / Landmark
            </label>
            <input
              type="text"
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
              placeholder="House 12, Gali 4, Sharma Colony"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Payment habits, credit terms)
            </label>
            <input
              type="text"
              value={custNotes}
              onChange={(e) => setCustNotes(e.target.value)}
              placeholder="Pays on 1st of every month"
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
            >
              Create Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Repayment (Jama) Modal */}
      <Modal
        isOpen={isRepaymentModalOpen}
        onClose={() => setIsRepaymentModalOpen(false)}
        title="Record Repayment (Jama)"
        subtitle={`Customer: ${selectedCustomer?.name}`}
      >
        <form onSubmit={handleRecordRepayment} className="space-y-4">
          {repayError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {repayError}
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-amber-800 font-medium">Outstanding Balance:</span>
            <span className="font-mono font-bold text-amber-900 tabular-nums">
              {formatINR(selectedCustomer?.current_balance)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Repayment Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              max={selectedCustomer?.current_balance || 0}
              step="0.01"
              required
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Repayment cannot exceed outstanding balance. Database prevents negative balances.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRepayMethod('cash')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-colors ${
                  repayMethod === 'cash'
                    ? 'bg-teal-800 border-teal-800 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setRepayMethod('upi')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-colors ${
                  repayMethod === 'upi'
                    ? 'bg-teal-800 border-teal-800 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                UPI / QR
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt / Settlement Notes
            </label>
            <input
              type="text"
              value={repayNotes}
              onChange={(e) => setRepayNotes(e.target.value)}
              placeholder="e.g. Paid in full via cash / GPay"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRepaymentModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRepaying}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
            >
              {isRepaying ? 'Recording...' : 'Confirm Repayment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
