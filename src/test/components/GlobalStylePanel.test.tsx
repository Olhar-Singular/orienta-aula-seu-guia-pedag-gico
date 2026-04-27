import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GlobalStylePanel from "@/components/adaptation/pdf-preview/GlobalStylePanel";

beforeEach(() => {
  localStorage.clear();
});

describe("GlobalStylePanel", () => {
  it("renderiza painel colapsado por padrão e expande ao clicar no header", () => {
    render(<GlobalStylePanel onApply={vi.fn()} />);

    // Header sempre visível
    expect(screen.getByText("Edição global")).toBeTruthy();
    // Botão de aplicar não visível antes de expandir
    expect(screen.queryByRole("button", { name: /Aplicar a toda a prova/i })).toBeNull();

    fireEvent.click(screen.getByText("Edição global"));
    expect(screen.getByRole("button", { name: /Aplicar a toda a prova/i })).toBeTruthy();
  });

  it("não chama onApply ao mexer em controles, apenas no clique do botão", () => {
    const onApply = vi.fn();
    render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    // Marcar checkbox de "incluir" não dispara
    const includeCheckbox = screen.getByRole("checkbox", { name: /incluir tamanho/i });
    fireEvent.click(includeCheckbox);
    expect(onApply).not.toHaveBeenCalled();

    // Mudar select tamanho não dispara
    const fontSizeSelect = screen.getByRole("combobox", { name: "Tamanho" });
    fireEvent.change(fontSizeSelect, { target: { value: "16" } });
    expect(onApply).not.toHaveBeenCalled();

    // Apenas o clique no botão dispara
    fireEvent.click(screen.getByRole("button", { name: /Aplicar a toda a prova/i }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("envia somente os campos com toggle 'incluir' marcado", () => {
    const onApply = vi.fn();
    render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    // Marca somente fontSize
    fireEvent.click(screen.getByRole("checkbox", { name: /incluir tamanho/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Tamanho" }), { target: { value: "18" } });

    fireEvent.click(screen.getByRole("button", { name: /Aplicar a toda a prova/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ fontSize: true }),
        style: expect.objectContaining({ fontSize: 18 }),
      }),
    );
    const arg = onApply.mock.calls[0][0];
    expect(arg.include.bold).toBeFalsy();
    expect(arg.include.fontFamily).toBeFalsy();
    expect(arg.include.color).toBeFalsy();
  });

  it("paleta de cor aceita seleção e propaga ao apply", () => {
    const onApply = vi.fn();
    render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    fireEvent.click(screen.getByRole("checkbox", { name: /incluir cor/i }));
    fireEvent.click(screen.getByRole("button", { name: /Vermelho/i }));

    fireEvent.click(screen.getByRole("button", { name: /Aplicar a toda a prova/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ color: true }),
        style: expect.objectContaining({ color: "#dc2626" }),
      }),
    );
  });

  it("persiste última configuração em localStorage e hidrata ao remontar", () => {
    const onApply = vi.fn();
    const { unmount } = render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    fireEvent.click(screen.getByRole("checkbox", { name: /incluir tamanho/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Tamanho" }), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /Aplicar a toda a prova/i }));

    expect(localStorage.getItem("pdf-editor-global-style")).toBeTruthy();

    unmount();

    render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    const select = screen.getByRole("combobox", { name: "Tamanho" }) as HTMLSelectElement;
    expect(select.value).toBe("20");
    const includeCb = screen.getByRole("checkbox", { name: /incluir tamanho/i }) as HTMLInputElement;
    expect(includeCb.checked).toBe(true);
  });

  it("botão Aplicar fica desabilitado quando nenhum campo está incluído", () => {
    const onApply = vi.fn();
    render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    const applyBtn = screen.getByRole("button", { name: /Aplicar a toda a prova/i });
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true);

    // Ao incluir um campo, habilita
    fireEvent.click(screen.getByRole("checkbox", { name: /incluir tamanho/i }));
    expect((applyBtn as HTMLButtonElement).disabled).toBe(false);

    // Desligando, volta a desabilitar
    fireEvent.click(screen.getByRole("checkbox", { name: /incluir tamanho/i }));
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("aplica spacing/indent globais quando flags marcadas", () => {
    const onApply = vi.fn();
    render(<GlobalStylePanel onApply={onApply} />);
    fireEvent.click(screen.getByText("Edição global"));

    fireEvent.click(screen.getByRole("checkbox", { name: /incluir espaçamento entre questões/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /incluir recuo de alternativas/i }));

    fireEvent.click(screen.getByRole("button", { name: /Aplicar a toda a prova/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        includeQuestionSpacing: true,
        includeAlternativeIndent: true,
      }),
    );
  });
});
