import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StepActivityType from "@/components/adaptation/steps/activity-type/StepActivityType";

describe("StepActivityType", () => {
  it("renders all activity types", () => {
    render(<StepActivityType value={null} onChange={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Prova")).toBeInTheDocument();
    expect(screen.getByText("Exercícios")).toBeInTheDocument();
    expect(screen.getByText("Atividade de Casa")).toBeInTheDocument();
    expect(screen.getByText("Trabalho")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<StepActivityType value={null} onChange={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Qual tipo de atividade você quer adaptar?")).toBeInTheDocument();
  });

  it("disables Próximo button when no value selected", () => {
    render(<StepActivityType value={null} onChange={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Próximo")).toBeDisabled();
  });

  it("enables Próximo button when value is selected", () => {
    render(<StepActivityType value="prova" onChange={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Próximo")).not.toBeDisabled();
  });

  it("calls onChange when an activity type is clicked", () => {
    const onChange = vi.fn();
    render(<StepActivityType value={null} onChange={onChange} onNext={vi.fn()} />);
    fireEvent.click(screen.getByText("Prova"));
    expect(onChange).toHaveBeenCalledWith("prova");
  });

  it("calls onNext when Próximo is clicked", () => {
    const onNext = vi.fn();
    render(<StepActivityType value="prova" onChange={vi.fn()} onNext={onNext} />);
    fireEvent.click(screen.getByText("Próximo"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("applies selected styling to the active card", () => {
    render(<StepActivityType value="exercicio" onChange={vi.fn()} onNext={vi.fn()} />);
    const exercicioCard = screen.getByText("Exercícios").closest("[class*='cursor-pointer']");
    expect(exercicioCard?.className).toContain("ring-2");
  });

  it("shows descriptions for each type", () => {
    render(<StepActivityType value={null} onChange={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Avaliação formal com questões")).toBeInTheDocument();
    expect(screen.getByText("Atividade prática em sala")).toBeInTheDocument();
    expect(screen.getByText("Tarefa para fazer em casa")).toBeInTheDocument();
    expect(screen.getByText("Projeto ou trabalho avaliativo")).toBeInTheDocument();
  });
});
