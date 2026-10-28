/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Shop,
  Product,
  Customer,
  Sale,
  SaleItem,
  CreditEntry,
  Expense,
  StockMovement,
  SaleTransactionInput,
  SaleTransactionResult,
  DashboardMetrics,
  StockMovementType,
  AppUser,
} from '../types/database';
import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import { localDB } from './storageEngine';
import { calculateCustomerBalance, calculateGrossProfit, calculateNetProfit } from '../utils/calculations';

const CURRENT_USER_KEY = 'dukaanflow_current_user';

// ============================================================================
// AUTH & SESSION MANAGEMENT
// ============================================================================

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        // Find their shop
        const { data: shop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Shop Owner',
          shop_id: shop?.id,
        };
      }
    } catch {
      // Fallback to local session
    }
  }

  // Local storage session
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (stored) {
    try {
      const user = JSON.parse(stored) as AppUser;
      // verify shop exists
      if (user.id) {
        const shops = await localDB.query<Shop>('shops', (s) => s.owner_id === user.id);
        if (shops.length > 0) {
          user.shop_id = shops[0].id;
        }
      }
      return user;
    } catch {
      return null;
    }
  }
  return null;
}

export async function signIn(email: string, password?: string): Promise<AppUser> {
  const supabase = getSupabaseClient();
  if (supabase && password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign in failed.');

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', data.user.id)
      .maybeSingle();

    const appUser: AppUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || email.split('@')[0],
      shop_id: shop?.id,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(appUser));
    return appUser;
  }

  // Local auth
  const users = await localDB.query<AppUser>('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  let user: AppUser;
  if (users.length > 0) {
    user = users[0];
  } else {
    // Auto register for demo/offline
    user = {
      id: crypto.randomUUID(),
      email,
      name: email.split('@')[0],
    };
    await localDB.put('users', user);
  }

  const shops = await localDB.query<Shop>('shops', (s) => s.owner_id === user.id);
  if (shops.length > 0) {
    user.shop_id = shops[0].id;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export async function signUp(email: string, password?: string, name?: string): Promise<AppUser> {
  const supabase = getSupabaseClient();
  if (supabase && password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Registration failed.');

    const appUser: AppUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: name || email.split('@')[0],
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(appUser));
    return appUser;
  }

  // Local auth
  const existing = await localDB.query<AppUser>('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing.length > 0) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  const user: AppUser = {
    id: crypto.randomUUID(),
    email,
    name: name || email.split('@')[0],
  };
  await localDB.put('users', user);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(CURRENT_USER_KEY);
}

// ============================================================================
// SHOP ONBOARDING & MANAGEMENT
// ============================================================================

export async function getShopForUser(userId: string): Promise<Shop | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    if (!error && data) return data as Shop;
  }

  const shops = await localDB.query<Shop>('shops', (s) => s.owner_id === userId);
  return shops.length > 0 ? shops[0] : null;
}

export async function createShop(
  ownerId: string,
  data: {
    name: string;
    business_type: string;
    currency?: string;
    phone?: string;
    address?: string;
    gstin?: string;
    seedInitialInventory?: boolean;
  }
): Promise<Shop> {
  const now = new Date().toISOString();
  const shopId = crypto.randomUUID();

  const newShop: Shop = {
    id: shopId,
    owner_id: ownerId,
    name: data.name.trim(),
    business_type: data.business_type,
    currency: data.currency || 'INR',
    phone: data.phone?.trim(),
    address: data.address?.trim(),
    gstin: data.gstin?.trim()?.toUpperCase(),
    created_at: now,
    updated_at: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: inserted, error } = await supabase.from('shops').insert([newShop]).select().single();
    if (error) throw new Error(error.message);
    if (data.seedInitialInventory) {
      await seedShopDemoInventory(inserted.id);
    }
    return inserted as Shop;
  }

  await localDB.put('shops', newShop);

  if (data.seedInitialInventory) {
    await seedShopDemoInventory(newShop.id);
  }

  // Update cached user shop_id
  const currentUser = await getCurrentUser();
  if (currentUser) {
    currentUser.shop_id = newShop.id;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  }

  return newShop;
}

/**
 * Seeds authentic initial products and a customer for small Indian shops
 */
export async function seedShopDemoInventory(shopId: string): Promise<void> {
  const starterProducts = [
    { name: 'Aashirvaad Shudh Chakki Atta (10kg)', sku: 'ATT-10KG', category: 'Grains & Flour', cost_price: 410, selling_price: 460, stock_quantity: 24, low_stock_threshold: 5, unit: 'bag' },
    { name: 'Fortune Sunlite Sunflower Oil (1L)', sku: 'OIL-1L', category: 'Oils & Ghee', cost_price: 135, selling_price: 155, stock_quantity: 35, low_stock_threshold: 8, unit: 'pouch' },
    { name: 'Tata Salt Vaccum Evaporated (1kg)', sku: 'SLT-1KG', category: 'Spices & Staples', cost_price: 22, selling_price: 28, stock_quantity: 48, low_stock_threshold: 10, unit: 'packet' },
    { name: 'Maggi 2-Minute Masala Noodles (4-Pack)', sku: 'MAG-4PK', category: 'Packaged Foods', cost_price: 48, selling_price: 56, stock_quantity: 4, low_stock_threshold: 6, unit: 'pack' }, // Low stock!
    { name: 'Parle-G Gold Biscuits (1kg Family Pack)', sku: 'PLG-1KG', category: 'Snacks & Bakery', cost_price: 110, selling_price: 130, stock_quantity: 18, low_stock_threshold: 5, unit: 'pack' },
    { name: 'Amul Butter Salted (500g)', sku: 'AML-500G', category: 'Dairy', cost_price: 250, selling_price: 275, stock_quantity: 12, low_stock_threshold: 4, unit: 'pack' },
    { name: 'Taj Mahal Tea (500g)', sku: 'TM-500G', category: 'Beverages', cost_price: 280, selling_price: 320, stock_quantity: 3, low_stock_threshold: 5, unit: 'box' }, // Low stock!
    { name: 'Dettol Original Soap (Pack of 4)', sku: 'DET-4PK', category: 'Personal Care', cost_price: 145, selling_price: 170, stock_quantity: 22, low_stock_threshold: 5, unit: 'pack' },
    { name: 'Surf Excel Easy Wash Detergent (1kg)', sku: 'SRF-1KG', category: 'Household', cost_price: 125, selling_price: 145, stock_quantity: 15, low_stock_threshold: 5, unit: 'pack' },
  ];

  for (const item of starterProducts) {
    await createProduct(shopId, item);
  }

  // Note: No demo customers are pre-seeded into Udhar Khata so the user has an empty, clean khata book
}

// ============================================================================
// PRODUCTS & INVENTORY
// ============================================================================

export async function getProducts(
  shopId: string,
  options?: {
    search?: string;
    category?: string;
    includeArchived?: boolean;
    lowStockOnly?: boolean;
  }
): Promise<Product[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from('products').select('*').eq('shop_id', shopId);

    if (!options?.includeArchived) {
      query = query.eq('is_archived', false);
    }
    if (options?.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }
    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    const { data, error } = await query.order('name');
    if (!error && data) {
      let results = data as Product[];
      if (options?.lowStockOnly) {
        results = results.filter((p) => p.stock_quantity <= p.low_stock_threshold);
      }
      return results;
    }
  }

  // Local storage
  return localDB.query<Product>('products', (p) => {
    if (p.shop_id !== shopId) return false;
    if (!options?.includeArchived && p.is_archived) return false;
    if (options?.category && options.category !== 'all' && p.category !== options.category) return false;
    if (options?.search) {
      const q = options.search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
      if (!matchName && !matchSku) return false;
    }
    if (options?.lowStockOnly && p.stock_quantity > p.low_stock_threshold) return false;
    return true;
  });
}

export async function createProduct(
  shopId: string,
  data: {
    name: string;
    sku?: string;
    category: string;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    low_stock_threshold?: number;
    unit?: string;
  }
): Promise<Product> {
  const now = new Date().toISOString();
  const newProduct: Product = {
    id: crypto.randomUUID(),
    shop_id: shopId,
    name: data.name.trim(),
    sku: data.sku?.trim() || undefined,
    category: data.category?.trim() || 'General',
    cost_price: Math.max(0, Number(data.cost_price) || 0),
    selling_price: Math.max(0, Number(data.selling_price) || 0),
    stock_quantity: Math.max(0, Number(data.stock_quantity) || 0),
    low_stock_threshold: Math.max(0, Number(data.low_stock_threshold) || 5),
    unit: data.unit?.trim() || 'pcs',
    is_archived: false,
    created_at: now,
    updated_at: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: inserted, error } = await supabase.from('products').insert([newProduct]).select().single();
    if (error) throw new Error(error.message);

    // Initial stock movement
    if (newProduct.stock_quantity > 0) {
      await supabase.from('stock_movements').insert([
        {
          shop_id: shopId,
          product_id: inserted.id,
          change_type: 'received',
          quantity_change: newProduct.stock_quantity,
          previous_quantity: 0,
          new_quantity: newProduct.stock_quantity,
          notes: 'Initial stock on creation',
        },
      ]);
    }

    return inserted as Product;
  }

  await localDB.put('products', newProduct);

  if (newProduct.stock_quantity > 0) {
    const movement: StockMovement = {
      id: crypto.randomUUID(),
      shop_id: shopId,
      product_id: newProduct.id,
      product_name: newProduct.name,
      change_type: 'received',
      quantity_change: newProduct.stock_quantity,
      previous_quantity: 0,
      new_quantity: newProduct.stock_quantity,
      notes: 'Initial stock on creation',
      created_at: now,
    };
    await localDB.put('stock_movements', movement);
  }

  return newProduct;
}

export async function updateProduct(
  shopId: string,
  productId: string,
  data: Partial<Product>
): Promise<Product> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const updatePayload: Record<string, any> = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    delete updatePayload.id;
    delete updatePayload.shop_id;

    const { data: updated, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as Product;
  }

  const existing = await localDB.get<Product>('products', productId);
  if (!existing || existing.shop_id !== shopId) {
    throw new Error('Product not found in this shop.');
  }

  const updated: Product = {
    ...existing,
    ...data,
    updated_at: new Date().toISOString(),
  };

  await localDB.put('products', updated);
  return updated;
}

export async function deleteProduct(shopId: string, productId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('shop_id', shopId);
    if (error) throw new Error(error.message);
    return;
  }

  const existing = await localDB.get<Product>('products', productId);
  if (existing && existing.shop_id === shopId) {
    await localDB.delete('products', productId);
  }
}

export async function archiveProduct(shopId: string, productId: string): Promise<void> {
  await updateProduct(shopId, productId, { is_archived: true });
}

export async function adjustStock(
  shopId: string,
  productId: string,
  changeType: StockMovementType,
  quantityChange: number,
  notes?: string
): Promise<Product> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: prod, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single();

    if (error || !prod) throw new Error('Product not found.');

    const previousQty = Number(prod.stock_quantity) || 0;
    const delta = changeType === 'sold' ? -Math.abs(quantityChange) : Math.abs(quantityChange);
    const newQty = Math.max(0, previousQty + delta);

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newQty, updated_at: now })
      .eq('id', productId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    await supabase.from('stock_movements').insert([
      {
        shop_id: shopId,
        product_id: productId,
        change_type: changeType,
        quantity_change: delta,
        previous_quantity: previousQty,
        new_quantity: newQty,
        notes: notes || `Manual ${changeType}`,
      },
    ]);

    return updated as Product;
  }

  const prod = await localDB.get<Product>('products', productId);
  if (!prod || prod.shop_id !== shopId) throw new Error('Product not found.');

  const previousQty = prod.stock_quantity;
  const delta = changeType === 'sold' ? -Math.abs(quantityChange) : Math.abs(quantityChange);
  const newQty = Math.max(0, previousQty + delta);

  prod.stock_quantity = newQty;
  prod.updated_at = now;
  await localDB.put('products', prod);

  const movement: StockMovement = {
    id: crypto.randomUUID(),
    shop_id: shopId,
    product_id: productId,
    product_name: prod.name,
    change_type: changeType,
    quantity_change: delta,
    previous_quantity: previousQty,
    new_quantity: newQty,
    notes: notes || `Manual ${changeType}`,
    created_at: now,
  };
  await localDB.put('stock_movements', movement);

  return prod;
}

// ============================================================================
// CUSTOMERS & UDHAR (CREDIT LEDGER)
// ============================================================================

export async function getCustomers(shopId: string, search?: string): Promise<Customer[]> {
  const supabase = getSupabaseClient();
  let customers: Customer[] = [];

  if (supabase) {
    let q = supabase.from('customers').select('*').eq('shop_id', shopId);
    if (search) {
      q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data, error } = await q.order('name');
    if (!error && data) {
      customers = data as Customer[];
    }
  } else {
    customers = await localDB.query<Customer>('customers', (c) => {
      if (c.shop_id !== shopId) return false;
      if (search) {
        const query = search.toLowerCase();
        const mName = c.name.toLowerCase().includes(query);
        const mPhone = c.phone ? c.phone.toLowerCase().includes(query) : false;
        if (!mName && !mPhone) return false;
      }
      return true;
    });
  }

  // Derive balances from credit ledger
  const allCreditEntries = await getCreditEntries(shopId);
  const balanceMap = new Map<string, number>();

  for (const entry of allCreditEntries) {
    const current = balanceMap.get(entry.customer_id) || 0;
    const delta = entry.entry_type === 'credit' ? entry.amount : -entry.amount;
    balanceMap.set(entry.customer_id, current + delta);
  }

  return customers.map((c) => ({
    ...c,
    current_balance: Math.max(0, Math.round((balanceMap.get(c.id) || 0) * 100) / 100),
  }));
}

export async function createCustomer(
  shopId: string,
  data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }
): Promise<Customer> {
  const now = new Date().toISOString();
  const customer: Customer = {
    id: crypto.randomUUID(),
    shop_id: shopId,
    name: data.name.trim(),
    phone: data.phone?.trim(),
    email: data.email?.trim(),
    address: data.address?.trim(),
    notes: data.notes?.trim(),
    created_at: now,
    updated_at: now,
    current_balance: 0,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: inserted, error } = await supabase.from('customers').insert([customer]).select().single();
    if (error) throw new Error(error.message);
    return inserted as Customer;
  }

  await localDB.put('customers', customer);
  return customer;
}

export async function deleteCustomer(shopId: string, customerId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('credit_entries').delete().eq('customer_id', customerId).eq('shop_id', shopId);
    const { error } = await supabase.from('customers').delete().eq('id', customerId).eq('shop_id', shopId);
    if (error) throw new Error(error.message);
    return;
  }

  const entries = await localDB.query<CreditEntry>('credit_entries', (e) => e.customer_id === customerId && e.shop_id === shopId);
  for (const entry of entries) {
    await localDB.delete('credit_entries', entry.id);
  }
  await localDB.delete('customers', customerId);
}

export async function deleteAllCustomers(shopId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('credit_entries').delete().eq('shop_id', shopId);
    const { error } = await supabase.from('customers').delete().eq('shop_id', shopId);
    if (error) throw new Error(error.message);
    return;
  }

  const custs = await localDB.query<Customer>('customers', (c) => c.shop_id === shopId);
  for (const c of custs) {
    const entries = await localDB.query<CreditEntry>('credit_entries', (e) => e.customer_id === c.id);
    for (const entry of entries) {
      await localDB.delete('credit_entries', entry.id);
    }
    await localDB.delete('customers', c.id);
  }
}

export async function getCreditEntries(shopId: string, customerId?: string): Promise<CreditEntry[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let q = supabase.from('credit_entries').select('*').eq('shop_id', shopId);
    if (customerId) {
      q = q.eq('customer_id', customerId);
    }
    const { data, error } = await q.order('created_at', { ascending: false });
    if (!error && data) return data as CreditEntry[];
  }

  return localDB.query<CreditEntry>('credit_entries', (e) => {
    if (e.shop_id !== shopId) return false;
    if (customerId && e.customer_id !== customerId) return false;
    return true;
  });
}

/**
 * ATOMIC REPAYMENT CALL
 * Invokes PostgreSQL RPC or local transactional method
 */
export async function recordCreditRepayment(
  ownerId: string,
  shopId: string,
  customerId: string,
  amount: number,
  paymentMethod: 'cash' | 'upi' = 'cash',
  notes?: string
): Promise<{ success: boolean; entry_id: string; repaid_amount: number; remaining_balance: number }> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('record_credit_repayment', {
      p_shop_id: shopId,
      p_customer_id: customerId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_notes: notes || null,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  return localDB.executeCreditRepayment(ownerId, shopId, customerId, amount, paymentMethod, notes);
}

// ============================================================================
// SALES & ATOMIC POS TRANSACTIONS
// ============================================================================

/**
 * ATOMIC SALE TRANSACTION
 * Calls Postgres RPC `create_sale_transaction` or local transaction coordinator
 */
export async function createSaleTransaction(
  ownerId: string,
  input: SaleTransactionInput
): Promise<SaleTransactionResult> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('create_sale_transaction', {
      p_shop_id: input.shop_id,
      p_customer_id: input.customer_id || null,
      p_payment_method: input.payment_method,
      p_payment_reference: input.payment_reference || null,
      p_discount: input.discount || 0,
      p_notes: input.notes || null,
      p_items: input.items,
    });
    if (error) throw new Error(error.message);
    return data as SaleTransactionResult;
  }

  return localDB.executeSaleTransaction(ownerId, input);
}

export async function getSales(
  shopId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    limit?: number;
  }
): Promise<Sale[]> {
  const supabase = getSupabaseClient();
  let sales: Sale[] = [];

  if (supabase) {
    let q = supabase
      .from('sales')
      .select('*, customers(name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (options?.startDate) q = q.gte('created_at', options.startDate);
    if (options?.endDate) q = q.lte('created_at', options.endDate);
    if (options?.customerId) q = q.eq('customer_id', options.customerId);
    if (options?.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (!error && data) {
      sales = data.map((s: any) => ({
        ...s,
        customer_name: s.customers?.name || undefined,
      }));
    }
  } else {
    const customers = await localDB.query<Customer>('customers', (c) => c.shop_id === shopId);
    const custMap = new Map(customers.map((c) => [c.id, c.name]));

    sales = await localDB.query<Sale>('sales', (s) => {
      if (s.shop_id !== shopId) return false;
      if (options?.startDate && s.created_at < options.startDate) return false;
      if (options?.endDate && s.created_at > options.endDate) return false;
      if (options?.customerId && s.customer_id !== options.customerId) return false;
      return true;
    });

    sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (options?.limit) {
      sales = sales.slice(0, options.limit);
    }

    sales = sales.map((s) => ({
      ...s,
      customer_name: s.customer_id ? custMap.get(s.customer_id) : undefined,
    }));
  }

  return sales;
}

export async function getSaleWithItems(
  shopId: string,
  saleId: string
): Promise<{ sale: Sale; items: SaleItem[] }> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select('*, customers(name, phone, address)')
      .eq('id', saleId)
      .eq('shop_id', shopId)
      .single();

    if (saleErr || !sale) throw new Error('Sale not found.');

    const { data: items, error: itemsErr } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    if (itemsErr) throw new Error(itemsErr.message);

    return {
      sale: {
        ...sale,
        customer_name: sale.customers?.name,
      },
      items: (items || []) as SaleItem[],
    };
  }

  const sale = await localDB.get<Sale>('sales', saleId);
  if (!sale || sale.shop_id !== shopId) throw new Error('Sale not found.');

  let customerName: string | undefined;
  if (sale.customer_id) {
    const cust = await localDB.get<Customer>('customers', sale.customer_id);
    customerName = cust?.name;
  }

  const items = await localDB.query<SaleItem>('sale_items', (item) => item.sale_id === saleId);

  return {
    sale: {
      ...sale,
      customer_name: customerName,
    },
    items,
  };
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function getExpenses(
  shopId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }
): Promise<Expense[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let q = supabase.from('expenses').select('*').eq('shop_id', shopId);
    if (options?.startDate) q = q.gte('expense_date', options.startDate.slice(0, 10));
    if (options?.endDate) q = q.lte('expense_date', options.endDate.slice(0, 10));
    if (options?.category && options.category !== 'all') q = q.eq('category', options.category);

    const { data, error } = await q.order('expense_date', { ascending: false });
    if (!error && data) return data as Expense[];
  }

  return localDB.query<Expense>('expenses', (exp) => {
    if (exp.shop_id !== shopId) return false;
    if (options?.startDate && exp.expense_date < options.startDate.slice(0, 10)) return false;
    if (options?.endDate && exp.expense_date > options.endDate.slice(0, 10)) return false;
    if (options?.category && options.category !== 'all' && exp.category !== options.category) return false;
    return true;
  });
}

export async function createExpense(
  shopId: string,
  data: {
    category: string;
    amount: number;
    payment_method?: 'cash' | 'upi' | 'card' | 'other';
    description?: string;
    expense_date?: string;
  }
): Promise<Expense> {
  const expense: Expense = {
    id: crypto.randomUUID(),
    shop_id: shopId,
    category: data.category,
    amount: Math.max(0, Number(data.amount) || 0),
    payment_method: data.payment_method || 'cash',
    description: data.description?.trim(),
    expense_date: data.expense_date || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: inserted, error } = await supabase.from('expenses').insert([expense]).select().single();
    if (error) throw new Error(error.message);
    return inserted as Expense;
  }

  await localDB.put('expenses', expense);
  return expense;
}

export async function deleteExpense(shopId: string, expenseId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('shop_id', shopId);
    if (error) throw new Error(error.message);
    return;
  }
  await localDB.delete('expenses', expenseId);
}

// ============================================================================
// DASHBOARD METRICS & FINANCIAL REPORTS
// ============================================================================

export async function getDashboardMetrics(
  shopId: string,
  periodRange: { startDate: string; endDate: string }
): Promise<DashboardMetrics> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfToday = `${todayStr}T00:00:00.000Z`;
  const endOfToday = `${todayStr}T23:59:59.999Z`;

  // 1. Get all sales
  const allSales = await getSales(shopId);

  // Today sales
  const todaySales = allSales.filter(
    (s) => s.created_at >= startOfToday && s.created_at <= endOfToday
  );
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total_amount, 0);

  // Period sales
  const periodSales = allSales.filter(
    (s) => s.created_at >= periodRange.startDate && s.created_at <= periodRange.endDate
  );
  const periodRevenue = periodSales.reduce((acc, s) => acc + s.total_amount, 0);

  // 2. Fetch sale items for profit calculation
  // We need line item snapshots (unit_cost, unit_price, quantity)
  let todaySaleItems: SaleItem[] = [];
  let periodSaleItems: SaleItem[] = [];

  const supabase = getSupabaseClient();
  if (supabase) {
    const todayIds = todaySales.map((s) => s.id);
    if (todayIds.length > 0) {
      const { data: tItems } = await supabase.from('sale_items').select('*').in('sale_id', todayIds);
      if (tItems) todaySaleItems = tItems as SaleItem[];
    }
    const periodIds = periodSales.map((s) => s.id);
    if (periodIds.length > 0) {
      const { data: pItems } = await supabase.from('sale_items').select('*').in('sale_id', periodIds);
      if (pItems) periodSaleItems = pItems as SaleItem[];
    }
  } else {
    const todayIdSet = new Set(todaySales.map((s) => s.id));
    const periodIdSet = new Set(periodSales.map((s) => s.id));
    const allItems = await localDB.query<SaleItem>('sale_items');
    todaySaleItems = allItems.filter((i) => todayIdSet.has(i.sale_id));
    periodSaleItems = allItems.filter((i) => periodIdSet.has(i.sale_id));
  }

  const todayGross = calculateGrossProfit(todaySaleItems).grossProfit;
  const periodGross = calculateGrossProfit(periodSaleItems).grossProfit;

  // 3. Expenses
  const allExpenses = await getExpenses(shopId);
  const todayExpenses = allExpenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((acc, e) => acc + e.amount, 0);

  const periodExpenses = allExpenses
    .filter((e) => e.expense_date >= periodRange.startDate.slice(0, 10) && e.expense_date <= periodRange.endDate.slice(0, 10))
    .reduce((acc, e) => acc + e.amount, 0);

  // 4. Outstanding Credit
  const creditEntries = await getCreditEntries(shopId);
  const totalCredit = calculateCustomerBalance(creditEntries);

  // 5. Low Stock Count
  const products = await getProducts(shopId, { includeArchived: false });
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;

  return {
    today_sales_revenue: Math.round(todayRevenue * 100) / 100,
    today_gross_profit: Math.round(todayGross * 100) / 100,
    today_recorded_expenses: Math.round(todayExpenses * 100) / 100,
    today_net_operating_profit: calculateNetProfit(todayGross, todayExpenses),
    total_outstanding_credit: Math.round(totalCredit * 100) / 100,
    low_stock_count: lowStockCount,
    period_sales_revenue: Math.round(periodRevenue * 100) / 100,
    period_gross_profit: Math.round(periodGross * 100) / 100,
    period_expenses: Math.round(periodExpenses * 100) / 100,
    period_net_profit: calculateNetProfit(periodGross, periodExpenses),
  };
}

// ============================================================================
// CSV EXPORT UTILITIES
// ============================================================================

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
