CREATE TYPE user_role AS ENUM ('rider','driver','admin');
CREATE TYPE user_status AS ENUM ('active','suspended','archived');
CREATE TYPE driver_approval_status AS ENUM ('pending','approved','rejected','suspended');
CREATE TYPE background_check_status AS ENUM ('pending','clear','failed');
CREATE TYPE document_type AS ENUM ('license','registration','insurance','photo','background');
CREATE TYPE ride_status AS ENUM (
  'draft','requested','searching_driver','offer_pending',
  'driver_accepted','driver_enroute_pickup','driver_arrived',
  'rider_checked_in','trip_in_progress','completed',
  'admin_queue','reassigning_driver',
  'cancelled_by_rider','cancelled_by_driver','cancelled_by_admin',
  'rider_no_show','driver_no_show','expired_unassigned'
);
CREATE TYPE offer_response AS ENUM ('pending','accepted','declined','expired');
CREATE TYPE assignment_status AS ENUM ('active','cancelled','completed','reassigned','expired');
CREATE TYPE actor_role AS ENUM ('rider','driver','admin','system');
CREATE TYPE payment_status AS ENUM ('pending','manual','captured','refunded');