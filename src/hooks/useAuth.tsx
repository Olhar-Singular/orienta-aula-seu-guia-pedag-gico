import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const intentionalSignOutRef = useRef(false);
  const hadSessionRef = useRef(false);
  const expiredToastShownRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === "SIGNED_OUT") {
          if (
            hadSessionRef.current &&
            !intentionalSignOutRef.current &&
            !expiredToastShownRef.current
          ) {
            expiredToastShownRef.current = true;
            toast.error("Sua sessão expirou. Faça login novamente.");
          }
          intentionalSignOutRef.current = false;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          expiredToastShownRef.current = false;
        }

        hadSessionRef.current = !!nextSession;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      hadSessionRef.current = !!initial;
      setSession(initial);
      setUser(initial?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
