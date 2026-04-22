import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportSummaryCards from "@/components/student/report/ReportSummaryCards";

describe("ReportSummaryCards", () => {
  it("renders zero state labels", () => {
    render(
      <ReportSummaryCards
        totalAdaptations={0}
        distinctActivityTypes={0}
        activeBarriers={0}
        topBarrierLabel={null}
      />
    );
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.getByText(/adaptações/i)).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders labels and counts when data is present", () => {
    render(
      <ReportSummaryCards
        totalAdaptations={5}
        distinctActivityTypes={3}
        activeBarriers={4}
        topBarrierLabel="Dificuldade de atenção sustentada"
      />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(
      screen.getByText("Dificuldade de atenção sustentada")
    ).toBeInTheDocument();
  });
});
