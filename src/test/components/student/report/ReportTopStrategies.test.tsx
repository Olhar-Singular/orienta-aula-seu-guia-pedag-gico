import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportTopStrategies from "@/components/student/report/ReportTopStrategies";

describe("ReportTopStrategies", () => {
  it("renders empty state when no strategies", () => {
    render(<ReportTopStrategies data={[]} />);
    expect(screen.getByText(/sem estratégias/i)).toBeInTheDocument();
  });

  it("renders up to 5 strategies and includes the disclaimer", () => {
    const data = Array.from({ length: 7 }, (_, i) => ({
      name: `Estratégia ${i + 1}`,
      count: 7 - i,
    }));
    render(<ReportTopStrategies data={data} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(screen.getByText(/eficácia/i)).toBeInTheDocument();
  });
});
