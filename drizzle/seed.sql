INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, updated_at) VALUES
('u-admin', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', datetime('now'), datetime('now')),
('u-maint', 'maintainer', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 'maintainer', datetime('now'), datetime('now')),
('u-reader', 'reader', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, username, password_hash, role, disabled, created_at, updated_at) VALUES
('u-admin-2', 'admin2', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 0, datetime('now', '-14 days'), datetime('now', '-14 days')),
('u-maint-2', 'maint2', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 'maintainer', 0, datetime('now', '-10 days'), datetime('now', '-8 days')),
('u-maint-3', 'maint3', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 'maintainer', 1, datetime('now', '-9 days'), datetime('now', '-1 days')),
('u-reader-2', 'reader2', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', 0, datetime('now', '-7 days'), datetime('now', '-7 days')),
('u-reader-3', 'reader3', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', 1, datetime('now', '-5 days'), datetime('now', '-2 days')),
('u-audit', 'auditor', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', 0, datetime('now', '-3 days'), datetime('now', '-3 days'));

INSERT OR IGNORE INTO vehicles (
  id, plate_no, vehicle_type, brand_model, vin, engine_no, reg_date, load_spec, usage_nature,
  owner_dept, owner_person, mileage, purchase_date, purchase_cost, service_life_years, scrap_date, disposal_method,
  status, remark, created_at, updated_at
) VALUES
('v-1', '粤A12345', '轻型货车', '江淮 帅铃', 'LJ11KBBC5M9123456', '4DA1-77821', '2021-03-20', '1.5t', '货运', '工程一部', '张伟', 83500, '2021-03-10', 186000, 8, '2029-03-10', '达到年限后统一处置', 'normal', '运输主力车', datetime('now'), datetime('now')),
('v-2', '粤B99881', 'SUV', '丰田 汉兰达', 'LFMJW30J8M1234567', 'A25A-99001', '2022-07-01', '7座', '非营运', '综合办公室', '何敏', 62000, '2022-06-18', 298000, 8, '2030-06-18', '置换更新', 'normal', '行政保障', datetime('now'), datetime('now')),
('v-3', '粤C77662', '重型货车', '东风天龙', 'LGAFWB9M5N8123456', 'DCI11-90211', '2020-11-20', '8t', '货运', '工程二部', '马强', 142000, '2020-11-01', 420000, 10, '2030-11-01', '公开拍卖', 'normal', '长途运输', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO vehicle_cycles (
  id, vehicle_id, insurance_type, insurance_vendor, insurance_start, insurance_expiry, insurance_attachment_key,
  annual_last_date, annual_expiry, maint_last_date, maint_interval_days, maint_interval_km, maint_next_date, maint_next_km,
  created_at, updated_at
) VALUES
('c-1', 'v-1', '交强+商业', '人保', '2025-08-20', '2026-08-20', NULL, '2025-05-10', '2026-05-10', '2025-12-01', 180, 10000, '2026-06-01', 92000, datetime('now'), datetime('now')),
('c-2', 'v-2', '交强+商业', '平安', '2025-07-01', '2026-07-01', NULL, '2025-07-15', '2026-07-15', '2025-11-10', 180, 10000, '2026-05-10', 71500, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO vehicle_cycles (
  id, vehicle_id, insurance_type, insurance_vendor, insurance_start, insurance_expiry, insurance_attachment_key,
  annual_last_date, annual_expiry, maint_last_date, maint_interval_days, maint_interval_km, maint_next_date, maint_next_km,
  created_at, updated_at
) VALUES
('c-8', 'v-3', '交强+商业', '阳光保险', '2025-10-01', '2026-10-01', 'demo/insurance/v-3-policy.pdf', '2025-11-12', '2026-11-12', '2026-01-18', 150, 12000, '2026-06-18', 154000, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO maintenance_records (
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, vendor, cost, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
) VALUES
('m-1', 'vehicle', 'v-1', NULL, 'routine', '2026-03-01', '常规保养', '广州快修中心', 680, '机油机滤', 83000, 'maintainer', '更换机油机滤', NULL, datetime('now'), datetime('now')),
('m-2', 'vehicle', 'v-1', NULL, 'fault', '2026-03-15', '轮胎更换', '粤安轮胎', 2400, '轮胎*2', 83500, 'maintainer', '前轮两条', NULL, datetime('now'), datetime('now')),
('m-3', 'vehicle', 'v-2', NULL, 'periodic', '2026-02-21', '制动系统检修', '南山汽修', 1300, '刹车片', 61500, 'maintainer', '更换刹车片', NULL, datetime('now'), datetime('now')),
('m-4', 'equipment', NULL, '发电机A-01', 'periodic', '2026-01-10', '发电机保养', '机电维保中心', 450, '滤芯', NULL, 'maintainer', '设备检修记录（无台账）', NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO vehicles (
  id, plate_no, vehicle_type, brand_model, vin, engine_no, reg_date, load_spec, usage_nature,
  owner_dept, owner_person, mileage, purchase_date, purchase_cost, service_life_years, scrap_date, disposal_method,
  status, remark, created_at, updated_at
) VALUES
('v-4', '粤D66889', '面包车', '上汽大通 V80', 'LSFA9A4M7P3123456', 'SC28R-12203', '2023-02-15', '7座', '营运', '后勤保障部', '李涛', 45800, '2023-01-26', 168000, 8, '2031-01-26', '到期置换', 'repairing', '近期在厂维修', datetime('now'), datetime('now')),
('v-5', '粤E55220', '工程车', '徐工 高空作业车', 'LXCJZB4F2N7123456', 'YC4D-88110', '2019-06-11', '2人/3t', '生产作业', '工程三部', '周健', 176500, '2019-05-28', 560000, 10, '2029-05-28', '以旧换新', 'stopped', '阶段性停用', datetime('now'), datetime('now')),
('v-6', '粤F33917', '客车', '宇通 ZK6729', 'LZYTBB2C8R1123456', 'WP4.1NQ190', '2018-09-22', '19座', '营运', '通勤车队', '陈龙', 238200, '2018-09-01', 338000, 8, '2026-09-01', '报废拆解', 'scrapped', '达到报废年限', datetime('now'), datetime('now')),
('v-7', '粤G99003', '轿车', '比亚迪 秦PLUS DM-i', 'LGXCE4CB8P6123456', 'BYD-476ZQB', '2024-05-06', '5座', '公务', '综合办公室', '刘静', 12600, '2024-04-20', 139800, 8, '2032-04-20', '置换更新', 'normal', '新购置车辆', datetime('now'), datetime('now')),
('v-8', '粤H77125', '货车', '解放 J6L', 'LFWXGR8M2P9123456', 'CA6DK1-45110', '2021-12-03', '6t', '货运', '仓储物流部', '王彬', 98600, '2021-11-15', 468000, 10, '2031-11-15', '公开竞价处置', 'normal', '干线运输', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO vehicle_cycles (
  id, vehicle_id, insurance_type, insurance_vendor, insurance_start, insurance_expiry, insurance_attachment_key,
  annual_last_date, annual_expiry, maint_last_date, maint_interval_days, maint_interval_km, maint_next_date, maint_next_km,
  created_at, updated_at
) VALUES
('c-3', 'v-4', '交强+商业', '太平洋保险', '2025-09-01', '2026-09-01', NULL, '2025-04-12', '2026-04-12', '2026-01-20', 120, 8000, '2026-05-20', 53800, datetime('now'), datetime('now')),
('c-4', 'v-5', '交强', '中华联合', '2025-06-15', '2026-06-15', NULL, '2025-06-20', '2026-06-20', '2025-12-10', 180, 12000, '2026-06-08', 188500, datetime('now'), datetime('now')),
('c-5', 'v-6', '交强+商业', '人保', '2024-08-01', '2025-08-01', NULL, '2024-10-01', '2025-10-01', '2025-04-01', 180, 10000, '2025-10-01', 248000, datetime('now'), datetime('now')),
('c-6', 'v-7', '交强+商业', '平安', '2025-05-18', '2026-05-18', NULL, '2025-05-20', '2026-05-20', '2026-03-01', 180, 10000, '2026-08-28', 22000, datetime('now'), datetime('now')),
('c-7', 'v-8', '交强+商业', '太平', '2025-11-10', '2026-11-10', NULL, '2025-11-20', '2026-11-20', '2026-02-15', 150, 12000, '2026-07-15', 110000, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO maintenance_records (
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, vendor, cost, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
) VALUES
('m-5', 'vehicle', 'v-4', NULL, 'fault', '2026-04-03', '变速箱异响检修', '广汇自动变速箱中心', 5200, '离合器片', 45200, 'maintainer', '待复检', NULL, datetime('now'), datetime('now')),
('m-6', 'vehicle', 'v-5', NULL, 'accident', '2026-02-18', '车身碰撞修复', '天河钣喷中心', 8600, '前保险杠+大灯', 175900, 'maintainer', '事故维修已结案', NULL, datetime('now'), datetime('now')),
('m-7', 'vehicle', 'v-7', NULL, 'routine', '2026-03-30', '首保', '比亚迪服务中心', 320, '机油机滤', 9800, 'maintainer', '首保完成', NULL, datetime('now'), datetime('now')),
('m-8', 'vehicle', 'v-8', NULL, 'periodic', '2026-04-09', '底盘系统检查', '粤北重卡服务站', 1500, '平衡杆胶套', 97200, 'maintainer', '建议下次更换减震', NULL, datetime('now'), datetime('now')),
('m-9', 'equipment', NULL, '空压机B-07', 'fault', '2026-03-12', '压力波动故障排查', '机电维保中心', 980, '压力传感器', NULL, 'maintainer', '已恢复运行', NULL, datetime('now'), datetime('now')),
('m-10', 'equipment', NULL, '焊机C-02', 'routine', '2026-04-01', '常规清理与校准', '设备保障组', 260, '清洁耗材', NULL, 'maintainer', '季度例行保养', NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO operation_logs (id, actor_user_id, actor_username, action, target, detail, created_at) VALUES
('log-1', 'u-admin', 'admin', 'user.create', 'u-maint-2', '{"username":"maint2","role":"maintainer"}', datetime('now', '-10 days')),
('log-2', 'u-admin', 'admin', 'user.create', 'u-reader-2', '{"username":"reader2","role":"reader"}', datetime('now', '-7 days')),
('log-3', 'u-admin', 'admin', 'user.disable', 'u-maint-3', '{"disabled":1}', datetime('now', '-1 days')),
('log-4', 'u-admin', 'admin', 'vehicle.create', 'v-8', '{"plateNo":"粤H77125"}', datetime('now', '-6 days')),
('log-5', 'u-maint', 'maintainer', 'maintenance.create', 'm-8', '{"targetType":"vehicle","vehicleId":"v-8"}', datetime('now', '-4 days')),
('log-6', 'u-maint-2', 'maint2', 'maintenance.create', 'm-9', '{"targetType":"equipment","equipmentName":"空压机B-07"}', datetime('now', '-3 days')),
('log-7', 'u-admin-2', 'admin2', 'vehicle.status', 'v-5', '{"status":"stopped"}', datetime('now', '-2 days')),
('log-8', 'u-admin', 'admin', 'user.password.reset', 'u-reader-3', '{"username":"reader3"}', datetime('now', '-1 days'));

UPDATE vehicles
SET usage_nature = CASE id
  WHEN 'v-1' THEN '柴油 / 货运'
  WHEN 'v-2' THEN '汽油 / 非营运'
  WHEN 'v-3' THEN '柴油 / 货运'
  WHEN 'v-4' THEN '柴油 / 营运'
  WHEN 'v-5' THEN '柴油 / 生产作业'
  WHEN 'v-6' THEN '柴油 / 营运'
  WHEN 'v-7' THEN '插电混动 / 公务'
  WHEN 'v-8' THEN '柴油 / 货运'
  ELSE usage_nature
END;

UPDATE vehicles
SET load_spec = CASE id
  WHEN 'v-1' THEN '3人 / 1.5t / 5995x2200x3150mm'
  WHEN 'v-2' THEN '7人 / 0t / 4965x1930x1750mm'
  WHEN 'v-3' THEN '2人 / 8t / 12000x2550x3980mm'
  WHEN 'v-4' THEN '7人 / 0.8t / 5700x1998x2345mm'
  WHEN 'v-5' THEN '2人 / 3t / 9050x2480x3650mm'
  WHEN 'v-6' THEN '19人 / 0t / 7195x2240x3025mm'
  WHEN 'v-7' THEN '5人 / 0t / 4765x1837x1495mm'
  WHEN 'v-8' THEN '3人 / 6t / 9000x2500x3450mm'
  ELSE load_spec
END;

UPDATE vehicles
SET remark = CASE id
  WHEN 'v-1' THEN '运输主力车
档案编号: GD-VE-2021-0001
所有人: 广东维保科技有限公司
发证日期: 2021-03-25
住址: 广州市黄埔区科学大道88号
行驶证附件Key: demo/driving-license/v-1-license.pdf'
  WHEN 'v-2' THEN '行政保障
档案编号: GD-VE-2022-0002
所有人: 广东维保科技有限公司
发证日期: 2022-07-05
住址: 广州市天河区体育东路66号
行驶证附件Key: demo/driving-license/v-2-license.pdf'
  WHEN 'v-3' THEN '长途运输
档案编号: GD-VE-2020-0003
所有人: 广东维保科技有限公司
发证日期: 2020-11-25
住址: 佛山市南海区桂城街道海八路18号
行驶证附件Key: demo/driving-license/v-3-license.pdf'
  WHEN 'v-4' THEN '近期在厂维修
档案编号: GD-VE-2023-0004
所有人: 广东维保科技有限公司
发证日期: 2023-02-20
住址: 东莞市南城区莞太路188号
行驶证附件Key: demo/driving-license/v-4-license.pdf'
  WHEN 'v-5' THEN '阶段性停用
档案编号: GD-VE-2019-0005
所有人: 广东维保科技有限公司
发证日期: 2019-06-16
住址: 珠海市香洲区情侣中路99号
行驶证附件Key: demo/driving-license/v-5-license.pdf'
  WHEN 'v-6' THEN '达到报废年限
档案编号: GD-VE-2018-0006
所有人: 广东维保科技有限公司
发证日期: 2018-09-27
住址: 中山市东区博爱路22号
行驶证附件Key: demo/driving-license/v-6-license.pdf'
  WHEN 'v-7' THEN '新购置车辆
档案编号: GD-VE-2024-0007
所有人: 广东维保科技有限公司
发证日期: 2024-05-10
住址: 深圳市南山区科技南十二路2号
行驶证附件Key: demo/driving-license/v-7-license.pdf'
  WHEN 'v-8' THEN '干线运输
档案编号: GD-VE-2021-0008
所有人: 广东维保科技有限公司
发证日期: 2021-12-08
住址: 惠州市惠城区江北文昌一路11号
行驶证附件Key: demo/driving-license/v-8-license.pdf'
  ELSE remark
END;

UPDATE vehicle_cycles
SET insurance_attachment_key = CASE vehicle_id
  WHEN 'v-1' THEN 'demo/insurance/v-1-policy.pdf'
  WHEN 'v-2' THEN 'demo/insurance/v-2-policy.pdf'
  WHEN 'v-3' THEN 'demo/insurance/v-3-policy.pdf'
  WHEN 'v-4' THEN 'demo/insurance/v-4-policy.pdf'
  WHEN 'v-5' THEN 'demo/insurance/v-5-policy.pdf'
  WHEN 'v-6' THEN 'demo/insurance/v-6-policy.pdf'
  WHEN 'v-7' THEN 'demo/insurance/v-7-policy.pdf'
  WHEN 'v-8' THEN 'demo/insurance/v-8-policy.pdf'
  ELSE insurance_attachment_key
END;
