ALTER TABLE `maintenance_records` ADD `assignee` text;
--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `vendor` text;
--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `next_plan_date` text;
--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `next_plan_value` text;
--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `parts_json` text;
