CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS farm_users (
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','worker','auditor')),
  invited_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (farm_id, user_id)
);

CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  acreage NUMERIC NOT NULL,
  centroid_lat NUMERIC,
  centroid_lon NUMERIC,
  polygon_geojson JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manufacturer TEXT,
  epa_reg_no TEXT,
  product_type TEXT,
  restricted_use BOOLEAN DEFAULT false,
  rei_hours INT,
  phi_days INT,
  label_rate_min NUMERIC,
  label_rate_max NUMERIC,
  label_rate_unit TEXT,
  allowed_crops TEXT[],
  aliases TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('spray','fertilizer','irrigation','harvest','labor','other')),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','final')) DEFAULT 'draft',
  gps_lat NUMERIC,
  gps_lon NUMERIC,
  transcript TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('activity_pdf','audit_pack_pdf','csv')),
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_farm_occurred_idx ON activities(farm_id, occurred_at);
CREATE INDEX IF NOT EXISTS activities_type_occurred_idx ON activities(type, occurred_at);
CREATE INDEX IF NOT EXISTS product_catalog_name_idx ON product_catalog(name);
CREATE INDEX IF NOT EXISTS fields_farm_idx ON fields(farm_id);
