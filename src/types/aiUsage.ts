// PostgREST returns NUMERIC columns as strings to preserve precision; the
// admin-ai-usage-report edge function normalizes them to numbers before
// returning. Components must still defend against either shape.
export type Numericish = number | string;

export interface AiUsageLog {
  id: string;
  user_id: string | null;
  school_id: string | null;
  action_type: string;
  model: string;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_input: Numericish;
  cost_output: Numericish;
  cost_total: Numericish;
  request_duration_ms: number | null;
  status: "success" | "error" | "timeout";
  error_message: string | null;
  metadata: Record<string, unknown>;
  tokens_source?: "api" | "estimated" | "unknown";
  created_at: string;
}

export interface AiUsageSummary {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
  error_count: number;
  avg_duration_ms: number;
}

export interface AiUsageByModel {
  [model: string]: {
    requests: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
  };
}

export interface AiUsageByDay {
  [date: string]: {
    requests: number;
    tokens: number;
    cost: number;
  };
}

export interface AiUsageBySchool {
  [schoolId: string]: {
    school_name: string;
    requests: number;
    total_tokens: number;
    total_cost: number;
  };
}

export interface AiUsageReport {
  period: "day" | "week" | "month";
  start_date: string;
  end_date: string;
  summary: AiUsageSummary;
  by_model: AiUsageByModel;
  by_day: AiUsageByDay;
  by_action_type: Record<string, { requests: number; tokens: number; cost: number }>;
  by_school: AiUsageBySchool;
  logs: AiUsageLog[];
}
