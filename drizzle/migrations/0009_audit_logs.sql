CREATE TABLE `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_user_id` text,
  `actor_username` text,
  `actor_role` text,
  `action` text NOT NULL,
  `target` text,
  `detail` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);

