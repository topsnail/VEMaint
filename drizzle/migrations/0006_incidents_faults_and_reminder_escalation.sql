ALTER TABLE `reminders` ADD `severity` text DEFAULT 'normal' NOT NULL;
--> statement-breakpoint
ALTER TABLE `reminders` ADD `is_escalated` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE `incidents` (
  `id` text PRIMARY KEY NOT NULL,
  `asset_id` text NOT NULL,
  `kind` text NOT NULL,
  `event_date` text NOT NULL,
  `location` text,
  `detail` text,
  `penalty` text,
  `status` text,
  `claim_amount` text,
  `repair_detail` text,
  `r2_key` text,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `incidents_asset_date_idx` ON `incidents` (`asset_id`,`event_date`);
--> statement-breakpoint
CREATE TABLE `fault_events` (
  `id` text PRIMARY KEY NOT NULL,
  `asset_id` text NOT NULL,
  `fault_code` text NOT NULL,
  `symptom` text,
  `event_date` text NOT NULL,
  `resolved_date` text,
  `is_rework` integer DEFAULT false NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fault_events_asset_date_idx` ON `fault_events` (`asset_id`,`event_date`);
