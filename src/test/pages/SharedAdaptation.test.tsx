import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SharedAdaptation from "@/pages/SharedAdaptation";
import { MOCK_ADAPTATION_RESULT } from "@/test/fixtures";

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Mock logo import
vi.mock("@/assets/logo-olhar-singular-sm.png", () => ({
  default: "/logo.png",
}));

function renderWithRouter(token = "abc123") {
  return render(
    <MemoryRouter initialEntries={[`/shared/${token}`]}>
      <Routes>
        <Route path="/shared/:token" element={<SharedAdaptation />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SharedAdaptation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockRpc.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithRouter();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("shows error when token not found", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Link não encontrado ou expirado.")).toBeInTheDocument();
    });
  });

  it("shows error when rpc fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "err" } });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Link não encontrado ou expirado.")).toBeInTheDocument();
    });
  });

  it("shows error when adaptation not found", async () => {
    mockRpc.mockResolvedValue({
      data: [{ adaptation_id: "a1", expires_at: "2030-01-01" }],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Adaptação não encontrada.")).toBeInTheDocument();
    });
  });

  it("renders adaptation data successfully", async () => {
    mockRpc.mockResolvedValue({
      data: [{ adaptation_id: "a1", expires_at: "2030-12-31T00:00:00Z" }],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          original_activity: "2 + 3 = ?",
          activity_type: "exercicio",
          adaptation_result: MOCK_ADAPTATION_RESULT,
          barriers_used: [{ dimension: "tdah", barrier_key: "tdah_atencao" }],
          created_at: "2026-01-01",
        },
        error: null,
      }),
    });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Adaptação Compartilhada")).toBeInTheDocument();
    });
    expect(screen.getByText("Atividade Original")).toBeInTheDocument();
    expect(screen.getByText("2 + 3 = ?")).toBeInTheDocument();
    expect(screen.getByText("exercicio")).toBeInTheDocument();
  });

  it("shows expiration date", async () => {
    mockRpc.mockResolvedValue({
      data: [{ adaptation_id: "a1", expires_at: "2030-12-31T00:00:00Z" }],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          original_activity: "Q",
          activity_type: null,
          adaptation_result: MOCK_ADAPTATION_RESULT,
          barriers_used: [],
          created_at: null,
        },
        error: null,
      }),
    });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/Expira em/)).toBeInTheDocument();
    });
  });

  it("shows 'Ir para o início' link on error", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Ir para o início")).toBeInTheDocument();
    });
  });
});
