/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  LogOut,
  Store,
  Menu,
  X,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Shop, AppUser } from '../../types/database';
import { useTranslation } from '../../context/LanguageContext';

export type ActivePage =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'customers'
  | 'expenses'
  | 'reports';

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
  const { t, language, setLanguage, currentLanguageInfo, languages } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard' as ActivePage, labelKey: 'nav_dashboard' as const, icon: LayoutDashboard },
    { id: 'pos' as ActivePage, labelKey: 'nav_pos' as const, icon: ShoppingCart },
    { id: 'products' as ActivePage, labelKey: 'nav_products' as const, icon: Package },
    { id: 'customers' as ActivePage, labelKey: 'nav_customers' as const, icon: Users },
    { id: 'expenses' as ActivePage, labelKey: 'nav_expenses' as const, icon: Receipt },
    { id: 'reports' as ActivePage, labelKey: 'nav_reports' as const, icon: BarChart3 },
  ];

  const handleNavClick = (page: ActivePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const getPageTitle = (page: ActivePage) => {
    switch (page) {
      case 'dashboard':
        return t('nav_dashboard');
      case 'pos':
        return t('nav_pos');
      case 'products':
        return t('nav_products');
      case 'customers':
        return t('nav_customers');
      case 'expenses':
        return t('nav_expenses');
      case 'reports':
        return t('nav_reports');
      default:
        return t('app_name');
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
                {t('app_name')}
              </span>
              <p className="text-[10px] text-teal-400 font-mono">Retail & Kirana SaaS</p>
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
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* User & Sign Out */}
        <div className="px-4 py-3 border-t border-[#18352B] bg-[#091510]">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              title={t('sign_out')}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#152F24] rounded-lg transition-colors shrink-0"
              aria-label={t('sign_out')}
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
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
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
              <span className="font-semibold text-slate-900 truncate">{shop?.name || t('app_name')}</span>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <span className="truncate">{getPageTitle(activePage)}</span>
            </div>
          </div>

          {/* Right Zone: 22 Languages Selector & POS action */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 22 Official Languages Selector Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
                title="Select language (22 official languages of India)"
              >
                <Globe className="w-3.5 h-3.5 text-teal-800" />
                <span className="font-semibold text-slate-900">{currentLanguageInfo.nativeName}</span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">({currentLanguageInfo.name})</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                    22 Official Languages of India
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-teal-50/70 transition-colors ${
                        language === l.code ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs">{l.nativeName}</div>
                        <div className="text-[10px] text-slate-400">{l.name} · {l.region}</div>
                      </div>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-teal-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activePage !== 'pos' && (
              <button
                onClick={() => onNavigate('pos')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t('new_sale')}</span>
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
                    <span className="text-sm font-bold text-white">{t('app_name')}</span>
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
                        <span>{t(item.labelKey)}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#18352B] space-y-2">
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-[#142E24] rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('sign_out')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Container (Baseline 1440px wide) */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
