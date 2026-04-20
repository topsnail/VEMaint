-- 用户数据
INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, updated_at) VALUES
('u-admin', 'admin', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'admin', datetime('now'), datetime('now')),
('u-maint', 'maintainer', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 'maintainer', datetime('now'), datetime('now')),
('u-reader', 'reader', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, username, password_hash, role, disabled, created_at, updated_at) VALUES
('u-admin-2', 'admin2', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'admin', 0, datetime('now', '-14 days'), datetime('now', '-14 days')),
('u-maint-2', 'maint2', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 'maintainer', 0, datetime('now', '-10 days'), datetime('now', '-8 days')),
('u-maint-3', 'maint3', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 'maintainer', 1, datetime('now', '-9 days'), datetime('now', '-1 days')),
('u-reader-2', 'reader2', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', 0, datetime('now', '-7 days'), datetime('now', '-7 days')),
('u-reader-3', 'reader3', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', 1, datetime('now', '-5 days'), datetime('now', '-2 days')),
('u-audit', 'auditor', '128a1cb71e153e042708de7ea043d9a030fc1a83fa258788e7ef7aa23309eb72', 'reader', 0, datetime('now', '-3 days'), datetime('now', '-3 days'));

-- 车辆台账数据
INSERT OR IGNORE INTO vehicles (
  id, plate_no, vehicle_type, brand_model, vin, engine_no, reg_date, load_spec, usage_nature,
  owner_dept, owner_person, mileage, purchase_date, purchase_cost, service_life_years, scrap_date, disposal_method,
  status, remark, created_at, updated_at
) VALUES
('v-1', '粤A12345', '轻型货车', '江淮 帅铃', 'LJ11KBBC5M9123456', '4DA1-77821', '2021-03-20', '1.5t', '货运', '工程一部', '张伟', 83500, '2021-03-10', 186000, 8, '2029-03-10', '达到年限后统一处置', 'normal', '运输主力车', datetime('now'), datetime('now')),
('v-2', '粤B99881', 'SUV', '丰田 汉兰达', 'LFMJW30J8M1234567', 'A25A-99001', '2022-07-01', '7座', '非营运', '综合办公室', '何敏', 62000, '2022-06-18', 298000, 8, '2030-06-18', '置换更新', 'normal', '行政保障', datetime('now'), datetime('now')),
('v-3', '粤C77662', '重型货车', '东风天龙', 'LGAFWB9M5N8123456', 'DCI11-90211', '2020-11-20', '8t', '货运', '工程二部', '马强', 142000, '2020-11-01', 420000, 10, '2030-11-01', '公开拍卖', 'normal', '长途运输', datetime('now'), datetime('now')),
('v-4', '粤D66889', '面包车', '上汽大通 V80', 'LSFA9A4M7P3123456', 'SC28R-12203', '2023-02-15', '7座', '营运', '后勤保障部', '李涛', 45800, '2023-01-26', 168000, 8, '2031-01-26', '到期置换', 'repairing', '近期在厂维修', datetime('now'), datetime('now')),
('v-5', '粤E55220', '工程车', '徐工 高空作业车', 'LXCJZB4F2N7123456', 'YC4D-88110', '2019-06-11', '2人/3t', '生产作业', '工程三部', '周健', 176500, '2019-05-28', 560000, 10, '2029-05-28', '以旧换新', 'stopped', '阶段性停用', datetime('now'), datetime('now')),
('v-6', '粤F33917', '客车', '宇通 ZK6729', 'LZYTBB2C8R1123456', 'WP4.1NQ190', '2018-09-22', '19座', '营运', '通勤车队', '陈龙', 238200, '2018-09-01', 338000, 8, '2026-09-01', '报废拆解', 'scrapped', '达到报废年限', datetime('now'), datetime('now')),
('v-7', '粤G99003', '轿车', '比亚迪 秦PLUS DM-i', 'LGXCE4CB8P6123456', 'BYD-476ZQB', '2024-05-06', '5座', '公务', '综合办公室', '刘静', 12600, '2024-04-20', 139800, 8, '2032-04-20', '置换更新', 'normal', '新购置车辆', datetime('now'), datetime('now')),
('v-8', '粤H77125', '货车', '解放 J6L', 'LFWXGR8M2P9123456', 'CA6DK1-45110', '2021-12-03', '6t', '货运', '仓储物流部', '王彬', 98600, '2021-11-15', 468000, 10, '2031-11-15', '公开竞价处置', 'normal', '干线运输', datetime('now'), datetime('now')),
-- 新增车辆
('v-9', '粤I88888', '轿车', '大众 帕萨特', 'WVWZZZ3CZAE123456', 'EA888-12345', '2023-08-15', '5座', '公务', '综合办公室', '张总', 35000, '2023-08-01', 218000, 8, '2031-08-01', '置换更新', 'normal', '总经理专车', datetime('now'), datetime('now')),
('v-10', '粤J99999', 'SUV', '本田 CR-V', '5J6RW2H5XFL123456', 'L15B7-67890', '2024-01-20', '5座', '非营运', '销售部', '李经理', 8500, '2024-01-10', 198000, 8, '2032-01-10', '置换更新', 'normal', '销售部用车', datetime('now'), datetime('now')),
('v-11', '粤K77777', '轻型货车', '福田 奥铃', 'LVBV3PBN8FE123456', '4J28TC3-56789', '2022-05-10', '2t', '货运', '物流部', '王师傅', 65000, '2022-04-25', 156000, 8, '2030-04-25', '达到年限后统一处置', 'normal', '市内配送', datetime('now'), datetime('now')),
('v-12', '粤L66666', '工程车', '三一 挖掘机', 'SY135C-123456789', 'D06FCE-98765', '2020-03-15', '13.5t', '生产作业', '工程一部', '赵师傅', 98000, '2020-03-01', 860000, 10, '2030-03-01', '以旧换新', 'normal', '工程主力设备', datetime('now'), datetime('now'));

-- 车辆周期数据
INSERT OR IGNORE INTO vehicle_cycles (
  id, vehicle_id, insurance_type, insurance_vendor, insurance_start, insurance_expiry, insurance_attachment_key,
  annual_last_date, annual_expiry, maint_last_date, maint_interval_days, maint_interval_km, maint_next_date, maint_next_km,
  created_at, updated_at
) VALUES
('c-1', 'v-1', '交强+商业', '人保', '2025-08-20', '2026-08-20', 'demo/insurance/v-1-policy.pdf', '2025-05-10', '2026-05-10', '2025-12-01', 180, 10000, '2026-06-01', 92000, datetime('now'), datetime('now')),
('c-2', 'v-2', '交强+商业', '平安', '2025-07-01', '2026-07-01', 'demo/insurance/v-2-policy.pdf', '2025-07-15', '2026-07-15', '2025-11-10', 180, 10000, '2026-05-10', 71500, datetime('now'), datetime('now')),
('c-3', 'v-3', '交强+商业', '阳光保险', '2025-10-01', '2026-10-01', 'demo/insurance/v-3-policy.pdf', '2025-11-12', '2026-11-12', '2026-01-18', 150, 12000, '2026-06-18', 154000, datetime('now'), datetime('now')),
('c-4', 'v-4', '交强+商业', '太平洋保险', '2025-09-01', '2026-09-01', 'demo/insurance/v-4-policy.pdf', '2025-04-12', '2026-04-12', '2026-01-20', 120, 8000, '2026-05-20', 53800, datetime('now'), datetime('now')),
('c-5', 'v-5', '交强', '中华联合', '2025-06-15', '2026-06-15', 'demo/insurance/v-5-policy.pdf', '2025-06-20', '2026-06-20', '2025-12-10', 180, 12000, '2026-06-08', 188500, datetime('now'), datetime('now')),
('c-6', 'v-6', '交强+商业', '人保', '2024-08-01', '2025-08-01', 'demo/insurance/v-6-policy.pdf', '2024-10-01', '2025-10-01', '2025-04-01', 180, 10000, '2025-10-01', 248000, datetime('now'), datetime('now')),
('c-7', 'v-7', '交强+商业', '平安', '2025-05-18', '2026-05-18', 'demo/insurance/v-7-policy.pdf', '2025-05-20', '2026-05-20', '2026-03-01', 180, 10000, '2026-08-28', 22000, datetime('now'), datetime('now')),
('c-8', 'v-8', '交强+商业', '太平', '2025-11-10', '2026-11-10', 'demo/insurance/v-8-policy.pdf', '2025-11-20', '2026-11-20', '2026-02-15', 150, 12000, '2026-07-15', 110000, datetime('now'), datetime('now')),
-- 新增车辆周期
('c-9', 'v-9', '交强+商业', '人保', '2025-09-01', '2026-09-01', 'demo/insurance/v-9-policy.pdf', '2025-09-15', '2026-09-15', '2026-02-01', 180, 10000, '2026-07-30', 45000, datetime('now'), datetime('now')),
('c-10', 'v-10', '交强+商业', '平安', '2025-02-01', '2026-02-01', 'demo/insurance/v-10-policy.pdf', '2025-02-10', '2026-02-10', '2026-03-01', 180, 10000, '2026-08-28', 18500, datetime('now'), datetime('now')),
('c-11', 'v-11', '交强+商业', '太平洋保险', '2025-06-01', '2026-06-01', 'demo/insurance/v-11-policy.pdf', '2025-06-10', '2026-06-10', '2026-01-01', 150, 10000, '2026-06-01', 75000, datetime('now'), datetime('now')),
('c-12', 'v-12', '交强+商业', '阳光保险', '2025-04-01', '2026-04-01', 'demo/insurance/v-12-policy.pdf', '2025-04-15', '2026-04-15', '2026-01-10', 200, 15000, '2026-07-30', 113000, datetime('now'), datetime('now'));

-- 车辆维保记录
INSERT OR IGNORE INTO maintenance_records (
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, vendor, cost, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
) VALUES
('m-1', 'vehicle', 'v-1', NULL, 'routine', '2026-03-01', '常规保养', '广州快修中心', 680, '机油机滤', 83000, 'maintainer', '更换机油机滤', 'demo/maintenance/v-1-20260301.pdf', datetime('now'), datetime('now')),
('m-2', 'vehicle', 'v-1', NULL, 'fault', '2026-03-15', '轮胎更换', '粤安轮胎', 2400, '轮胎*2', 83500, 'maintainer', '前轮两条', 'demo/maintenance/v-1-20260315.pdf', datetime('now'), datetime('now')),
('m-3', 'vehicle', 'v-2', NULL, 'periodic', '2026-02-21', '制动系统检修', '南山汽修', 1300, '刹车片', 61500, 'maintainer', '更换刹车片', 'demo/maintenance/v-2-20260221.pdf', datetime('now'), datetime('now')),
('m-4', 'vehicle', 'v-3', NULL, 'routine', '2026-01-18', '常规保养', '粤北重卡服务站', 1200, '机油机滤+空气滤芯', 140000, 'maintainer', '季度保养', 'demo/maintenance/v-3-20260118.pdf', datetime('now'), datetime('now')),
('m-5', 'vehicle', 'v-4', NULL, 'fault', '2026-04-03', '变速箱异响检修', '广汇自动变速箱中心', 5200, '离合器片', 45200, 'maintainer', '待复检', 'demo/maintenance/v-4-20260403.pdf', datetime('now'), datetime('now')),
('m-6', 'vehicle', 'v-5', NULL, 'accident', '2026-02-18', '车身碰撞修复', '天河钣喷中心', 8600, '前保险杠+大灯', 175900, 'maintainer', '事故维修已结案', 'demo/maintenance/v-5-20260218.pdf', datetime('now'), datetime('now')),
('m-7', 'vehicle', 'v-7', NULL, 'routine', '2026-03-30', '首保', '比亚迪服务中心', 320, '机油机滤', 9800, 'maintainer', '首保完成', 'demo/maintenance/v-7-20260330.pdf', datetime('now'), datetime('now')),
('m-8', 'vehicle', 'v-8', NULL, 'periodic', '2026-04-09', '底盘系统检查', '粤北重卡服务站', 1500, '平衡杆胶套', 97200, 'maintainer', '建议下次更换减震', 'demo/maintenance/v-8-20260409.pdf', datetime('now'), datetime('now')),
-- 新增车辆维保记录
('m-9', 'vehicle', 'v-9', NULL, 'routine', '2026-03-10', '常规保养', '大众服务中心', 850, '机油机滤', 32000, 'maintainer', '半年保养', 'demo/maintenance/v-9-20260310.pdf', datetime('now'), datetime('now')),
('m-10', 'vehicle', 'v-10', NULL, 'routine', '2026-04-01', '首保', '本田服务中心', 450, '机油机滤', 7500, 'maintainer', '首保完成', 'demo/maintenance/v-10-20260401.pdf', datetime('now'), datetime('now')),
('m-11', 'vehicle', 'v-11', NULL, 'fault', '2026-02-20', '发动机故障', '福田服务站', 3200, '火花塞+高压线', 62000, 'maintainer', '动力不足问题已解决', 'demo/maintenance/v-11-20260220.pdf', datetime('now'), datetime('now')),
('m-12', 'vehicle', 'v-12', NULL, 'periodic', '2026-01-10', '液压系统检修', '三一服务中心', 5800, '液压油+滤芯', 95000, 'maintainer', '年度检修', 'demo/maintenance/v-12-20260110.pdf', datetime('now'), datetime('now'));

-- 设备维保记录
INSERT OR IGNORE INTO maintenance_records (
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, vendor, cost, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
) VALUES
('m-13', 'equipment', NULL, '发电机A-01', 'periodic', '2026-01-10', '发电机保养', '机电维保中心', 450, '滤芯', NULL, 'maintainer', '设备检修记录（无台账）', 'demo/maintenance/eq-a01-20260110.pdf', datetime('now'), datetime('now')),
('m-14', 'equipment', NULL, '空压机B-07', 'fault', '2026-03-12', '压力波动故障排查', '机电维保中心', 980, '压力传感器', NULL, 'maintainer', '已恢复运行', 'demo/maintenance/eq-b07-20260312.pdf', datetime('now'), datetime('now')),
('m-15', 'equipment', NULL, '焊机C-02', 'routine', '2026-04-01', '常规清理与校准', '设备保障组', 260, '清洁耗材', NULL, 'maintainer', '季度例行保养', 'demo/maintenance/eq-c02-20260401.pdf', datetime('now'), datetime('now')),
-- 新增设备维保记录
('m-16', 'equipment', NULL, '液压泵D-05', 'fault', '2026-03-20', '泄漏故障修复', '液压维修中心', 1200, '密封件', NULL, 'maintainer', '更换全部密封件', 'demo/maintenance/eq-d05-20260320.pdf', datetime('now'), datetime('now')),
('m-17', 'equipment', NULL, '叉车E-10', 'routine', '2026-02-15', '常规保养', '叉车服务站', 680, '机油+滤芯', NULL, 'maintainer', '季度保养', 'demo/maintenance/eq-e10-20260215.pdf', datetime('now'), datetime('now')),
('m-18', 'equipment', NULL, '空调F-03', 'fault', '2026-04-10', '制冷效果差', '空调维修中心', 850, '制冷剂+压缩机', NULL, 'maintainer', '已恢复正常制冷', 'demo/maintenance/eq-f03-20260410.pdf', datetime('now'), datetime('now')),
('m-19', 'equipment', NULL, '水泵G-08', 'periodic', '2026-01-25', '年度检修', '水电维修中心', 520, '轴承', NULL, 'maintainer', '更换轴承', 'demo/maintenance/eq-g08-20260125.pdf', datetime('now'), datetime('now')),
('m-20', 'equipment', NULL, '升降机H-04', 'fault', '2026-03-05', '控制系统故障', '升降机维修中心', 1800, '控制板', NULL, 'maintainer', '已修复', 'demo/maintenance/eq-h04-20260305.pdf', datetime('now'), datetime('now'));

-- 其他维保记录
INSERT OR IGNORE INTO maintenance_records (
  id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, vendor, cost, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at
) VALUES
('m-21', 'other', NULL, '办公家具', 'routine', '2026-03-15', '办公桌椅维护', '家具维修中心', 350, '螺丝+润滑油', NULL, 'maintainer', '办公室家具保养', 'demo/maintenance/other-20260315.pdf', datetime('now'), datetime('now')),
('m-22', 'other', NULL, '安防系统', 'periodic', '2026-04-05', '安防设备检修', '安防服务中心', 1200, '摄像头+传感器', NULL, 'maintainer', '季度安防检查', 'demo/maintenance/other-20260405.pdf', datetime('now'), datetime('now'));

-- 操作日志
INSERT OR IGNORE INTO operation_logs (id, actor_user_id, actor_username, action, target, detail, created_at) VALUES
('log-1', 'u-admin', 'admin', 'user.create', 'u-maint-2', '{"username":"maint2","role":"maintainer"}', datetime('now', '-10 days')),
('log-2', 'u-admin', 'admin', 'user.create', 'u-reader-2', '{"username":"reader2","role":"reader"}', datetime('now', '-7 days')),
('log-3', 'u-admin', 'admin', 'user.disable', 'u-maint-3', '{"disabled":1}', datetime('now', '-1 days')),
('log-4', 'u-admin', 'admin', 'vehicle.create', 'v-8', '{"plateNo":"粤H77125"}', datetime('now', '-6 days')),
('log-5', 'u-maint', 'maintainer', 'maintenance.create', 'm-8', '{"targetType":"vehicle","vehicleId":"v-8"}', datetime('now', '-4 days')),
('log-6', 'u-maint-2', 'maint2', 'maintenance.create', 'm-9', '{"targetType":"equipment","equipmentName":"空压机B-07"}', datetime('now', '-3 days')),
('log-7', 'u-admin-2', 'admin2', 'vehicle.status', 'v-5', '{"status":"stopped"}', datetime('now', '-2 days')),
('log-8', 'u-admin', 'admin', 'user.password.reset', 'u-reader-3', '{"username":"reader3"}', datetime('now', '-1 days')),
-- 新增操作日志
('log-9', 'u-admin', 'admin', 'vehicle.create', 'v-9', '{"plateNo":"粤I88888"}', datetime('now', '-5 days')),
('log-10', 'u-admin', 'admin', 'vehicle.create', 'v-10', '{"plateNo":"粤J99999"}', datetime('now', '-4 days')),
('log-11', 'u-maint', 'maintainer', 'maintenance.create', 'm-12', '{"targetType":"vehicle","vehicleId":"v-12"}', datetime('now', '-3 days')),
('log-12', 'u-maint-2', 'maint2', 'maintenance.create', 'm-16', '{"targetType":"equipment","equipmentName":"液压泵D-05"}', datetime('now', '-2 days')),
('log-13', 'u-admin', 'admin', 'vehicle.status', 'v-4', '{"status":"repairing"}', datetime('now', '-1 days')),
('log-14', 'u-maint', 'maintainer', 'maintenance.create', 'm-20', '{"targetType":"equipment","equipmentName":"升降机H-04"}', datetime('now')),
('log-15', 'u-admin', 'admin', 'config.update', 'system', '{"siteName":"VEMaint","warnDays":7}', datetime('now'));

-- 更新车辆使用性质
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
  WHEN 'v-9' THEN '汽油 / 公务'
  WHEN 'v-10' THEN '汽油 / 非营运'
  WHEN 'v-11' THEN '柴油 / 货运'
  WHEN 'v-12' THEN '柴油 / 生产作业'
  ELSE usage_nature
END;

-- 更新车辆载重规格
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
  WHEN 'v-9' THEN '5人 / 0t / 4948x1836x1469mm'
  WHEN 'v-10' THEN '5人 / 0t / 4694x1864x1689mm'
  WHEN 'v-11' THEN '3人 / 2t / 5995x2100x2300mm'
  WHEN 'v-12' THEN '1人 / 13.5t / 7000x2500x3500mm'
  ELSE load_spec
END;

-- 更新车辆备注
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
  WHEN 'v-9' THEN '总经理专车
档案编号: GD-VE-2023-0009
所有人: 广东维保科技有限公司
发证日期: 2023-08-20
住址: 广州市天河区珠江新城冼村路28号
行驶证附件Key: demo/driving-license/v-9-license.pdf'
  WHEN 'v-10' THEN '销售部用车
档案编号: GD-VE-2024-0010
所有人: 广东维保科技有限公司
发证日期: 2024-01-25
住址: 广州市越秀区环市东路371号
行驶证附件Key: demo/driving-license/v-10-license.pdf'
  WHEN 'v-11' THEN '市内配送
档案编号: GD-VE-2022-0011
所有人: 广东维保科技有限公司
发证日期: 2022-05-15
住址: 广州市白云区太和镇太和中路1号
行驶证附件Key: demo/driving-license/v-11-license.pdf'
  WHEN 'v-12' THEN '工程主力设备
档案编号: GD-VE-2020-0012
所有人: 广东维保科技有限公司
发证日期: 2020-03-20
住址: 广州市黄埔区开发区东区宏光路123号
行驶证附件Key: demo/driving-license/v-12-license.pdf'
  ELSE remark
END;
