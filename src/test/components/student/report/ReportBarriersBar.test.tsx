import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportBarriersBar from "@/components/student/report/ReportBarriersBar";

describe("ReportBarriersBar", () => {
  it("renders empty-state when there is no data", () => {
    render(<ReportBarriersBar data={[]} />);
    expect(screen.getByText(/sem barreiras/i)).toBeInTheDocument();
  });

  it("limits output to top 8 bars", () => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      barrierKey: `barrier_${i}`,
      dimension: "tdah",
      count: 12 - i,
    }));
    render(<ReportBarriersBar data={data} />);
    const bars = screen.getAllByRole("listitem");
    expect(bars).toHaveLength(8);
  });

  it("shows the human-readable label from BARRIER_DIMENSIONS", () => {
    render(
      <ReportBarriersBar
        data={[
          {
            barrierKey: "tdah_atencao_sustentada",
            dimension: "tdah",
            count: 3,
          },
        ]}
      />
    );
    expect(
      screen.getByText(/Dificuldade de atenção sustentada/i)
    ).toBeInTheDocument();
  });
});
