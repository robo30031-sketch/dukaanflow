/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from './Modal';
import { Sale, SaleItem, Shop } from '../../types/database';
import { formatINR, formatDate } from '../../utils/formatters';
import { Printer, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  items: SaleItem[];
  shop: Shop | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  items,
  shop,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Receipt & Tax Invoice"
      subtitle={`Invoice #${sale.invoice_number}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Printable Receipt Paper Container */}
        <div id="printable-receipt" className="bg-white p-6 border border-slate-200 rounded-xl font-sans text-slate-800 space-y-5">
          {/* Header */}
          <div className="text-center pb-4 border-b border-slate-200 space-y-1">
            <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900">
              {shop?.name || 'DukaanFlow Store'}
            </h2>
            {shop?.address && <p className="text-xs text-slate-500">{shop.address}</p>}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
              {shop?.phone && <span>Ph: {shop.phone}</span>}
              {shop?.phone && shop?.gstin && <span>·</span>}
              {shop?.gstin && <span>GSTIN: {shop.gstin}</span>}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 text-xs gap-3 pb-3 border-b border-slate-100">
            <div>
              <p className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Invoice No</p>
              <p className="font-mono font-bold text-slate-800">{sale.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Date & Time</p>
              <p className="font-mono text-slate-700">{formatDate(sale.created_at, true)}</p>
            </div>

            {sale.customer_name && (
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Billed To (Customer)</p>
                <p className="font-medium text-slate-800">{sale.customer_name}</p>
              </div>
            )}

            <div className={sale.customer_name ? 'text-right' : 'col-span-2'}>
              <p className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Payment Method</p>
              <p className="font-bold uppercase tracking-wide text-teal-800">
                {sale.payment_method === 'credit' ? 'Udhar / Credit' : sale.payment_method}
                {sale.payment_reference ? ` (${sale.payment_reference})` : ''}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="text-left py-1.5">Item</th>
                  <th className="text-center py-1.5">Qty</th>
                  <th className="text-right py-1.5">Rate</th>
                  <th className="text-right py-1.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="py-2">
                    <td className="py-2 pr-2 font-medium text-slate-800">{item.product_name}</td>
                    <td className="py-2 text-center font-mono tabular-nums text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(item.unit_price)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatINR(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied</span>
                <span className="font-mono tabular-nums">-{formatINR(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="font-mono tabular-nums text-teal-900">{formatINR(sale.total_amount)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-4 border-t border-dashed border-slate-200 text-[11px] text-slate-400 space-y-0.5">
            <p className="font-medium text-slate-600">Thank you for your visit!</p>
            <p>Goods once sold can be exchanged within 7 days with this bill.</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sale recorded atomically</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
