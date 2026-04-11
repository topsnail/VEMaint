CREATE TABLE `asset_status_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `asset_id` text NOT NULL,
  `from_status` text NOT NULL,
  `to_status` text NOT NULL,
  `note` text,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_status_logs_asset_created_idx` ON `asset_status_logs` (`asset_id`,`created_at`);
