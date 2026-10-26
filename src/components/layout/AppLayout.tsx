/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, ReactNode } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  Database,
  LogOut,
  Store,
  Menu,
  X,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { Shop, AppUser } from '../../types/database';
import { SupabaseSetupModal } from '../common/SupabaseSetupModal';
import { getSupabaseConfig } from '../../services/supabaseClient';

export type ActivePage =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'customers'
  | 'expenses'
  | 'reports'
  | 'database';

interface AppLayoutProps {
  user: AppUser;
  shop: Shop | null;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onSignOut: () => void;
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  shop,
  activePage,
  onNavigate,
  onSignOut,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const supabaseConfig = getSupabaseConfig();

  const navItems = [
    { id: 'dashboard' as ActivePage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos' as ActivePage, label: 'POS Billing', icon: ShoppingCart },
    { id: 'products' as ActivePage, label: 'Inventory & Stock', icon: Package },
    { id: 'customers' as ActivePage, label: 'Udhar Khata (Credit)', icon: Users },
    { id: 'expenses' as ActivePage, label: 'Daily Expenses', icon: Receipt },
    { id: 'reports' as ActivePage, label: 'Reports & P&L', icon: BarChart3 },
    { id: 'database' as ActivePage, label: 'Supabase & SQL Hub', icon: Database },
  ];

  const handleNavClick = (page: ActivePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const getPageTitle = (page: ActivePage) => {
    switch (page) {
      case 'dashboard':
        return 'Overview & Real-time Metrics';
      case 'pos':
        return 'Point of Sale (POS) Billing';
      case 'products':
        return 'Product Management & Stock Movement';
      case 'customers':
        return 'Customer Credit Ledger (Udhar Khata)';
      case 'expenses':
        return 'Operating Expenses Tracker';
      case 'reports':
        return 'Financial Reports & Profitability';
      case 'database':
        return 'Supabase PostgreSQL & Security Hub';
      default:
        return 'DukaanFlow';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex text-slate-800 font-sans antialiased">
      {/* =========================================================================
          DESKTOP SIDEBAR ($260px width, deep forest palette #0B1914)
          ========================================================================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#0B1914] text-slate-300 border-r border-[#152B23] shrink-0 sticky top-0 h-screen z-20">
        {/* Brand Lockup */}
        <div className="px-6 py-5 border-b border-[#18352B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              DF
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
                DukaanFlow
              </span>
              <p className="text-[10px] text-teal-400 font-mono">Kirana & Retail SaaS</p>
            </div>
          </div>
        </div>

        {/* Shop Switcher / Badge */}
        <div className="px-4 py-3 mx-3 my-3 bg-[#11271E] rounded-xl border border-[#1B3E31] text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-medium truncate">
            <Store className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="truncate">{shop?.name || 'My Store'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate pl-6">
            {shop?.business_type ? `${shop.business_type.replace('_', ' ')}` : 'Retail'} · INR (₹)
          </p>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-teal-700/80 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-[#142E24] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Database Mode Indicator & Settings */}
        <div className="px-4 py-3 border-t border-[#18352B] bg-[#091510] space-y-2.5">
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-[#11271E] hover:bg-[#163528] border border-[#1C4234] text-[11px] text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Database className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="truncate">
                {supabaseConfig.isConfigured ? 'Supabase: Connected' : 'Engine: Local Postgres'}
              </span>
            </div>
            <span className="text-[10px] text-teal-400 font-semibold uppercase">Config</span>
          </button>

          {/* User & Sign Out */}
          <div className="flex items-center justify-between pt-1">
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#152F24] rounded-lg transition-colors shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION VIEWPORT
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR CONTRACT: Zone 1 (Wordmark on mobile), Zone 2 (Breadcrumbs), Zone 3 (Action) */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
          {/* Left Zone: Mobile toggle & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 truncate">
              <span className="font-semibold text-slate-900 truncate">{shop?.name || 'DukaanFlow'}</span>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <span className="truncate">{getPageTitle(activePage)}</span>
            </div>
          </div>

          {/* Right Zone: Primary Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSupabaseModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5 text-teal-700" />
              <span>{supabaseConfig.isConfigured ? 'Supabase Cloud' : 'Local Postgres'}</span>
            </button>

            {activePage !== 'pos' && (
              <button
                onClick={() => onNavigate('pos')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>New Sale (POS)</span>
              </button>
            )}
          </div>
        </header>

        {/* MOBILE SLIDE-OUT MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-950/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-[#0B1914] text-slate-300 p-4 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#18352B]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
                      DF
                    </div>
                    <span className="text-sm font-bold text-white">DukaanFlow</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-3">
                  <p className="text-xs font-medium text-slate-400">Shop:</p>
                  <p className="text-sm font-semibold text-white truncate">{shop?.name}</p>
                </div>

                <nav className="space-y-1 mt-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ${
                          isActive ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-[#142E24]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#18352B] space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSupabaseModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-[#11271E] rounded-lg text-slate-300"
                >
                  <Database className="w-4 h-4 text-teal-400" />
                  <span>Configure Supabase</span>
                </button>
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-[#142E24] rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Container (Baseline 1440px wide, no clipping) */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Supabase Configuration & SQL Hub Modal */}
      <SupabaseSetupModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </div>
  );
};
