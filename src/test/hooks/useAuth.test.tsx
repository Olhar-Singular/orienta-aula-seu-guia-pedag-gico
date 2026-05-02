import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const onAuthStateChange = vi.fn();
const getSession = vi.fn();
const signInWithPassword = vi.fn();
const signOut = vi.fn();
const unsubscribe = vi.fn();
const toastError = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
      getSession: () => getSession(),
      signInWithPassword: (args: unknown) => signInWithPassword(args),
      signOut: () => signOut(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => toastError(msg),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  onAuthStateChange.mockReset();
  getSession.mockReset();
  signInWithPassword.mockReset();
  signOut.mockReset();
  unsubscribe.mockReset();
  toastError.mockReset();

  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  getSession.mockResolvedValue({ data: { session: null } });
});

describe("useAuth", () => {
  it("throws when used outside of AuthProvider", () => {
    // Silence the expected React error log for this test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within AuthProvider/
    );
    spy.mockRestore();
  });

  it("initializes with loading=true and resolves to the session returned by getSession", async () => {
    const mockUser = { id: "user-1", email: "a@b.com" } as any;
    getSession.mockResolvedValue({
      data: { session: { access_token: "t", user: mockUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session?.access_token).toBe("t");
  });

  it("reacts to onAuthStateChange callbacks and updates user/session", async () => {
    let emitter: ((evt: string, session: any) => void) | null = null;
    onAuthStateChange.mockImplementation((cb: any) => {
      emitter = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newUser = { id: "user-2" } as any;
    act(() => {
      emitter!("SIGNED_IN", { access_token: "new", user: newUser });
    });
    expect(result.current.user).toEqual(newUser);
    expect(result.current.session?.access_token).toBe("new");

    act(() => {
      emitter!("SIGNED_OUT", null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("shows expired-session toast on involuntary SIGNED_OUT after a session existed", async () => {
    let emitter: ((evt: string, session: any) => void) | null = null;
    onAuthStateChange.mockImplementation((cb: any) => {
      emitter = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      emitter!("SIGNED_IN", { access_token: "tok", user: { id: "u" } });
    });

    act(() => {
      emitter!("SIGNED_OUT", null);
    });

    expect(toastError).toHaveBeenCalledWith(
      "Sua sessão expirou. Faça login novamente."
    );
  });

  it("does NOT show expired-session toast when signOut() was called intentionally", async () => {
    let emitter: ((evt: string, session: any) => void) | null = null;
    onAuthStateChange.mockImplementation((cb: any) => {
      emitter = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      emitter!("SIGNED_IN", { access_token: "tok", user: { id: "u" } });
    });

    await act(async () => {
      await result.current.signOut();
      emitter!("SIGNED_OUT", null);
    });

    expect(toastError).not.toHaveBeenCalled();
  });

  it("does NOT show expired-session toast on initial SIGNED_OUT (no prior session)", async () => {
    let emitter: ((evt: string, session: any) => void) | null = null;
    onAuthStateChange.mockImplementation((cb: any) => {
      emitter = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      emitter!("SIGNED_OUT", null);
    });

    expect(toastError).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", async () => {
    const { unmount, result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("does not expose signUp (signup public foi removido por segurança)", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect((result.current as unknown as Record<string, unknown>).signUp).toBeUndefined();
  });

  it("signIn forwards email and password, returns error object", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "wrong" } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.signIn("a@b.com", "pw");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "pw" });
    expect(res.error).toEqual({ message: "wrong" });
  });

  it("signOut calls supabase.auth.signOut", async () => {
    signOut.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.signOut();
    expect(signOut).toHaveBeenCalled();
  });
});
