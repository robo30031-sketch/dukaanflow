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
import { DatabaseHubPage } from './pages/DatabaseHubPage';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

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
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg mb-3 animate-pulse">
          DF
        </div>
        <p className="text-xs text-slate-400 font-mono">Loading DukaanFlow...</p>
      </div>
    );
  }

  // If not signed in, show Auth
  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  // If signed in but no shop created yet, show Shop Onboarding
  if (!shop) {
    return <ShopOnboardingPage user={user} onShopCreated={handleShopCreated} />;
  }

  // Authenticated with active store
  return (
    <AppLayout
      user={user}
      shop={shop}
      activePage={activePage}
      onNavigate={setActivePage}
      onSignOut={handleSignOut}
    >
      {activePage === 'dashboard' && (
        <DashboardPage shop={shop} onNavigate={setActivePage} />
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
      {activePage === 'database' && (
        <DatabaseHubPage />
      )}
    </AppLayout>
  );
}
