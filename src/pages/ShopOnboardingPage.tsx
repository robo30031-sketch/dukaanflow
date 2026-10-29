/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createShop } from '../services/db';
import { AppUser, Shop, BusinessType } from '../types/database';
import { Store, Check, ArrowRight, ShieldCheck } from 'lucide-react';

import { BahiPilotIcon } from '../components/common/BahiPilotLogo';

interface ShopOnboardingPageProps {
  user: AppUser;
  onShopCreated: (shop: Shop) => void;
}

export const ShopOnboardingPage: React.FC<ShopOnboardingPageProps> = ({
  user,
  onShopCreated,
}) => {
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('kirana');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [seedInventory, setSeedInventory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a shop name.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const shop = await createShop(user.id, {
        name: name.trim(),
        business_type: businessType,
        currency: 'INR',
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim(),
        seedInitialInventory: seedInventory,
      });
      onShopCreated(shop);
    } catch (err: any) {
      setError(err.message || 'Failed to create shop. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F0] dark:bg-[#0A1C14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center px-4">
        <div className="inline-block p-2 bg-white rounded-2xl shadow-lg mb-3 border border-[#2E9D58]/30">
          <BahiPilotIcon sizePx={52} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#123C2A] dark:text-white">
          Setup Your Dukaan (Shop)
        </h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Welcome, {user.name}! Let’s set up your business profile. Each BahiPilot account owns one store with strict database security.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-8">
          {error && (
            <div className="mb-5 p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma Kirana & General Store"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Category
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
                >
                  <option value="kirana">Kirana / Grocery Store</option>
                  <option value="general_store">General Provision Store</option>
                  <option value="apparel">Apparel & Garments</option>
                  <option value="electronics">Electronics & Mobile</option>
                  <option value="pharmacy">Medical & Pharmacy</option>
                  <option value="hardware">Hardware & Sanitary</option>
                  <option value="stationery">Stationery & Books</option>
                  <option value="other">Other Retail</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  disabled
                  value="Indian Rupee (INR - ₹)"
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Address (For Bills & Receipts)
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No. 4, Main Market, Sector 12..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
              />
            </div>

            {/* Seed inventory check */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <input
                id="seed-inv"
                type="checkbox"
                checked={seedInventory}
                onChange={(e) => setSeedInventory(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-teal-800 border-slate-300 rounded focus:ring-teal-700"
              />
              <label htmlFor="seed-inv" className="text-xs text-slate-700 cursor-pointer">
                <span className="font-semibold block text-slate-900">
                  Pre-load common Indian retail items & demo customers
                </span>
                Adds popular everyday items (Atta, Oil, Salt, Maggi, Parle-G, Amul Butter, etc.) and sample Udhar accounts so you can test POS billing immediately.
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#2E9D58] hover:bg-[#258349] rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Store & Securing Database...' : 'Launch BahiPilot Store'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Strict owner_id verification enforced on all PostgreSQL tables</span>
        </div>
      </div>
    </div>
  );
};
