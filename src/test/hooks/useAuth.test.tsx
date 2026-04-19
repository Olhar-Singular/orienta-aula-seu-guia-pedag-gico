import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const onAuthStateChange = vi.fn();
const getSession = vi.fn();
const signUp = vi.fn();
const signInWithPassword = vi.fn();
const signOut = vi.fn();
const unsubscribe = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
      getSession: () => getSession(),
      signUp: (args: unknown) => signUp(args),
      signInWithPassword: (args: unknown) => signInWithPassword(args),
      signOut: () => signOut(),
    },
  },
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  onAuthStateChange.mockReset();
  getSession.mockReset();
  signUp.mockReset();
  signInWithPassword.mockReset();
  signOut.mockReset();
  unsubscribe.mockReset();

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

  it("unsubscribes on unmount", async () => {
    const { unmount, result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("signUp forwards email, password, name and the origin-based redirect", async () => {
    signUp.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.signUp("a@b.com", "secret", "Alex");
    expect(res).toEqual({ error: null });
    expect(signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret",
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: "Alex" },
      },
    });
  });

  it("signUp returns the supabase error when registration fails", async () => {
    signUp.mockResolvedValue({ error: { message: "already registered" } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const res = await result.current.signUp("a@b.com", "x", "Alex");
    expect(res.error).toEqual({ message: "already registered" });
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
