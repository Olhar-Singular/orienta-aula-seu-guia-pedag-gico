import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportDimensionBreakdown from "@/components/student/report/ReportDimensionBreakdown";

describe("ReportDimensionBreakdown", () => {
  it("renders all dimensions from BARRIER_DIMENSIONS even when some have zero count", () => {
    render(
      <ReportDimensionBreakdown
        data={[
          { dimension: "tdah", count: 5 },
          { dimension: "dislexia", count: 2 },
        ]}
      />
    );
    expect(screen.getByText(/TDAH/)).toBeInTheDocument();
    expect(screen.getByText(/Dislexia/i)).toBeInTheDocument();
    // A dimension with zero count should still render its label
    expect(screen.getByText(/Síndrome de Down/i)).toBeInTheDocument();
  });

  it("shows counts next to each dimension", () => {
    render(
      <ReportDimensionBreakdown data={[{ dimension: "tdah", count: 7 }]} />
    );
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
