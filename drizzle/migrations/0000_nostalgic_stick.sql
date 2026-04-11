CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`identifier` text NOT NULL,
	`purchase_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_identifier_idx` ON `assets` (`identifier`);--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`value` text,
	`cost` text,
	`operator` text,
	`description` text,
	`r2_key` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `maintenance_asset_date_idx` ON `maintenance_records` (`asset_id`,`date`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`task_type` text NOT NULL,
	`due_date` text NOT NULL,
	`is_notified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminders_due_idx` ON `reminders` (`due_date`);