import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportAdaptationsTimeline from "@/components/student/report/ReportAdaptationsTimeline";

describe("ReportAdaptationsTimeline", () => {
  it("hides the chart when there is fewer than 2 points", () => {
    const { container } = render(
      <ReportAdaptationsTimeline data={[{ month: "2026-03", count: 5 }]} />
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText(/precisa de pelo menos 2/i)).toBeInTheDocument();
  });

  it("does not show the not-enough-data message when there are 2+ points", () => {
    render(
      <ReportAdaptationsTimeline
        data={[
          { month: "2026-02", count: 1 },
          { month: "2026-03", count: 5 },
        ]}
      />
    );
    expect(screen.queryByText(/precisa de pelo menos 2/i)).toBeNull();
    expect(screen.getByText(/evolução temporal/i)).toBeInTheDocument();
  });
});
