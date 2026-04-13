CREATE TABLE service_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  polygon GEOGRAPHY(POLYGON,4326) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  min_fare NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_service_zones_polygon ON service_zones USING GIST(polygon);

CREATE TABLE driver_service_zones (
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
  PRIMARY KEY (driver_id, zone_id)
);

CREATE TABLE fare_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES service_zones(id),
  base_fare NUMERIC(10,2) NOT NULL CHECK (base_fare >= 0),
  per_mile NUMERIC(10,4) NOT NULL CHECK (per_mile >= 0),
  per_minute NUMERIC(10,4) NOT NULL CHECK (per_minute >= 0),
  minimum_fare NUMERIC(10,2) NOT NULL CHECK (minimum_fare >= 0),
  pool_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rider_name_snapshot TEXT NOT NULL,
  rider_phone_snapshot TEXT NOT NULL,
  pickup_coords GEOGRAPHY(POINT,4326) NOT NULL,
  drop_coords GEOGRAPHY(POINT,4326) NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  passenger_count INT NOT NULL CHECK (passenger_count BETWEEN 1 AND 4),
  status ride_status NOT NULL DEFAULT 'draft',
  state_version INT NOT NULL DEFAULT 0,
  fare_estimate NUMERIC(10,2),
  fare_final NUMERIC(10,2),
  estimated_distance_miles NUMERIC(8,3),
  estimated_duration_minutes NUMERIC(8,1),
  quoted_base_fare NUMERIC(10,2),
  quoted_rate_snapshot JSONB,
  otp_code_hash TEXT,
  otp_generated_at TIMESTAMPTZ,
  otp_attempt_count INT NOT NULL DEFAULT 0,
  zone_id UUID REFERENCES service_zones(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT chk_expires_after_requested CHECK (expires_at IS NULL OR expires_at > requested_at)
);
CREATE INDEX idx_rr_pickup_coords ON ride_requests USING GIST(pickup_coords);
CREATE INDEX idx_rr_drop_coords ON ride_requests USING GIST(drop_coords);
CREATE INDEX idx_rr_status ON ride_requests(status);
CREATE INDEX idx_rr_rider ON ride_requests(rider_id);

CREATE TABLE ride_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  status assignment_status NOT NULL DEFAULT 'active',
  assignment_no INT NOT NULL DEFAULT 1,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  pickup_arrived_at TIMESTAMPTZ,
  trip_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  ended_reason TEXT
);
CREATE INDEX idx_ra_ride ON ride_assignments(ride_request_id);
CREATE INDEX idx_ra_driver ON ride_assignments(driver_id);

CREATE TABLE ride_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  previous_state ride_status,
  new_state ride_status NOT NULL,
  actor_id UUID,
  actor_role actor_role NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_re_ride ON ride_events(ride_request_id, created_at);

CREATE TABLE driver_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  attempt_no INT NOT NULL,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  response offer_response NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  expired_reason TEXT
);
CREATE INDEX idx_do_ride ON driver_offers(ride_request_id);
CREATE INDEX idx_do_driver ON driver_offers(driver_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE RESTRICT,
  amount_authorized NUMERIC(10,2) CHECK (amount_authorized >= 0),
  amount_captured NUMERIC(10,2) CHECK (amount_captured >= 0),
  status payment_status NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_request_id UUID REFERENCES ride_requests(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);