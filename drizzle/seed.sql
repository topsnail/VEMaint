-- 本地示例数据（可重复执行）
INSERT OR IGNORE INTO assets (id, name, type, identifier, purchase_date, status, metadata, created_at) VALUES
  ('11111111-1111-1111-1111-111111111101', '轻型货车 A1', '车辆', '粤A·D12345', '2021-03-15', 'active', '{"载重":"1.5t"}', datetime('now')),
  ('11111111-1111-1111-1111-111111111102', '挖掘机 X3', '机械', 'GC-9088', '2020-08-01', 'active', '{"斗容":"0.6m³"}', datetime('now'));

INSERT OR IGNORE INTO maintenance_records (id, asset_id, type, date, value, cost, operator, description, r2_key, created_at) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', '保养', '2025-12-01', '82000', '680', '王工', '更换机油机滤', NULL, datetime('now')),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', '检修', '2025-11-20', '3100', '1200', '李工', '液压系统检查', NULL, datetime('now'));

INSERT OR IGNORE INTO reminders (id, asset_id, task_type, due_date, is_notified, created_at) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', '年审', '2026-05-10', 0, datetime('now')),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111102', '保养', '2026-04-20', 0, datetime('now'));
