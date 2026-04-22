import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportObservations from "@/components/student/report/ReportObservations";

describe("ReportObservations", () => {
  it("does not render when observations list is empty", () => {
    const { container } = render(<ReportObservations observations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders each observation as a list item and includes a disclaimer", () => {
    render(
      <ReportObservations
        observations={["Primeira observação.", "Segunda observação."]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(screen.getByText(/sugestões geradas a partir dos dados/i)).toBeInTheDocument();
  });
});
