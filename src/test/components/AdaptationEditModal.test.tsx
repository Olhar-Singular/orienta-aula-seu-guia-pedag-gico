import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdaptationEditModal from "@/components/adaptation/AdaptationEditModal";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-001" }, access_token: "tok" } },
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/img.png" } })),
      })),
    },
  },
}));

describe("AdaptationEditModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Editar Questão 1",
    content: "Qual é a resposta?",
    images: [] as string[],
    initialOptions: [] as string[],
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with title when open", () => {
    render(<AdaptationEditModal {...defaultProps} />);
    expect(screen.getByText("Editar Questão 1")).toBeInTheDocument();
  });

  it("shows content in textarea", () => {
    render(<AdaptationEditModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Digite o enunciado/);
    expect(textarea).toHaveValue("Qual é a resposta?");
  });

  it("calls onSave with correct payload when saved", () => {
    const onSave = vi.fn();
    render(<AdaptationEditModal {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Qual é a resposta?",
        questionType: "dissertativa",
      })
    );
  });

  it("does not render content when closed", () => {
    render(<AdaptationEditModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Editar Questão 1")).not.toBeInTheDocument();
  });

  it("defaults to dissertativa when no options provided", () => {
    const onSave = vi.fn();
    render(<AdaptationEditModal {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ questionType: "dissertativa", options: [] })
    );
  });

  it("defaults to objetiva when options are provided", () => {
    const onSave = vi.fn();
    render(
      <AdaptationEditModal
        {...defaultProps}
        initialOptions={["Opção A", "Opção B"]}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ questionType: "objetiva" })
    );
  });

  it("shows error toast when saving with empty text", () => {
    const onSave = vi.fn();
    render(<AdaptationEditModal {...defaultProps} content="" onSave={onSave} />);
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders image section", () => {
    render(<AdaptationEditModal {...defaultProps} />);
    expect(screen.getByText("Imagens (opcional)")).toBeInTheDocument();
  });

  it("shows existing images", () => {
    render(
      <AdaptationEditModal
        {...defaultProps}
        images={["https://example.com/photo.png"]}
      />
    );
    const img = screen.getByRole("img", { name: "Imagem da questão 1" });
    expect(img).toBeInTheDocument();
  });

  it("allows changing text content", () => {
    render(<AdaptationEditModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Digite o enunciado/);
    fireEvent.change(textarea, { target: { value: "Novo enunciado" } });
    expect(textarea).toHaveValue("Novo enunciado");
  });
});
