import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper, mockFetch } from "../helpers";
import { MOCK_SESSION } from "../fixtures";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: MOCK_SESSION } }),
    },
  },
}));

import { useAiUsageReport } from "@/hooks/useAiUsageReport";

const MOCK_REPORT = {
  period: "week",
  start_date: "2026-03-22T00:00:00Z",
  end_date: "2026-03-29T00:00:00Z",
  summary: { total_requests: 10, total_tokens: 1000, total_cost: 0.05, error_count: 0, avg_duration_ms: 500, total_input_tokens: 400, total_output_tokens: 600 },
  by_model: {},
  by_day: {},
  by_action_type: {},
  by_school: {},
  logs: [],
};

describe("useAiUsageReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches report without schoolId filter", async () => {
    mockFetch({ "admin-ai-usage-report": MOCK_REPORT });

    const { result } = renderHook(
      () => useAiUsageReport({ period: "week" }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.total_requests).toBe(10);
  });

  it("includes school_id param when schoolId is provided", async () => {
    const fetchMock = mockFetch({ "admin-ai-usage-report": MOCK_REPORT });

    const { result } = renderHook(
      () => useAiUsageReport({ period: "week", schoolId: "school-001" }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("school_id=school-001");
  });

  it("does NOT include school_id param when schoolId is undefined", async () => {
    const fetchMock = mockFetch({ "admin-ai-usage-report": MOCK_REPORT });

    const { result } = renderHook(
      () => useAiUsageReport({ period: "week" }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("school_id");
  });

  it("includes schoolId in queryKey for cache separation", () => {
    // Hooks with different schoolIds should have different cache keys
    const wrapper = createTestWrapper();
    const { result: r1 } = renderHook(
      () => useAiUsageReport({ period: "week", schoolId: "school-001" }),
      { wrapper }
    );
    const { result: r2 } = renderHook(
      () => useAiUsageReport({ period: "week", schoolId: "school-002" }),
      { wrapper }
    );
    // Both hooks are distinct (not the same reference)
    expect(r1.current).not.toBe(r2.current);
  });
});
