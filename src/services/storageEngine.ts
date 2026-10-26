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
  AppUser,
} from '../types/database';
import { generateInvoiceNumber } from '../utils/formatters';

const DB_NAME = 'DukaanFlow_DB';
const DB_VERSION = 1;

/**
 * IndexedDB wrapper for persistent, robust client-side relational storage
 */
class LocalPostgresEngine {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores matching PostgreSQL tables
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('shops')) {
          const shopStore = db.createObjectStore('shops', { keyPath: 'id' });
          shopStore.createIndex('owner_id', 'owner_id', { unique: true });
        }
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('shop_id', 'shop_id', { unique: false });
          prodStore.createIndex('sku', 'sku', { unique: false });
        }
        if (!db.objectStoreNames.contains('customers')) {
          const custStore = db.createObjectStore('customers', { keyPath: 'id' });
          custStore.createIndex('shop_id', 'shop_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('sales')) {
          const saleStore = db.createObjectStore('sales', { keyPath: 'id' });
          saleStore.createIndex('shop_id', 'shop_id', { unique: false });
          saleStore.createIndex('created_at', 'created_at', { unique: false });
        }
        if (!db.objectStoreNames.contains('sale_items')) {
          const itemStore = db.createObjectStore('sale_items', { keyPath: 'id' });
          itemStore.createIndex('sale_id', 'sale_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('credit_entries')) {
          const creditStore = db.createObjectStore('credit_entries', { keyPath: 'id' });
          creditStore.createIndex('shop_id', 'shop_id', { unique: false });
          creditStore.createIndex('customer_id', 'customer_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          const expStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expStore.createIndex('shop_id', 'shop_id', { unique: false });
          expStore.createIndex('expense_date', 'expense_date', { unique: false });
        }
        if (!db.objectStoreNames.contains('stock_movements')) {
          const smStore = db.createObjectStore('stock_movements', { keyPath: 'id' });
          smStore.createIndex('shop_id', 'shop_id', { unique: false });
          smStore.createIndex('product_id', 'product_id', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic helper to get all items from a store filtered by predicate
  public async query<T>(storeName: string, predicate?: (item: T) => boolean): Promise<T[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        let results = (req.result || []) as T[];
        if (predicate) {
          results = results.filter(predicate);
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Generic helper to get single item
  public async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // Generic helper to put single item
  public async put<T>(storeName: string, item: T): Promise<T> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);

      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  // Generic helper to delete single item
  public async delete(storeName: string, key: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * ATOMIC TRANSACTION: create_sale_transaction
   * Implements the exact same rules as the PostgreSQL RPC:
   * 1. Validates ownership
   * 2. Checks product availability & locks stock
   * 3. Prevents overselling
   * 4. Deducts stock & writes stock_movements
   * 5. Creates sale & sale_items snapshots
   * 6. Appends to credit_entries if udhar
   * 7. If anything fails, nothing is committed!
   */
  public async executeSaleTransaction(
    ownerId: string,
    input: SaleTransactionInput
  ): Promise<SaleTransactionResult> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['shops', 'products', 'sales', 'sale_items', 'stock_movements', 'credit_entries', 'customers'],
        'readwrite'
      );

      const shopsStore = tx.objectStore('shops');
      const productsStore = tx.objectStore('products');
      const salesStore = tx.objectStore('sales');
      const itemsStore = tx.objectStore('sale_items');
      const stockStore = tx.objectStore('stock_movements');
      const creditStore = tx.objectStore('credit_entries');
      const customersStore = tx.objectStore('customers');

      // 1. Verify shop ownership
      const shopReq = shopsStore.get(input.shop_id);
      shopReq.onsuccess = () => {
        const shop = shopReq.result as Shop | undefined;
        if (!shop) {
          tx.abort();
          return reject(new Error('Shop not found.'));
        }
        if (shop.owner_id !== ownerId) {
          tx.abort();
          return reject(new Error('Unauthorized: You do not own this shop.'));
        }

        // Validate payment method
        if (!['cash', 'upi', 'credit'].includes(input.payment_method)) {
          tx.abort();
          return reject(new Error('Invalid payment method.'));
        }
        if (input.payment_method === 'credit' && !input.customer_id) {
          tx.abort();
          return reject(new Error('Customer is required for credit (Udhar) sales.'));
        }

        // Check customer if provided
        if (input.customer_id) {
          const custReq = customersStore.get(input.customer_id);
          custReq.onsuccess = () => {
            const customer = custReq.result as Customer | undefined;
            if (!customer || customer.shop_id !== input.shop_id) {
              tx.abort();
              return reject(new Error('Customer does not belong to this shop.'));
            }
            proceedWithProducts();
          };
          custReq.onerror = () => {
            tx.abort();
            reject(custReq.error);
          };
        } else {
          proceedWithProducts();
        }
      };

      const proceedWithProducts = () => {
        if (!input.items || input.items.length === 0) {
          tx.abort();
          return reject(new Error('Sale must contain at least one item.'));
        }

        // Load all sales today to create sequential invoice
        const salesReq = salesStore.getAll();
        salesReq.onsuccess = () => {
          const allSales = (salesReq.result || []) as Sale[];
          const todayPrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const todayCount = allSales.filter(
            (s) => s.shop_id === input.shop_id && s.created_at.slice(0, 10).replace(/-/g, '') === todayPrefix
          ).length;
          const invoiceNumber = `INV-${todayPrefix}-${String(todayCount + 1).padStart(4, '0')}`;

          // Validate each product stock
          const prodsReq = productsStore.getAll();
          prodsReq.onsuccess = () => {
            const allProducts = (prodsReq.result || []) as Product[];
            const productMap = new Map<string, Product>();
            for (const p of allProducts) {
              if (p.shop_id === input.shop_id) {
                productMap.set(p.id, p);
              }
            }

            let calculatedSubtotal = 0;
            const preparedItems: Array<{
              product: Product;
              quantity: number;
              unitCost: number;
              unitPrice: number;
              lineTotal: number;
            }> = [];

            for (const item of input.items) {
              if (item.quantity <= 0) {
                tx.abort();
                return reject(new Error('Item quantity must be greater than zero.'));
              }

              const prod = productMap.get(item.product_id);
              if (!prod) {
                tx.abort();
                return reject(new Error(`Product ${item.product_id} not found in this shop.`));
              }

              // Check stock limit (Overselling prevention)
              if (prod.stock_quantity < item.quantity) {
                tx.abort();
                return reject(
                  new Error(
                    `Insufficient stock for "${prod.name}" (Available: ${prod.stock_quantity}, Requested: ${item.quantity}).`
                  )
                );
              }

              const unitPrice =
                item.unit_price !== undefined && item.unit_price >= 0 ? item.unit_price : prod.selling_price;
              const unitCost = prod.cost_price || 0;
              const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

              calculatedSubtotal += lineTotal;
              preparedItems.push({
                product: prod,
                quantity: item.quantity,
                unitCost,
                unitPrice,
                lineTotal,
              });
            }

            const discount = Math.max(0, input.discount || 0);
            const finalTotal = Math.max(0, Math.round((calculatedSubtotal - discount) * 100) / 100);
            const saleId = crypto.randomUUID();
            const now = new Date().toISOString();

            // 1. Insert Sale
            const saleRecord: Sale = {
              id: saleId,
              shop_id: input.shop_id,
              customer_id: input.customer_id || null,
              invoice_number: invoiceNumber,
              subtotal: calculatedSubtotal,
              discount,
              total_amount: finalTotal,
              payment_method: input.payment_method,
              payment_reference: input.payment_reference,
              notes: input.notes,
              created_at: now,
            };
            salesStore.put(saleRecord);

            // 2. Insert Sale Items & Update Stock & Record movements
            for (const item of preparedItems) {
              const saleItemId = crypto.randomUUID();
              const saleItemRecord: SaleItem = {
                id: saleItemId,
                sale_id: saleId,
                product_id: item.product.id,
                product_name: item.product.name,
                unit_cost: item.unitCost,
                unit_price: item.unitPrice,
                quantity: item.quantity,
                line_total: item.lineTotal,
                created_at: now,
              };
              itemsStore.put(saleItemRecord);

              // Update product stock
              const prevQty = item.product.stock_quantity;
              const newQty = prevQty - item.quantity;
              item.product.stock_quantity = newQty;
              item.product.updated_at = now;
              productsStore.put(item.product);

              // Add stock movement audit record
              const movementRecord: StockMovement = {
                id: crypto.randomUUID(),
                shop_id: input.shop_id,
                product_id: item.product.id,
                product_name: item.product.name,
                change_type: 'sold',
                quantity_change: -item.quantity,
                previous_quantity: prevQty,
                new_quantity: newQty,
                reference_id: saleId,
                notes: `Sale: ${invoiceNumber}`,
                created_at: now,
              };
              stockStore.put(movementRecord);
            }

            // 3. If credit, append to credit ledger
            if (input.payment_method === 'credit' && input.customer_id) {
              const creditRecord: CreditEntry = {
                id: crypto.randomUUID(),
                shop_id: input.shop_id,
                customer_id: input.customer_id,
                sale_id: saleId,
                sale_invoice: invoiceNumber,
                entry_type: 'credit',
                amount: finalTotal,
                notes: `Credit sale: ${invoiceNumber}`,
                created_at: now,
              };
              creditStore.put(creditRecord);
            }

            tx.oncomplete = () => {
              resolve({
                success: true,
                sale_id: saleId,
                invoice_number: invoiceNumber,
                total_amount: finalTotal,
                subtotal: calculatedSubtotal,
                discount,
                payment_method: input.payment_method,
              });
            };

            tx.onerror = () => {
              reject(tx.error);
            };
          };
        };
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * ATOMIC REPAYMENT RPC
   * 1. Validates owner
   * 2. Derives current balance
   * 3. Prevents negative balance (repayment > balance)
   * 4. Appends to credit_entries
   */
  public async executeCreditRepayment(
    ownerId: string,
    shopId: string,
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'upi' = 'cash',
    notes?: string
  ): Promise<{ success: boolean; entry_id: string; repaid_amount: number; remaining_balance: number }> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['shops', 'customers', 'credit_entries'], 'readwrite');
      const shopsStore = tx.objectStore('shops');
      const creditStore = tx.objectStore('credit_entries');

      const shopReq = shopsStore.get(shopId);
      shopReq.onsuccess = () => {
        const shop = shopReq.result as Shop | undefined;
        if (!shop || shop.owner_id !== ownerId) {
          tx.abort();
          return reject(new Error('Unauthorized: You do not own this shop.'));
        }

        if (amount <= 0) {
          tx.abort();
          return reject(new Error('Repayment amount must be greater than zero.'));
        }

        // Calculate balance
        const allCreditReq = creditStore.getAll();
        allCreditReq.onsuccess = () => {
          const allEntries = (allCreditReq.result || []) as CreditEntry[];
          const customerEntries = allEntries.filter(
            (e) => e.shop_id === shopId && e.customer_id === customerId
          );

          let currentBalance = 0;
          for (const entry of customerEntries) {
            if (entry.entry_type === 'credit') currentBalance += entry.amount;
            else if (entry.entry_type === 'repayment') currentBalance -= entry.amount;
          }
          currentBalance = Math.round(currentBalance * 100) / 100;

          if (currentBalance <= 0) {
            tx.abort();
            return reject(new Error('Customer has no outstanding credit balance to repay.'));
          }

          if (amount > currentBalance) {
            tx.abort();
            return reject(
              new Error(
                `Repayment amount (₹${amount}) exceeds total outstanding credit (₹${currentBalance}). Cannot make balance negative.`
              )
            );
          }

          const entryId = crypto.randomUUID();
          const repaymentEntry: CreditEntry = {
            id: entryId,
            shop_id: shopId,
            customer_id: customerId,
            entry_type: 'repayment',
            amount,
            payment_method: paymentMethod,
            notes: notes || 'Repayment received',
            created_at: new Date().toISOString(),
          };

          creditStore.put(repaymentEntry);

          tx.oncomplete = () => {
            resolve({
              success: true,
              entry_id: entryId,
              repaid_amount: amount,
              remaining_balance: Math.round((currentBalance - amount) * 100) / 100,
            });
          };
          tx.onerror = () => reject(tx.error);
        };
      };

      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localDB = new LocalPostgresEngine();
