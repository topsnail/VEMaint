DROP TABLE IF EXISTS operation_logs;
DROP TABLE IF EXISTS alert_actions;
DROP TABLE IF EXISTS maintenance_records;
DROP TABLE IF EXISTS vehicle_cycles;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'maintainer', 'reader')),
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY NOT NULL,
  plate_no TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL,
  brand_model TEXT NOT NULL,
  vin TEXT NOT NULL,
  engine_no TEXT NOT NULL,
  reg_date TEXT,
  load_spec TEXT,
  usage_nature TEXT,
  owner_dept TEXT NOT NULL,
  owner_person TEXT NOT NULL,
  mileage INTEGER NOT NULL DEFAULT 0,
  purchase_date TEXT,
  purchase_cost REAL,
  service_life_years INTEGER,
  scrap_date TEXT,
  disposal_method TEXT,
  status TEXT NOT NULL CHECK (status IN ('normal', 'repairing', 'scrapped', 'stopped')) DEFAULT 'normal',
  remark TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_cycles (
  id TEXT PRIMARY KEY NOT NULL,
  vehicle_id TEXT NOT NULL,
  insurance_type TEXT,
  insurance_vendor TEXT,
  insurance_start TEXT,
  insurance_expiry TEXT,
  insurance_attachment_key TEXT,
  annual_last_date TEXT,
  annual_expiry TEXT,
  maint_last_date TEXT,
  maint_interval_days INTEGER,
  maint_interval_km INTEGER,
  maint_next_date TEXT,
  maint_next_km INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('vehicle', 'equipment', 'other')),
  vehicle_id TEXT,
  equipment_name TEXT,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'fault', 'accident', 'periodic')),
  maintenance_date TEXT NOT NULL,
  item_desc TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  vendor TEXT,
  parts TEXT,
  mileage INTEGER,
  owner_user TEXT NOT NULL,
  remark TEXT,
  attachment_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT,
  actor_username TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  ip TEXT,
  user_agent TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_actions (
  alert_key TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'processing', 'resolved')) DEFAULT 'open',
  handler TEXT,
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate_no ON vehicles(plate_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_date ON maintenance_records(vehicle_id, maintenance_date);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

