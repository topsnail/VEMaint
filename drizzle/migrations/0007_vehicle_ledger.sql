CREATE TABLE `vehicle_ledgers` (
  `id` text PRIMARY KEY NOT NULL,
  `internal_no` text NOT NULL,
  `plate_no` text NOT NULL,
  `vehicle_type` text NOT NULL,
  `brand_model` text NOT NULL,
  `vin` text NOT NULL,
  `engine_no` text NOT NULL,
  `registration_date` text,
  `fuel_type` text NOT NULL,
  `rated_load` text,
  `department` text,
  `default_driver` text,
  `parking_location` text,
  `insurance_company` text,
  `compulsory_insurance_due` text,
  `commercial_insurance_due` text,
  `insurance_remark` text,
  `annual_inspection_due` text,
  `emission_test_date` text,
  `safety_performance_date` text,
  `total_mileage` text,
  `last_service_date` text,
  `last_service_mileage` text,
  `next_service_date` text,
  `next_service_mileage` text,
  `tire_changed_date` text,
  `battery_changed_date` text,
  `brake_changed_date` text,
  `gearbox_oil_changed_date` text,
  `usage_status` text DEFAULT '正常使用' NOT NULL,
  `common_faults` text,
  `remark` text,
  `created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vehicle_ledgers_internal_no_idx` ON `vehicle_ledgers` (`internal_no`);
--> statement-breakpoint
CREATE INDEX `vehicle_ledgers_plate_no_idx` ON `vehicle_ledgers` (`plate_no`);
