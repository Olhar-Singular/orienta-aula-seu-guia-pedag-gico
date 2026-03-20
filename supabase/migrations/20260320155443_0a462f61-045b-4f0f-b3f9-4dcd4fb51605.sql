
-- Add tokens_source column
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS tokens_source text DEFAULT 'api';

-- Add cost index
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_cost ON ai_usage_logs(cost_total DESC);
