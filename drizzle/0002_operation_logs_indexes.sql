CREATE INDEX IF NOT EXISTS idx_operation_logs_action_created ON operation_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_actor_created ON operation_logs(actor_username, created_at DESC);
