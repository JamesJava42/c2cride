CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE status != 'archived';
CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE status != 'archived';

CREATE TABLE drivers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL,
  approval_status driver_approval_status NOT NULL DEFAULT 'pending',
  documents_complete BOOLEAN NOT NULL DEFAULT FALSE,
  background_check_status background_check_status NOT NULL DEFAULT 'pending',
  reliability_score NUMERIC(5,2) NOT NULL DEFAULT 100
    CHECK (reliability_score BETWEEN 0 AND 100),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  background_check_completed_at TIMESTAMPTZ,
  insurance_verified_at TIMESTAMPTZ
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  seat_capacity INT NOT NULL CHECK (seat_capacity BETWEEN 1 AND 4),
  insurance_expiry DATE NOT NULL
);

CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  type document_type NOT NULL,
  file_ref TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE driver_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  shift_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  app_version TEXT
);
CREATE UNIQUE INDEX idx_driver_session_active
  ON driver_sessions(driver_id) WHERE ended_at IS NULL;

CREATE TABLE driver_locations (
  driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  coords GEOGRAPHY(POINT,4326) NOT NULL,
  heading NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_driver_locations_coords ON driver_locations USING GIST(coords);

CREATE TABLE driver_location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  ride_assignment_id UUID,
  coords GEOGRAPHY(POINT,4326) NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dlh_coords ON driver_location_history USING GIST(coords);
CREATE INDEX idx_dlh_driver_ride ON driver_location_history(driver_id, ride_assignment_id);