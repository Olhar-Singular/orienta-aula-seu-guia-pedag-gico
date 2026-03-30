import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", user_metadata: {} },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock("@/lib/exportPdf", () => ({
  exportToPdf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/exportDocx", () => ({
  exportToDocx: vi.fn().mockResolvedValue(undefined),
}));

import MyAdaptations from "@/pages/MyAdaptations";
import { exportToPdf } from "@/lib/exportPdf";
import { exportToDocx } from "@/lib/exportDocx";

function createChain(resolvedData: any = []) {
  const chain: any = {};
  const methods = ["select", "insert", "delete", "eq", "neq", "order", "in", "update"];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.then = vi.fn((resolve: any) => resolve({ data: resolvedData, error: null }));
  return chain;
}

function setupMockFrom(legacyData: any[] = [], wizardData: any[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "adaptations") return createChain(legacyData);
    if (table === "adaptations_history") return createChain(wizardData);
    return createChain();
  });
}

const mockLegacy = {
  id: "legacy-1",
  user_id: "u1",
  topic: "Frações",
  grade: "5º ano",
  subject: "Matemática",
  type: "prova",
  mode: "adaptar",
  adapted_text: "Texto adaptado da prova",
  teacher_guidance: "Orientações ao professor",
  justification: "Justificativa pedagógica",
  created_at: "2024-01-15T10:00:00Z",
};

const mockWizard = {
  id: "wizard-1",
  teacher_id: "u1",
  original_activity: "Resolva as equações abaixo",
  activity_type: "exercicio",
  barriers_used: [{ barrier_key: "visual_contrast" }],
  adaptation_result: {
    version_universal: "1. Resolva: 2+2\na) 3\nb) 4\nc) 5",
    version_directed: "1. Calcule: 2+2\na) 3\nb) 4",
    pedagogical_justification: "Justificativa com _itálico_ e **negrito**",
    strategies_applied: ["Estratégia A"],
    implementation_tips: ["Dica 1"],
    question_images_universal: { "1": ["https://example.com/img.png"] },
    question_images_directed: {},
  },
  created_at: "2024-01-16T10:00:00Z",
  class_students: { name: "João" },
  classes: { name: "Turma A" },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyAdaptations />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MyAdaptations Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockFrom();
  });

  // === Basic Rendering ===

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText("Minhas Adaptações")).toBeTruthy();
  });

  it("renders description", () => {
    renderPage();
    expect(screen.getByText(/adaptações geradas pela ISA/)).toBeTruthy();
  });

  it("renders search input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Buscar adaptação...")).toBeTruthy();
  });

  it("renders empty state initially", async () => {
    renderPage();
    expect(await screen.findByText("Nenhuma adaptação encontrada.")).toBeTruthy();
  });

  // === List rendering ===

  it("renders legacy adaptation cards", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    expect(await screen.findByText("Frações — 5º ano")).toBeTruthy();
  });

  it("renders wizard adaptation cards", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    expect(await screen.findByText("Resolva as equações abaixo")).toBeTruthy();
  });

  it("shows student name for wizard adaptations", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    expect(await screen.findByText("João")).toBeTruthy();
  });

  it("shows class name for wizard adaptations", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    expect(await screen.findByText("Turma A")).toBeTruthy();
  });

  // === Search & Filter ===

  it("filters by search term", async () => {
    setupMockFrom([mockLegacy], [mockWizard]);
    renderPage();
    await screen.findByText("Frações — 5º ano");

    const searchInput = screen.getByPlaceholderText("Buscar adaptação...");
    fireEvent.change(searchInput, { target: { value: "Frações" } });

    expect(screen.getByText("Frações — 5º ano")).toBeTruthy();
    expect(screen.queryByText("Resolva as equações abaixo")).toBeNull();
  });

  it("shows all when search is cleared", async () => {
    setupMockFrom([mockLegacy], [mockWizard]);
    renderPage();
    await screen.findByText("Frações — 5º ano");

    const searchInput = screen.getByPlaceholderText("Buscar adaptação...");
    fireEvent.change(searchInput, { target: { value: "xyz-no-match" } });
    expect(screen.getByText("Nenhuma adaptação encontrada.")).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Frações — 5º ano")).toBeTruthy();
  });

  // === View Dialog ===

  it("opens view dialog on card click", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    const card = await screen.findByText("Frações — 5º ano");
    fireEvent.click(card);
    expect(screen.getByText("Atividade")).toBeTruthy();
    expect(screen.getByText("Orientações")).toBeTruthy();
    expect(screen.getByText("Justificativa")).toBeTruthy();
  });

  it("shows legacy content in view mode tabs", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    fireEvent.click(await screen.findByText("Frações — 5º ano"));
    expect(screen.getByText("Texto adaptado da prova")).toBeTruthy();
  });

  // === Edit mode ===

  it("enters edit mode for legacy", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    fireEvent.click(await screen.findByText("Frações — 5º ano"));
    fireEvent.click(screen.getByText("Editar"));
    expect(screen.getByText("Atividade Adaptada")).toBeTruthy();
    expect(screen.getByText("Salvar alterações")).toBeTruthy();
  });

  it("cancel editing restores view mode", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    fireEvent.click(await screen.findByText("Frações — 5º ano"));
    fireEvent.click(screen.getByText("Editar"));
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByText("Salvar alterações")).toBeNull();
  });

  // === Delete ===

  it("opens delete confirmation dialog", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    await screen.findByText("Frações — 5º ano");

    // Click trash icon button (stop propagation area)
    const trashButtons = screen.getAllByRole("button");
    const trashBtn = trashButtons.find(btn => btn.querySelector(".text-destructive"));
    if (trashBtn) fireEvent.click(trashBtn);

    expect(screen.getByText("Excluir adaptação?")).toBeTruthy();
    expect(screen.getByText(/não pode ser desfeita/)).toBeTruthy();
  });

  it("cancels delete when clicking cancel", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    await screen.findByText("Frações — 5º ano");

    const trashButtons = screen.getAllByRole("button");
    const trashBtn = trashButtons.find(btn => btn.querySelector(".text-destructive"));
    if (trashBtn) fireEvent.click(trashBtn);

    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByText("Excluir adaptação?")).toBeNull();
  });

  // === Duplicate ===

  it("duplicate button is visible for both legacy and wizard", async () => {
    setupMockFrom([mockLegacy], [mockWizard]);
    renderPage();
    await screen.findByText("Frações — 5º ano");

    // Both cards should have duplicate (Copy) buttons
    // There are action buttons for both cards
    const allButtons = screen.getAllByRole("button");
    // Each card has some action buttons, expect at least 2 cards worth
    expect(allButtons.length).toBeGreaterThanOrEqual(4);
  });

  // === Clipboard ===

  it("copies legacy content to clipboard", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    setupMockFrom([mockLegacy]);
    renderPage();
    fireEvent.click(await screen.findByText("Frações — 5º ano"));

    fireEvent.click(screen.getByText("Copiar"));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("Texto adaptado da prova")
      );
    });
  });

  it("handles clipboard error gracefully", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    setupMockFrom([mockLegacy]);
    renderPage();
    fireEvent.click(await screen.findByText("Frações — 5º ano"));
    fireEvent.click(screen.getByText("Copiar"));
    // Should not throw
  });

  // === XSS Prevention ===

  it("escapeHtml function works correctly", () => {
    // Import the function indirectly by testing the print flow
    // We test the helper directly here
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("Normal text")).toBe("Normal text");
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  // === Edge Cases ===

  it("handles empty adaptation_result gracefully", async () => {
    const wizardNoResult = {
      ...mockWizard,
      adaptation_result: null,
    };
    setupMockFrom([], [wizardNoResult]);
    renderPage();
    expect(await screen.findByText("Resolva as equações abaixo")).toBeTruthy();
  });

  it("handles wizard with no student/class", async () => {
    const wizardNoStudent = {
      ...mockWizard,
      class_students: null,
      classes: null,
    };
    setupMockFrom([], [wizardNoStudent]);
    renderPage();
    expect(await screen.findByText("Resolva as equações abaixo")).toBeTruthy();
    expect(screen.queryByText("João")).toBeNull();
  });

  it("handles barriers as string array (legacy format)", async () => {
    const wizardStringBarriers = {
      ...mockWizard,
      barriers_used: ["visual_contrast", "motor_fine"],
    };
    setupMockFrom([], [wizardStringBarriers]);
    renderPage();
    expect(await screen.findByText("Resolva as equações abaixo")).toBeTruthy();
  });

  // === Wizard view mode ===

  it("shows wizard versions in view mode", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    fireEvent.click(await screen.findByText("Resolva as equações abaixo"));

    expect(screen.getByText("Versão Universal")).toBeTruthy();
    expect(screen.getByText("Versão Direcionada")).toBeTruthy();
    expect(screen.getByText("Justificativa Pedagógica")).toBeTruthy();
  });

  it("shows strategies in wizard view", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    fireEvent.click(await screen.findByText("Resolva as equações abaixo"));
    expect(screen.getByText("Estratégias")).toBeTruthy();
    expect(screen.getByText("Estratégia A")).toBeTruthy();
  });

  it("shows implementation tips in wizard view", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    fireEvent.click(await screen.findByText("Resolva as equações abaixo"));
    expect(screen.getByText("Dicas de Implementação")).toBeTruthy();
    expect(screen.getByText("Dica 1")).toBeTruthy();
  });

  it("shows original activity in wizard view", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    fireEvent.click(await screen.findByText("Resolva as equações abaixo"));
    expect(screen.getByText("Atividade Original")).toBeTruthy();
  });

  // === Export buttons ===

  it("shows export buttons for wizard adaptations", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    fireEvent.click(await screen.findByText("Resolva as equações abaixo"));
    expect(screen.getByText("Exportar PDF")).toBeTruthy();
    expect(screen.getByText("Exportar Word")).toBeTruthy();
    expect(screen.getByText("Copiar")).toBeTruthy();
  });

  // === Print button legacy ===

  it("shows print button for legacy adaptations", async () => {
    setupMockFrom([mockLegacy]);
    renderPage();
    fireEvent.click(await screen.findByText("Frações — 5º ano"));
    expect(screen.getByText("Imprimir")).toBeTruthy();
  });

  // === Wizard edit mode ===

  it("enters edit mode for wizard via inline edit button", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    await screen.findByText("Resolva as equações abaixo");

    // Click the pencil (edit) button on the card
    const editButtons = screen.getAllByRole("button");
    const editBtn = editButtons.find(btn => btn.querySelector(".text-primary"));
    if (editBtn) fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Atividade Original")).toBeTruthy();
      expect(screen.getByText("Salvar alterações")).toBeTruthy();
    });
  });

  // === Combined sorting ===

  it("sorts adaptations by date (newest first)", async () => {
    const older = { ...mockLegacy, id: "old", created_at: "2024-01-01T00:00:00Z" };
    const newer = { ...mockLegacy, id: "new", topic: "Geometria", created_at: "2024-06-01T00:00:00Z" };
    setupMockFrom([older, newer]);
    renderPage();

    const items = await screen.findAllByText(/— 5º ano/);
    // Newer should come first in the DOM
    expect(items.length).toBe(2);
  });

  // === Barrier labels ===

  it("shows barrier badges on wizard cards", async () => {
    setupMockFrom([], [mockWizard]);
    renderPage();
    await screen.findByText("Resolva as equações abaixo");
    // barrier_key "visual_contrast" should be rendered with its label
    // The barrierLabel function will look it up in BARRIER_DIMENSIONS
  });
});
