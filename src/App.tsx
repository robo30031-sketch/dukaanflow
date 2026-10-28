/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppUser, Shop } from './types/database';
import { getCurrentUser, getShopForUser, signOut } from './services/db';
import { AuthPage } from './pages/AuthPage';
import { ShopOnboardingPage } from './pages/ShopOnboardingPage';
import { AppLayout, ActivePage } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { EntrySplash } from './components/common/EntrySplash';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Restore session
  const initApp = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userShop = await getShopForUser(currentUser.id);
        setShop(userShop);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleAuthenticated = async (authenticatedUser: AppUser) => {
    setUser(authenticatedUser);
    const userShop = await getShopForUser(authenticatedUser.id);
    setShop(userShop);
    setActivePage('dashboard');
  };

  const handleShopCreated = (newShop: Shop) => {
    setShop(newShop);
    if (user) {
      setUser({ ...user, shop_id: newShop.id });
    }
    setActivePage('dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setShop(null);
    setActivePage('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0B1914] flex flex-col items-center justify-center font-sans text-white">
        <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-xl mb-4 border border-teal-500/30 animate-pulse overflow-hidden">
          <img
            src="/assets/aistudio/Dukaanflow_Shop_Growth_Logo_9d5a1b40.png"
            alt="DukaanFlow Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-xs text-slate-400 font-mono">Loading DukaanFlow...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        {/* Entry animation of raising bar graph with arrow, logo and app name */}
        {showSplash && <EntrySplash onComplete={() => setShowSplash(false)} />}

        {!user ? (
          <AuthPage onAuthenticated={handleAuthenticated} />
        ) : !shop ? (
          <ShopOnboardingPage user={user} onShopCreated={handleShopCreated} />
        ) : (
          <AppLayout
            user={user}
            shop={shop}
            activePage={activePage}
            onNavigate={setActivePage}
            onSignOut={handleSignOut}
          >
            {activePage === 'dashboard' && (
              <DashboardPage shop={shop} user={user} onNavigate={setActivePage} />
            )}
            {activePage === 'pos' && (
              <POSPage shop={shop} onNavigate={setActivePage} />
            )}
            {activePage === 'products' && (
              <ProductsPage shop={shop} />
            )}
            {activePage === 'customers' && (
              <CustomersPage shop={shop} />
            )}
            {activePage === 'expenses' && (
              <ExpensesPage shop={shop} />
            )}
            {activePage === 'reports' && (
              <ReportsPage shop={shop} />
            )}
          </AppLayout>
        )}
      </LanguageProvider>
    </ThemeProvider>
  );
}
