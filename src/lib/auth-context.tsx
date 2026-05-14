import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "secretaria" | "monitoramento" | "consulta";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  aprovado: boolean;
  unidadeTecnicaId: string | null;
  tribunalId: string | null;
  isMaster: boolean;
  tribunal: { id: string; sigla: string; nome: string; logo_url: string | null } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [aprovado, setAprovado] = useState<boolean>(false);
  const [unidadeTecnicaId, setUnidadeTecnicaId] = useState<string | null>(null);
  const [tribunalId, setTribunalId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [tribunal, setTribunal] = useState<AuthState["tribunal"]>(null);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) {
      setRoles([]);
      setAprovado(false);
      setUnidadeTecnicaId(null);
      setTribunalId(null);
      setIsMaster(false);
      setTribunal(null);
      return;
    }
    const [rolesRes, profRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      (supabase as any).from("profiles").select("aprovado, unidade_tecnica_id, tribunal_id, is_master").eq("id", uid).maybeSingle(),
    ]);
    setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
    setAprovado(!!profRes.data?.aprovado);
    setUnidadeTecnicaId(profRes.data?.unidade_tecnica_id ?? null);
    setTribunalId(profRes.data?.tribunal_id ?? null);
    setIsMaster(!!profRes.data?.is_master);
    if (profRes.data?.tribunal_id) {
      const { data: t } = await (supabase as any)
        .from("tribunais")
        .select("id, sigla, nome, logo_url")
        .eq("id", profRes.data.tribunal_id)
        .maybeSingle();
      setTribunal(t ?? null);
    } else {
      setTribunal(null);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer to avoid deadlock
      setTimeout(() => loadRoles(s?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRoles(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));
  const refreshRoles = async () => loadRoles(user?.id);

  return (
    <AuthContext.Provider
      value={{ user, session, roles, aprovado, unidadeTecnicaId, loading, signIn, signUp, signOut, hasRole, hasAnyRole, refreshRoles }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
