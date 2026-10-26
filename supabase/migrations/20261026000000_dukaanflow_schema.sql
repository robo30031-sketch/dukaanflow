-- ============================================================================
-- DUKAANFLOW — PRODUCTION POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- Migration: 20261026000000_dukaanflow_schema.sql
-- Multi-tenant schema for Indian small retail and trade shops
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLE DEFINITIONS
-- ============================================================================

-- SHOPS (1 shop per owner in v1.0)
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL DEFAULT 'kirana',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    phone VARCHAR(20),
    address TEXT,
    gstin VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_owner_shop UNIQUE (owner_id)
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    low_stock_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_cost_price_positive CHECK (cost_price >= 0),
    CONSTRAINT check_selling_price_positive CHECK (selling_price >= 0),
    CONSTRAINT check_stock_positive CHECK (stock_quantity >= 0),
    CONSTRAINT check_low_stock_positive CHECK (low_stock_threshold >= 0)
);

-- CUSTOMERS (For Udhar / Credit ledger)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- SALES (POS Invoices)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- 'cash', 'upi', 'credit'
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_sale_subtotal CHECK (subtotal >= 0),
    CONSTRAINT check_sale_discount CHECK (discount >= 0),
    CONSTRAINT check_sale_total CHECK (total_amount >= 0),
    CONSTRAINT check_payment_method CHECK (payment_method IN ('cash', 'upi', 'credit'))
);

-- SALE ITEMS (Snapshots of unit cost & price at the time of sale)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_item_quantity CHECK (quantity > 0),
    CONSTRAINT check_item_unit_cost CHECK (unit_cost >= 0),
    CONSTRAINT check_item_unit_price CHECK (unit_price >= 0),
    CONSTRAINT check_item_line_total CHECK (line_total >= 0)
);

-- CREDIT ENTRIES (Append-only Khata ledger)
CREATE TABLE IF NOT EXISTS public.credit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    entry_type VARCHAR(20) NOT NULL, -- 'credit' (Udhar taken) or 'repayment' (Jama kiya)
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(20), -- 'cash', 'upi' (for repayments)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_credit_amount CHECK (amount > 0),
    CONSTRAINT check_entry_type CHECK (entry_type IN ('credit', 'repayment'))
);

-- EXPENSES (Daily operating overheads)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'rent', 'electricity', 'staff_wages', 'transport', 'packaging', 'tea_snacks', 'maintenance', 'other'
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_expense_amount CHECK (amount > 0)
);

-- STOCK MOVEMENTS (Audit ledger for all inventory changes)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change_type VARCHAR(30) NOT NULL, -- 'received', 'sold', 'returned', 'manual_adjustment'
    quantity_change NUMERIC(12, 2) NOT NULL,
    previous_quantity NUMERIC(12, 2) NOT NULL,
    new_quantity NUMERIC(12, 2) NOT NULL,
    reference_id UUID, -- sale_id if sold, purchase order if received
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_change_type CHECK (change_type IN ('received', 'sold', 'returned', 'manual_adjustment'))
);

-- ============================================================================
-- 3. INDEXES FOR HIGH-PERFORMANCE MULTI-TENANT QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_archived ON public.products(shop_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(shop_id, sku);
CREATE INDEX IF NOT EXISTS idx_customers_shop ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON public.sales(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_credit_entries_cust ON public.credit_entries(shop_id, customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON public.expenses(shop_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation: No user can access or mutate another shop's data
-- ============================================================================

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- SHOPS POLICIES
CREATE POLICY "Users can select their own shop"
    ON public.shops FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own shop"
    ON public.shops FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own shop"
    ON public.shops FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own shop"
    ON public.shops FOR DELETE
    USING (owner_id = auth.uid());

-- HELPER EXPRESSION MACRO (Evaluated in context of caller)
-- All child tables verify that shop_id belongs to a shop where owner_id = auth.uid()

-- PRODUCTS POLICIES
CREATE POLICY "Shop owners can select their products"
    ON public.products FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert their products"
    ON public.products FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can update their products"
    ON public.products FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can delete their products"
    ON public.products FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()));

-- CUSTOMERS POLICIES
CREATE POLICY "Shop owners can select their customers"
    ON public.customers FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = customers.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert their customers"
    ON public.customers FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = customers.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can update their customers"
    ON public.customers FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = customers.shop_id AND shops.owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = customers.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can delete their customers"
    ON public.customers FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = customers.shop_id AND shops.owner_id = auth.uid()));

-- SALES POLICIES
CREATE POLICY "Shop owners can select their sales"
    ON public.sales FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = sales.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert their sales"
    ON public.sales FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = sales.shop_id AND shops.owner_id = auth.uid()));

-- SALE ITEMS POLICIES (Linked via sales -> shops)
CREATE POLICY "Shop owners can select their sale items"
    ON public.sale_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.sales
        JOIN public.shops ON shops.id = sales.shop_id
        WHERE sales.id = sale_items.sale_id AND shops.owner_id = auth.uid()
    ));

CREATE POLICY "Shop owners can insert their sale items"
    ON public.sale_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sales
        JOIN public.shops ON shops.id = sales.shop_id
        WHERE sales.id = sale_items.sale_id AND shops.owner_id = auth.uid()
    ));

-- CREDIT ENTRIES POLICIES
CREATE POLICY "Shop owners can select credit entries"
    ON public.credit_entries FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = credit_entries.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert credit entries"
    ON public.credit_entries FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = credit_entries.shop_id AND shops.owner_id = auth.uid()));

-- EXPENSES POLICIES
CREATE POLICY "Shop owners can select expenses"
    ON public.expenses FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = expenses.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = expenses.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can update expenses"
    ON public.expenses FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = expenses.shop_id AND shops.owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = expenses.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can delete expenses"
    ON public.expenses FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = expenses.shop_id AND shops.owner_id = auth.uid()));

-- STOCK MOVEMENTS POLICIES
CREATE POLICY "Shop owners can select stock movements"
    ON public.stock_movements FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = stock_movements.shop_id AND shops.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert stock movements"
    ON public.stock_movements FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE shops.id = stock_movements.shop_id AND shops.owner_id = auth.uid()));


-- ============================================================================
-- 5. SECURE ATOMIC RPC FUNCTIONS (With explicit auth validation & rollback)
-- ============================================================================

-- Function: create_sale_transaction
-- Atomically writes: sale + sale items + decrements inventory + writes stock movement + writes credit entry if udhar
CREATE OR REPLACE FUNCTION public.create_sale_transaction(
    p_shop_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method VARCHAR(20) DEFAULT 'cash',
    p_payment_reference VARCHAR(100) DEFAULT NULL,
    p_discount NUMERIC(12, 2) DEFAULT 0.00,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Executes with invoker permissions under RLS
AS $$
DECLARE
    v_shop_owner UUID;
    v_sale_id UUID;
    v_invoice_num VARCHAR(50);
    v_item RECORD;
    v_current_stock NUMERIC(12, 2);
    v_product_name VARCHAR(255);
    v_unit_cost NUMERIC(12, 2);
    v_unit_price NUMERIC(12, 2);
    v_calc_subtotal NUMERIC(12, 2) := 0.00;
    v_final_total NUMERIC(12, 2) := 0.00;
    v_item_count INT := 0;
BEGIN
    -- 1. Verify shop exists and authenticated user is the shop owner
    SELECT owner_id INTO v_shop_owner
    FROM public.shops
    WHERE id = p_shop_id;

    IF v_shop_owner IS NULL THEN
        RAISE EXCEPTION 'Shop not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_shop_owner <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this shop.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify payment method
    IF p_payment_method NOT IN ('cash', 'upi', 'credit') THEN
        RAISE EXCEPTION 'Invalid payment method: must be cash, upi, or credit.' USING ERRCODE = '22023';
    END IF;

    -- 3. If credit sale, customer_id is required
    IF p_payment_method = 'credit' AND p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer is required for credit (Udhar) sales.' USING ERRCODE = '22023';
    END IF;

    -- 4. Verify customer belongs to this shop if supplied
    IF p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id AND shop_id = p_shop_id) THEN
            RAISE EXCEPTION 'Selected customer does not belong to this shop.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 5. Generate human-readable sequential invoice number for shop
    SELECT 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO v_invoice_num
    FROM public.sales
    WHERE shop_id = p_shop_id AND created_at >= CURRENT_DATE;

    -- 6. Pre-calculate totals and lock product rows for update to prevent overselling race conditions
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        quantity NUMERIC(12, 2),
        unit_price NUMERIC(12, 2)
    )
    LOOP
        v_item_count := v_item_count + 1;
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero.' USING ERRCODE = '22023';
        END IF;

        -- Row lock product and verify ownership
        SELECT stock_quantity, name, cost_price, selling_price
        INTO v_current_stock, v_product_name, v_unit_cost, v_unit_price
        FROM public.products
        WHERE id = v_item.product_id AND shop_id = p_shop_id
        FOR UPDATE;

        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'Product % does not exist in this shop.', v_item.product_id USING ERRCODE = 'P0002';
        END IF;

        -- Prevent overselling
        IF v_current_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product "%" (Available: %, Requested: %).',
                v_product_name, v_current_stock, v_item.quantity USING ERRCODE = 'P0001';
        END IF;

        -- Use client price only if provided and valid, otherwise database price
        IF v_item.unit_price IS NOT NULL AND v_item.unit_price >= 0 THEN
            v_unit_price := v_item.unit_price;
        END IF;

        v_calc_subtotal := v_calc_subtotal + (v_unit_price * v_item.quantity);
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Sale must contain at least one item.' USING ERRCODE = '22023';
    END IF;

    v_final_total := GREATEST(0.00, v_calc_subtotal - COALESCE(p_discount, 0.00));

    -- 7. Insert Sale record
    INSERT INTO public.sales (
        shop_id,
        customer_id,
        invoice_number,
        subtotal,
        discount,
        total_amount,
        payment_method,
        payment_reference,
        notes
    ) VALUES (
        p_shop_id,
        p_customer_id,
        v_invoice_num,
        v_calc_subtotal,
        COALESCE(p_discount, 0.00),
        v_final_total,
        p_payment_method,
        p_payment_reference,
        p_notes
    ) RETURNING id INTO v_sale_id;

    -- 8. Insert Sale Items, Decrement Inventory, and Log Stock Movements
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        quantity NUMERIC(12, 2),
        unit_price NUMERIC(12, 2)
    )
    LOOP
        SELECT stock_quantity, name, cost_price, selling_price
        INTO v_current_stock, v_product_name, v_unit_cost, v_unit_price
        FROM public.products
        WHERE id = v_item.product_id;

        IF v_item.unit_price IS NOT NULL AND v_item.unit_price >= 0 THEN
            v_unit_price := v_item.unit_price;
        END IF;

        -- Insert line item snapshot
        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            product_name,
            unit_cost,
            unit_price,
            quantity,
            line_total
        ) VALUES (
            v_sale_id,
            v_item.product_id,
            v_product_name,
            v_unit_cost,
            v_unit_price,
            v_item.quantity,
            (v_unit_price * v_item.quantity)
        );

        -- Decrement product stock
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.product_id;

        -- Record stock movement ledger
        INSERT INTO public.stock_movements (
            shop_id,
            product_id,
            change_type,
            quantity_change,
            previous_quantity,
            new_quantity,
            reference_id,
            notes
        ) VALUES (
            p_shop_id,
            v_item.product_id,
            'sold',
            -v_item.quantity,
            v_current_stock,
            (v_current_stock - v_item.quantity),
            v_sale_id,
            'Sale: ' || v_invoice_num
        );
    END LOOP;

    -- 9. If Payment Method is Credit, insert into credit_entries
    IF p_payment_method = 'credit' THEN
        INSERT INTO public.credit_entries (
            shop_id,
            customer_id,
            sale_id,
            entry_type,
            amount,
            notes
        ) VALUES (
            p_shop_id,
            p_customer_id,
            v_sale_id,
            'credit',
            v_final_total,
            'Credit sale: ' || v_invoice_num
        );
    END IF;

    -- Return JSON payload of the completed sale
    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_num,
        'total_amount', v_final_total,
        'subtotal', v_calc_subtotal,
        'discount', p_discount,
        'payment_method', p_payment_method
    );
END;
$$;


-- Function: record_credit_repayment
-- Atomically records a customer's repayment (Jama), validates that it does not exceed current balance
CREATE OR REPLACE FUNCTION public.record_credit_repayment(
    p_shop_id UUID,
    p_customer_id UUID,
    p_amount NUMERIC(12, 2),
    p_payment_method VARCHAR(20) DEFAULT 'cash',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_shop_owner UUID;
    v_current_balance NUMERIC(12, 2);
    v_entry_id UUID;
BEGIN
    -- 1. Check shop ownership
    SELECT owner_id INTO v_shop_owner
    FROM public.shops
    WHERE id = p_shop_id;

    IF v_shop_owner IS NULL OR v_shop_owner <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this shop.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Repayment amount must be greater than zero.' USING ERRCODE = '22023';
    END IF;

    -- 3. Calculate current balance from ledger: SUM(credit) - SUM(repayment)
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0.00)
    INTO v_current_balance
    FROM public.credit_entries
    WHERE shop_id = p_shop_id AND customer_id = p_customer_id;

    IF v_current_balance <= 0 THEN
        RAISE EXCEPTION 'Customer has no outstanding credit balance to repay.' USING ERRCODE = '22023';
    END IF;

    IF p_amount > v_current_balance THEN
        RAISE EXCEPTION 'Repayment amount (₹%) exceeds total outstanding credit (₹%). Cannot make balance negative.',
            p_amount, v_current_balance USING ERRCODE = '22023';
    END IF;

    -- 4. Record repayment
    INSERT INTO public.credit_entries (
        shop_id,
        customer_id,
        entry_type,
        amount,
        payment_method,
        notes
    ) VALUES (
        p_shop_id,
        p_customer_id,
        'repayment',
        p_amount,
        p_payment_method,
        COALESCE(p_notes, 'Repayment received')
    ) RETURNING id INTO v_entry_id;

    RETURN jsonb_build_object(
        'success', true,
        'entry_id', v_entry_id,
        'repaid_amount', p_amount,
        'remaining_balance', (v_current_balance - p_amount)
    );
END;
$$;


-- ============================================================================
-- 6. DATABASE SECURITY TESTS & VERIFICATION SCRIPT
-- Tests both ALLOWED operations for shop owner and DENIED operations across shops
-- ============================================================================
/*
-- TEST 1: Tenant A cannot select products of Tenant B
-- Expected: Tenant A queries public.products and only sees products with their own shop_id

-- TEST 2: Tenant A cannot insert a product forged with Tenant B's shop_id
-- Expected: Fails with RLS violation (policy "Shop owners can insert their products")

-- TEST 3: Tenant A cannot trigger create_sale_transaction using Tenant B's shop_id
-- Expected: Raises error 'Unauthorized: You do not own this shop.'

-- TEST 4: Repayment cannot exceed customer balance
-- Expected: Raises error 'Repayment amount exceeds total outstanding credit'

-- TEST 5: Atomic rollback on overselling
-- Expected: If product A has 2 units and cart requests 5 units, entire transaction rolls back
--           and no sales, sale_items, or stock changes are committed.
*/
