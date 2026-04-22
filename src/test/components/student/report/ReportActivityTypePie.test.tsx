import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportActivityTypePie from "@/components/student/report/ReportActivityTypePie";

describe("ReportActivityTypePie", () => {
  it("renders empty-state message when no data", () => {
    render(<ReportActivityTypePie data={[]} />);
    expect(screen.getByText(/sem dados/i)).toBeInTheDocument();
  });

  it("renders the section title and legend labels with data", () => {
    render(
      <ReportActivityTypePie
        data={[
          { activityType: "exercicio", count: 3 },
          { activityType: "avaliacao", count: 1 },
        ]}
      />
    );
    expect(screen.getByText(/tipo de atividade/i)).toBeInTheDocument();
    expect(screen.getByText(/exerc[ií]cio/i)).toBeInTheDocument();
    expect(screen.getByText(/avalia/i)).toBeInTheDocument();
  });
});
