-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create USERS table if not exists
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure status column exists if table was created previously
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Create COMPANIES table if not exists
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create COMPANY_SIZES table if not exists
CREATE TABLE IF NOT EXISTS company_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    length_inches DECIMAL(10,4) NOT NULL,
    width_inches DECIMAL(10,4) NOT NULL,
    height_inches DECIMAL(10,4) NOT NULL,
    unit TEXT DEFAULT 'inches',
    calc_type TEXT DEFAULT 'box',
    slot_count INTEGER,
    pair_group INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create FILES table (Stores file/folder categories cleanly)
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('customer_copy', 'company_copy', 'production')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure user_id column exists if table was created previously
ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Drop legacy unique constraint if present and create user-scoped unique index
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_name_type_key;
DROP INDEX IF EXISTS idx_files_user_name_type;
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_user_name_type ON files (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)), type);

-- 6. Create CALCULATIONS table (Pricing estimations)
CREATE TABLE IF NOT EXISTS calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES company_sizes(id) ON DELETE CASCADE,
    customer_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    company_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    
    quantity_of_boxes INTEGER NOT NULL,
    ply_type INTEGER NOT NULL,
    flute_extra_percent DECIMAL(10,4) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    gsm INTEGER,
    gsm_paper INTEGER NOT NULL DEFAULT 150,
    gsm_flute INTEGER NOT NULL DEFAULT 150,
    gsm_packing INTEGER NOT NULL DEFAULT 150,
    bf INTEGER NOT NULL,
    quantity_of_data DECIMAL(10,4) NOT NULL,
    gst_percent DECIMAL(5,2) NOT NULL,
    reel_size_adjust DECIMAL(5,2) DEFAULT 0,
    cut_size_adjust DECIMAL(5,2) DEFAULT 0,
    
    reel_size DECIMAL(10,4) NOT NULL,
    cut_size DECIMAL(10,4) NOT NULL,
    paper DECIMAL(10,4) NOT NULL,
    flute DECIMAL(10,4) NOT NULL,
    weight_per_unit DECIMAL(10,6) NOT NULL,
    box_weight DECIMAL(10,6) NOT NULL,
    single_box_price DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) NOT NULL,
    grand_total DECIMAL(10,2) NOT NULL,
    
    is_duplex BOOLEAN DEFAULT false,
    duplex_price DECIMAL(10,2),
    is_laminated BOOLEAN DEFAULT false,
    lamination_price DECIMAL(10,2),
    is_printing BOOLEAN DEFAULT false,
    printing_price DECIMAL(10,2),
    is_ink BOOLEAN DEFAULT false,
    ink_price DECIMAL(10,2),
    is_screen_printing BOOLEAN DEFAULT false,
    screen_printing_price DECIMAL(10,2),
    is_callico BOOLEAN DEFAULT false,
    callico_price DECIMAL(10,2),
    
    customer_name TEXT,
    company_reference TEXT,
    calc_type TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure customer_name, company_reference, and calc_type exist on calculations table
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS company_reference TEXT;
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS calc_type TEXT;

-- 7. Create PRODUCTION_ORDERS table (Production runs)
CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES company_sizes(id) ON DELETE CASCADE,
    production_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    
    quantity_of_boxes INTEGER NOT NULL,
    ply_type INTEGER NOT NULL,
    flute_extra_percent DECIMAL(10,4) NOT NULL,
    gsm_paper INTEGER NOT NULL DEFAULT 150,
    gsm_flute INTEGER NOT NULL DEFAULT 150,
    gsm_packing INTEGER NOT NULL DEFAULT 150,
    bf INTEGER NOT NULL,
    quantity_of_data DECIMAL(10,4) NOT NULL,
    reel_size_adjust DECIMAL(5,2) DEFAULT 0,
    cut_size_adjust DECIMAL(5,2) DEFAULT 0,
    
    reel_size DECIMAL(10,4) NOT NULL,
    cut_size DECIMAL(10,4) NOT NULL,
    paper DECIMAL(10,4) NOT NULL,
    flute DECIMAL(10,4) NOT NULL,
    weight_per_unit DECIMAL(10,6) NOT NULL,
    box_weight DECIMAL(10,6) NOT NULL,
    
    p_option TEXT,
    l_option TEXT,
    ref_name TEXT,
    reel_multiplier INTEGER DEFAULT 1,
    cut_multiplier INTEGER DEFAULT 1,
    size_multiplier INTEGER DEFAULT 1,
    
    is_pad BOOLEAN DEFAULT false,
    is_partition BOOLEAN DEFAULT false,
    is_tray BOOLEAN DEFAULT false,
    is_sleave BOOLEAN DEFAULT false,
    is_coller_box BOOLEAN DEFAULT false,
    is_top_side_tray_box BOOLEAN DEFAULT false,
    is_universal_type BOOLEAN DEFAULT false,
    is_full_closing_box BOOLEAN DEFAULT false,
    
    -- New columns for paired partitions
    is_paired BOOLEAN DEFAULT false,
    p1_reel_cut TEXT,
    p2_reel_cut TEXT,
    p1_packing INTEGER DEFAULT 0,
    p2_packing INTEGER DEFAULT 0,
    p1_liner INTEGER DEFAULT 0,
    p2_liner INTEGER DEFAULT 0,
    p1_default_packing INTEGER DEFAULT 0,
    p2_default_packing INTEGER DEFAULT 0,
    p1_default_liner INTEGER DEFAULT 0,
    p2_default_liner INTEGER DEFAULT 0,
    p1_size_mm TEXT,
    p2_size_mm TEXT,
    p1_size_inch TEXT,
    p2_size_inch TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7b. Create TO_ADDRESS_PROFILES table (Quotation address profiles)
CREATE TABLE IF NOT EXISTS to_address_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    keyword TEXT NOT NULL UNIQUE,
    to_address TEXT NOT NULL,
    dear_sir TEXT NOT NULL DEFAULT 'Dear Sir,',
    kind_attn TEXT,
    subject TEXT NOT NULL DEFAULT 'Quotation for Corrugated boxes – Reg.',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index on keyword for fast lookup & case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_to_address_profiles_keyword_lower ON to_address_profiles (LOWER(TRIM(keyword)));

-- 8. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_address_profiles ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies for users, files, calculations, production_orders
DROP POLICY IF EXISTS "Allow public read access on users" ON users;
CREATE POLICY "Allow public read access on users" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on users" ON users;
CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on users" ON users;
CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on users" ON users;
CREATE POLICY "Allow public delete on users" ON users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on files" ON files;
CREATE POLICY "Allow public read access on files" ON files FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on files" ON files;
CREATE POLICY "Allow public insert on files" ON files FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on files" ON files;
CREATE POLICY "Allow public update on files" ON files FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on files" ON files;
CREATE POLICY "Allow public delete on files" ON files FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on calculations" ON calculations;
CREATE POLICY "Allow public read access on calculations" ON calculations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on calculations" ON calculations;
CREATE POLICY "Allow public insert on calculations" ON calculations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on calculations" ON calculations;
CREATE POLICY "Allow public update on calculations" ON calculations FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on calculations" ON calculations;
CREATE POLICY "Allow public delete on calculations" ON calculations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on production_orders" ON production_orders;
CREATE POLICY "Allow public read access on production_orders" ON production_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on production_orders" ON production_orders;
CREATE POLICY "Allow public insert on production_orders" ON production_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on production_orders" ON production_orders;
CREATE POLICY "Allow public update on production_orders" ON production_orders FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on production_orders" ON production_orders;
CREATE POLICY "Allow public delete on production_orders" ON production_orders FOR DELETE USING (true);

-- Create RLS policies for companies and company_sizes
DROP POLICY IF EXISTS "Allow public read access on companies" ON companies;
CREATE POLICY "Allow public read access on companies" ON companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on companies" ON companies;
CREATE POLICY "Allow public insert on companies" ON companies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on companies" ON companies;
CREATE POLICY "Allow public update on companies" ON companies FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on companies" ON companies;
CREATE POLICY "Allow public delete on companies" ON companies FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on company_sizes" ON company_sizes;
CREATE POLICY "Allow public read access on company_sizes" ON company_sizes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on company_sizes" ON company_sizes;
CREATE POLICY "Allow public insert on company_sizes" ON company_sizes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on company_sizes" ON company_sizes;
CREATE POLICY "Allow public update on company_sizes" ON company_sizes FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on company_sizes" ON company_sizes;
CREATE POLICY "Allow public delete on company_sizes" ON company_sizes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on to_address_profiles" ON to_address_profiles;
CREATE POLICY "Allow public read access on to_address_profiles" ON to_address_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on to_address_profiles" ON to_address_profiles;
CREATE POLICY "Allow public insert on to_address_profiles" ON to_address_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on to_address_profiles" ON to_address_profiles;
CREATE POLICY "Allow public update on to_address_profiles" ON to_address_profiles FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete on to_address_profiles" ON to_address_profiles;
CREATE POLICY "Allow public delete on to_address_profiles" ON to_address_profiles FOR DELETE USING (true);

-- 10. Data Migration Block (Migrates legacy 'customers' table if it exists)
DO $$
DECLARE
    r RECORD;
    cleaned_cust_name TEXT;
    cleaned_comp_ref TEXT;
    prod_file_name TEXT;
    cust_file_id UUID;
    comp_file_id UUID;
    prod_file_id UUID;
    p_opt TEXT;
    l_opt TEXT;
    r_name TEXT;
    r_mult INT;
    c_mult INT;
    s_mult INT;
    is_p BOOLEAN;
    is_part BOOLEAN;
    is_t BOOLEAN;
    is_sl BOOLEAN;
    is_cb BOOLEAN;
    is_tst BOOLEAN;
    is_ut BOOLEAN;
    is_fc BOOLEAN;
    json_data JSONB;
    
    -- New paired partition variables
    is_paired BOOLEAN;
    p1_rc TEXT;
    p2_rc TEXT;
    p1_pack INT;
    p2_pack INT;
    p1_line INT;
    p2_line INT;
    p1_def_pack INT;
    p2_def_pack INT;
    p1_def_line INT;
    p2_def_line INT;
    p1_sz_mm TEXT;
    p2_sz_mm TEXT;
    p1_sz_inch TEXT;
    p2_sz_inch TEXT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        FOR r IN SELECT * FROM customers LOOP
            IF r.grand_total > 0 THEN
                cleaned_cust_name := regexp_replace(r.customer_name, '\[Duplex:\s*₹?[\d.]+\]\s*|\[Laminated?:\s*₹?[\d.]+\]\s*|\[Printing:\s*₹?[\d.]+\]\s*|\[Ink:\s*₹?[\d.]+\]\s*|\[ScreenPrinting:\s*₹?[\d.]+\]\s*|\[Callico:\s*₹?[\d.]+\]\s*|^\[Pad\]\s*|^\[Partition\]\s*|^\[Tray\]\s*|^\[Sleave\]\s*|^\[CollerBox\]\s*|^\[TopSideTrayBox\]\s*|^\[UniversalType\]\s*|^\[FullClosingBox\]\s*', '', 'gi');
                cleaned_cust_name := trim(cleaned_cust_name);
                IF cleaned_cust_name = '' THEN cleaned_cust_name := 'Ungrouped'; END IF;
 
                INSERT INTO files (name, type) VALUES (cleaned_cust_name, 'customer_copy')
                ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cust_file_id;
 
                cleaned_comp_ref := trim(COALESCE(r.company_reference, 'Ungrouped'));
                IF cleaned_comp_ref = '' THEN cleaned_comp_ref := 'Ungrouped'; END IF;
 
                INSERT INTO files (name, type) VALUES (cleaned_comp_ref, 'company_copy')
                ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO comp_file_id;
 
                INSERT INTO calculations (
                    id, user_id, company_id, size_id, customer_file_id, company_file_id,
                    quantity_of_boxes, ply_type, flute_extra_percent, price_per_kg, gsm,
                    gsm_paper, gsm_flute, gsm_packing, bf, quantity_of_data, gst_percent,
                    reel_size_adjust, cut_size_adjust, reel_size, cut_size, paper, flute,
                    weight_per_unit, box_weight, single_box_price, total_cost, gst_amount, grand_total,
                    is_duplex, duplex_price, is_laminated, lamination_price, is_printing, printing_price,
                    is_ink, ink_price, is_screen_printing, screen_printing_price, is_callico, callico_price,
                    created_at
                )
                VALUES (
                    r.id, r.user_id, r.company_id, r.size_id, cust_file_id, comp_file_id,
                    r.quantity_of_boxes, r.ply_type, r.flute_extra_percent, r.price_per_kg, r.gsm,
                    r.gsm_paper, r.gsm_flute, r.gsm_packing, r.bf, r.quantity_of_data, r.gst_percent,
                    COALESCE(r.reel_size_adjust, 0), COALESCE(r.cut_size_adjust, 0), r.reel_size, r.cut_size, r.paper, r.flute,
                    r.weight_per_unit, r.box_weight, r.single_box_price, r.total_cost, r.gst_amount, r.grand_total,
                    (r.customer_name ILIKE '%[Duplex:%'),
                    COALESCE((regexp_match(r.customer_name, '\[Duplex:\s*₹?([\d.]+)\]', 'i'))[1]::decimal, 0),
                    (r.customer_name ILIKE '%[Laminated:%' OR r.customer_name ILIKE '%[Laminate:%'),
                    COALESCE((regexp_match(r.customer_name, '\[Laminated?:\s*₹?([\d.]+)\]', 'i'))[1]::decimal, 0),
                    (r.customer_name ILIKE '%[Printing:%'),
                    COALESCE((regexp_match(r.customer_name, '\[Printing:\s*₹?([\d.]+)\]', 'i'))[1]::decimal, 0),
                    (r.customer_name ILIKE '%[Ink:%'),
                    COALESCE((regexp_match(r.customer_name, '\[Ink:\s*₹?([\d.]+)\]', 'i'))[1]::decimal, 0),
                    (r.customer_name ILIKE '%[ScreenPrinting:%'),
                    COALESCE((regexp_match(r.customer_name, '\[ScreenPrinting:\s*₹?([\d.]+)\]', 'i'))[1]::decimal, 0),
                    (r.customer_name ILIKE '%[Callico:%'),
                    COALESCE((regexp_match(r.customer_name, '\[Callico:\s*₹?([\d.]+)\]', 'i'))[1]::decimal, 0),
                    r.created_at
                );
            ELSE
                BEGIN
                    json_data := r.customer_name::jsonb;
                EXCEPTION WHEN OTHERS THEN
                    json_data := NULL;
                END;
 
                IF json_data IS NOT NULL THEN
                    prod_file_name := trim(COALESCE(json_data->>'productionFile', 'Ungrouped'));
                    IF prod_file_name = '' THEN prod_file_name := 'Ungrouped'; END IF;
 
                    INSERT INTO files (name, type) VALUES (prod_file_name, 'production')
                    ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO prod_file_id;
 
                    p_opt := json_data->>'pOption';
                    l_opt := json_data->>'lOption';
                    r_name := json_data->>'ref';
                    r_mult := COALESCE((json_data->>'reelMultiplier')::int, 1);
                    c_mult := COALESCE((json_data->>'cutMultiplier')::int, 1);
                    s_mult := COALESCE((json_data->>'sizeMultiplier')::int, 1);
                    is_p := COALESCE((json_data->>'isPad')::boolean, false);
                    is_part := COALESCE((json_data->>'isPartition')::boolean, false);
                    is_t := COALESCE((json_data->>'isTray')::boolean, false);
                    is_sl := COALESCE((json_data->>'isSleave')::boolean, COALESCE((json_data->>'isTrayBox')::boolean, false));
                    is_cb := COALESCE((json_data->>'isCollerBox')::boolean, false);
                    is_tst := COALESCE((json_data->>'isTopSideTrayBox')::boolean, false);
                    is_ut := COALESCE((json_data->>'isUniversalType')::boolean, false);
                    is_fc := COALESCE((json_data->>'isFullClosingBox')::boolean, false);
                    
                    is_paired := COALESCE((json_data->>'isPaired')::boolean, false);
                    p1_rc := json_data->>'p1ReelCut';
                    p2_rc := json_data->>'p2ReelCut';
                    p1_pack := COALESCE((json_data->>'p1Packing')::int, 0);
                    p2_pack := COALESCE((json_data->>'p2Packing')::int, 0);
                    p1_line := COALESCE((json_data->>'p1Liner')::int, 0);
                    p2_line := COALESCE((json_data->>'p2Liner')::int, 0);
                    p1_def_pack := COALESCE((json_data->>'p1DefaultPacking')::int, 0);
                    p2_def_pack := COALESCE((json_data->>'p2DefaultPacking')::int, 0);
                    p1_def_line := COALESCE((json_data->>'p1DefaultLiner')::int, 0);
                    p2_def_line := COALESCE((json_data->>'p2DefaultLiner')::int, 0);
                    p1_sz_mm := json_data->>'p1SizeMM';
                    p2_sz_mm := json_data->>'p2SizeMM';
                    p1_sz_inch := json_data->>'p1SizeInch';
                    p2_sz_inch := json_data->>'p2SizeInch';
 
                    INSERT INTO production_orders (
                        id, user_id, company_id, size_id, production_file_id,
                        quantity_of_boxes, ply_type, flute_extra_percent, gsm_paper, gsm_flute, gsm_packing, bf, quantity_of_data,
                        reel_size_adjust, cut_size_adjust, reel_size, cut_size, paper, flute, weight_per_unit, box_weight,
                        p_option, l_option, ref_name, reel_multiplier, cut_multiplier, size_multiplier,
                        is_pad, is_partition, is_tray, is_sleave, is_coller_box, is_top_side_tray_box, is_universal_type, is_full_closing_box,
                        is_paired, p1_reel_cut, p2_reel_cut, p1_packing, p2_packing, p1_liner, p2_liner,
                        p1_default_packing, p2_default_packing, p1_default_liner, p2_default_liner,
                        p1_size_mm, p2_size_mm, p1_size_inch, p2_size_inch,
                        created_at
                    )
                    VALUES (
                        r.id, r.user_id, r.company_id, r.size_id, prod_file_id,
                        r.quantity_of_boxes, r.ply_type, r.flute_extra_percent, r.gsm_paper, r.gsm_flute, r.gsm_packing, r.bf, r.quantity_of_data,
                        COALESCE(r.reel_size_adjust, 0), COALESCE(r.cut_size_adjust, 0), r.reel_size, r.cut_size, r.paper, r.flute, r.weight_per_unit, r.box_weight,
                        p_opt, l_opt, r_name, r_mult, c_mult, s_mult,
                        is_p, is_part, is_t, is_sl, is_cb, is_tst, is_ut, is_fc,
                        is_paired, p1_rc, p2_rc, p1_pack, p2_pack, p1_line, p2_line,
                        p1_def_pack, p2_def_pack, p1_def_line, p2_def_line,
                        p1_sz_mm, p2_sz_mm, p1_sz_inch, p2_sz_inch,
                        r.created_at
                    );
                END IF;
            END IF;
        END LOOP;
 
        DROP TABLE customers CASCADE;
    END IF;
END $$;
 
-- 11. Add Indexes for Query Performance (Non-destructive)
CREATE INDEX IF NOT EXISTS idx_company_sizes_comp_type ON company_sizes(company_id, calc_type);
CREATE INDEX IF NOT EXISTS idx_calculations_company_id ON calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_calculations_customer_file_id ON calculations(customer_file_id);
CREATE INDEX IF NOT EXISTS idx_calculations_company_file_id ON calculations(company_file_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_comp_id ON production_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_prod_file ON production_orders(production_file_id);
CREATE INDEX IF NOT EXISTS idx_files_name_type ON files(name, type);

-- 12. Add columns to PRODUCTION_ORDERS table for paired partitions if they don't exist
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS is_paired BOOLEAN DEFAULT false;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_reel_cut TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_reel_cut TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_packing INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_packing INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_liner INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_liner INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_default_packing INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_default_packing INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_default_liner INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_default_liner INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_size_mm TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_size_mm TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p1_size_inch TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS p2_size_inch TEXT;

-- 13. Add columns to CALCULATIONS table for per-piece / per-unit price data (Non-destructive)
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS per_piece_price DECIMAL(10,2);
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS kraft_box_cost DECIMAL(10,2);
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS kraft_subtotal DECIMAL(10,2);
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS duplex_box_cost DECIMAL(10,2);
ALTER TABLE calculations ADD COLUMN IF NOT EXISTS duplex_subtotal DECIMAL(10,2);
