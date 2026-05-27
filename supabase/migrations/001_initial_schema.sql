-- IGO PG Management — Initial Database Schema
-- Run against your Supabase project via the SQL editor or Supabase CLI.

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Owners ──────────────────────────────────────────────────────────────────
CREATE TABLE owners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  pg_name       TEXT NOT NULL,
  license       TEXT,
  price_per_unit NUMERIC(10,2),
  custom_guest_fields  JSONB DEFAULT '[]',
  custom_room_fields   JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Branches ─────────────────────────────────────────────────────────────────
CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  location        TEXT,
  address         TEXT,
  pincode         TEXT,
  gender          TEXT CHECK (gender IN ('MENS','WOMENS','BOTH')) DEFAULT 'BOTH',
  type            TEXT CHECK (type IN ('AC','NON-AC','BOTH')) DEFAULT 'BOTH',
  is_food_available BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Rooms ────────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  number        TEXT NOT NULL,
  type          TEXT CHECK (type IN ('AC','NON-AC')) DEFAULT 'NON-AC',
  capacity      INTEGER NOT NULL DEFAULT 1,
  rent          NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_day_rent  NUMERIC(10,2) DEFAULT 0,
  eb_reading    NUMERIC(10,2),
  custom_data   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, number)
);

-- ─── Beds ─────────────────────────────────────────────────────────────────────
CREATE TABLE beds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label       TEXT,           -- e.g. "Bed A", "1"
  is_occupied BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tenants ──────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  room_id         UUID REFERENCES rooms(id),
  bed_id          UUID REFERENCES beds(id),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  occupation      TEXT,
  company_college TEXT,
  address         TEXT,
  doj             DATE,
  dov             DATE,
  advance         NUMERIC(10,2) DEFAULT 0,
  advance_paid    BOOLEAN DEFAULT FALSE,
  advance_returned BOOLEAN DEFAULT FALSE,
  kyc_status      TEXT CHECK (kyc_status IN ('pending','partial','complete')) DEFAULT 'pending',
  custom_data     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KYC Documents ────────────────────────────────────────────────────────────
CREATE TABLE kyc_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- 'aadhaar', 'pan', 'photo', 'agreement'
  file_url    TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Rent Records ─────────────────────────────────────────────────────────────
CREATE TABLE rent_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  month           TEXT NOT NULL,  -- 'YYYY-MM'
  amount          NUMERIC(10,2) NOT NULL,
  paid_amount     NUMERIC(10,2) DEFAULT 0,
  is_partial      BOOLEAN DEFAULT FALSE,
  paid_at         TIMESTAMPTZ,
  late_fee        NUMERIC(10,2) DEFAULT 0,
  payment_method  TEXT CHECK (payment_method IN ('cash','upi','bank_transfer','cheque')),
  reference       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, month)
);

-- ─── Advance Ledger ───────────────────────────────────────────────────────────
CREATE TABLE advance_ledger (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  type        TEXT CHECK (type IN ('deposit','deduction','refund')) NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  reason      TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Expenses ─────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  category      TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  vendor        TEXT,
  description   TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url   TEXT,
  is_recurring  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cashbook ─────────────────────────────────────────────────────────────────
CREATE TABLE cashbook (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID NOT NULL REFERENCES branches(id),
  type        TEXT CHECK (type IN ('in','out')) NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  method      TEXT CHECK (method IN ('cash','upi','bank_transfer','cheque')) NOT NULL,
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tickets (Operations) ─────────────────────────────────────────────────────
CREATE TABLE tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  room_id       UUID REFERENCES rooms(id),
  category      TEXT CHECK (category IN ('plumbing','electrical','cleaning','wifi','food','other')) NOT NULL,
  description   TEXT NOT NULL,
  status        TEXT CHECK (status IN ('open','in_progress','resolved','closed')) DEFAULT 'open',
  assigned_to   UUID REFERENCES staff(id),
  cost          NUMERIC(10,2),
  created_by    UUID,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Staff ────────────────────────────────────────────────────────────────────
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID NOT NULL REFERENCES branches(id),
  name        TEXT NOT NULL,
  role        TEXT CHECK (role IN ('warden','cook','cleaner','security','maintenance')) NOT NULL,
  phone       TEXT,
  salary      NUMERIC(10,2) DEFAULT 0,
  joined_at   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Attendance ───────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID NOT NULL REFERENCES staff(id),
  date        DATE NOT NULL,
  status      TEXT CHECK (status IN ('present','absent','half_day','leave')) NOT NULL,
  shift_in    TIME,
  shift_out   TIME,
  UNIQUE (staff_id, date)
);

-- ─── Food Purchases ───────────────────────────────────────────────────────────
CREATE TABLE food_purchases (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID NOT NULL REFERENCES branches(id),
  vendor      TEXT,
  items       JSONB DEFAULT '[]',
  total       NUMERIC(10,2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Meal Tracking ────────────────────────────────────────────────────────────
CREATE TABLE meal_tracking (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID NOT NULL REFERENCES branches(id),
  date        DATE NOT NULL,
  meal_type   TEXT CHECK (meal_type IN ('breakfast','lunch','dinner')) NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  cost        NUMERIC(10,2) DEFAULT 0,
  UNIQUE (branch_id, date, meal_type)
);

-- ─── Inventory Items ──────────────────────────────────────────────────────────
CREATE TABLE inventory_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  room_id       UUID REFERENCES rooms(id),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  quantity      INTEGER DEFAULT 0,
  condition     TEXT CHECK (condition IN ('good','damaged','missing')) DEFAULT 'good',
  last_audited  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id             UUID NOT NULL REFERENCES branches(id),
  name                  TEXT NOT NULL,
  phone                 TEXT,
  source                TEXT CHECK (source IN ('justdial','google','referral','walkin','other')) DEFAULT 'other',
  status                TEXT CHECK (status IN ('inquiry','visit','negotiation','booking','moved_in','lost')) DEFAULT 'inquiry',
  interested_room_type  TEXT,
  visit_date            DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID REFERENCES owners(id),
  tenant_id     UUID REFERENCES tenants(id),
  staff_id      UUID REFERENCES staff(id),
  type          TEXT NOT NULL,
  file_url      TEXT,
  expiry_date   DATE,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE owners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_tracking     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;

-- Owner sees only their own record
CREATE POLICY "owners: own row" ON owners
  FOR ALL USING (auth_user_id = auth.uid());

-- Owner sees only branches they own
CREATE POLICY "branches: owner scope" ON branches
  FOR ALL USING (
    owner_id IN (SELECT id FROM owners WHERE auth_user_id = auth.uid())
  );

-- Generic branch-scoped policy helper (rooms, tenants, etc.)
-- Replace {TABLE} with the actual table name for each table.
-- All tables referencing branch_id follow the same pattern:
--   branch_id IN (SELECT id FROM branches WHERE owner_id IN
--                  (SELECT id FROM owners WHERE auth_user_id = auth.uid()))

CREATE POLICY "rooms: branch owner scope" ON rooms
  FOR ALL USING (
    branch_id IN (
      SELECT b.id FROM branches b
      JOIN owners o ON o.id = b.owner_id
      WHERE o.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "tenants: branch owner scope" ON tenants
  FOR ALL USING (
    branch_id IN (
      SELECT b.id FROM branches b
      JOIN owners o ON o.id = b.owner_id
      WHERE o.auth_user_id = auth.uid()
    )
  );

-- (Remaining tables follow the same pattern — add policies per table)
