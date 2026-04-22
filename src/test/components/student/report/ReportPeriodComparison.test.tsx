import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReportPeriodComparison from "@/components/student/report/ReportPeriodComparison";

const diffZero = {
  adaptationsDelta: 0,
  distinctBarriersDelta: 0,
  strategiesDelta: 0,
  adaptationsPercent: null,
  distinctBarriersPercent: null,
  strategiesPercent: null,
};

const diffMixed = {
  adaptationsDelta: 3,
  distinctBarriersDelta: -1,
  strategiesDelta: 0,
  adaptationsPercent: 50,
  distinctBarriersPercent: -25,
  strategiesPercent: 0,
};

describe("ReportPeriodComparison", () => {
  it("renders toggle buttons for 30d and 60d", () => {
    render(
      <ReportPeriodComparison
        preset="LAST_30_DAYS"
        diff={diffZero}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /30 dias/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /60 dias/i })).toBeInTheDocument();
  });

  it("calls onChange when the user toggles to 60 dias", () => {
    const onChange = vi.fn();
    render(
      <ReportPeriodComparison
        preset="LAST_30_DAYS"
        diff={diffZero}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /60 dias/i }));
    expect(onChange).toHaveBeenCalledWith("LAST_60_DAYS");
  });

  it("shows up arrow for positive delta and down arrow for negative", () => {
    render(
      <ReportPeriodComparison
        preset="LAST_30_DAYS"
        diff={diffMixed}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/\+3/)).toBeInTheDocument();
    expect(screen.getByText(/-1/)).toBeInTheDocument();
  });
});
