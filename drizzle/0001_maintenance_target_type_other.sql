PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS maintenance_records_new (
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

INSERT INTO maintenance_records_new (
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, cost,
  vendor, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
)
SELECT
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, cost,
  vendor, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
FROM maintenance_records;

DROP TABLE maintenance_records;
ALTER TABLE maintenance_records_new RENAME TO maintenance_records;
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_date ON maintenance_records(vehicle_id, maintenance_date);

PRAGMA foreign_keys = ON;
