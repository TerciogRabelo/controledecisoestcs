import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [nome, setNome] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupTribunal, setSignupTribunal] = useState<string>("");

  const { data: tribunais = [] } = useQuery({
    queryKey: ["tribunais-public"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("tribunais").select("id, sigla, nome").eq("ativo", true).order("sigla");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) throw error;
      toast.success("Bem-vindo!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message || "Erro ao entrar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!signupTribunal) { toast.error("Selecione o tribunal."); return; }
    setSubmitting(true);
    try {
      const { error } = await signUp(signupEmail, signupPassword, nome, signupTribunal);
      if (error) throw error;
      toast.success("Cadastro realizado. Aguarde aprovação do administrador.");
      setLoginEmail(signupEmail);
      setNome(""); setSignupEmail(""); setSignupPassword(""); setSignupTribunal("");
      setTab("login");
    } catch (err) {
      toast.error((err as Error).message || "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* futuristic background */}
      <div className="absolute inset-0 -z-10">
        {/* base radial wash */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        {/* aurora orbs */}
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[120px] animate-pulse [animation-duration:9s]" />
        <div className="absolute top-1/3 -right-40 h-[26rem] w-[26rem] rounded-full bg-gold/25 blur-[120px] animate-pulse [animation-duration:11s]" />
        <div className="absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] rounded-full bg-info/15 blur-[120px] animate-pulse [animation-duration:13s]" />
        {/* fine grid */}
        <div
          className="absolute inset-0 opacity-[0.05] text-foreground"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
        {/* diagonal scan line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        {/* corner glow rings */}
        <svg className="absolute -top-24 -right-24 h-[30rem] w-[30rem] opacity-30" viewBox="0 0 400 400" fill="none" aria-hidden>
          <circle cx="200" cy="200" r="180" stroke="url(#g1)" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="140" stroke="url(#g1)" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="100" stroke="url(#g1)" strokeWidth="0.5" />
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.13 80)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="oklch(0.34 0.10 250)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left: brand panel (desktop only) */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-gold rounded-xl blur-md opacity-40" />
              <img src={logo} alt="Logo Decisum" className="relative h-12 w-12 drop-shadow-lg" width={48} height={48} />
            </div>
            <div className="leading-tight">
              <p className="font-semibold tracking-tight text-foreground text-lg">Decisum</p>
              <p className="text-xs text-muted-foreground">Plataforma de Gestão de Decisões</p>
            </div>
          </div>

          <div className="space-y-8 max-w-lg">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 backdrop-blur px-3 py-1 text-xs text-foreground/80 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                Controle, monitoramento e transparência
              </span>
              <h2 className="mt-5 text-4xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
                <span className="bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
                  Gestão moderna
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
                  de decisões.
                </span>
              </h2>
              <p className="mt-5 text-base text-muted-foreground leading-relaxed">
                Centralize registros, acompanhe prazos e monitore o cumprimento das deliberações em uma única plataforma — pensada para a realidade dos órgãos de controle.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                "Registro estruturado de decisões",
                "Monitoramento por unidade técnica",
                "Indicadores e avisos em tempo real",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-foreground/90 group">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20 group-hover:bg-primary/20 transition">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            Acesso restrito a servidores autorizados.
          </p>
        </div>

        {/* Right: auth card */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* mobile brand */}
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary to-gold rounded-2xl blur-lg opacity-40" />
                <img src={logo} alt="Logo Decisum" className="relative h-16 w-16" width={64} height={64} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">Decisum</h1>
              <p className="text-sm text-muted-foreground">Gestão de Decisões</p>
            </div>

            <Card className="border border-primary/15 shadow-2xl shadow-primary/10 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 ring-1 ring-white/5">
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Acesso à plataforma</CardTitle>
                <CardDescription>Entre com sua conta institucional ou solicite cadastro.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-5">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">E-mail</Label>
                        <Input id="login-email" type="email" value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <Input id="login-password" type="password" value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)} required minLength={6} autoComplete="current-password" />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Entrar
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-5">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-nome">Nome completo</Label>
                        <Input id="signup-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-mail</Label>
                        <Input id="signup-email" type="email" value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)} required autoComplete="email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-tribunal">Tribunal *</Label>
                        <Select value={signupTribunal} onValueChange={setSignupTribunal}>
                          <SelectTrigger id="signup-tribunal">
                            <SelectValue placeholder="Selecione seu tribunal…" />
                          </SelectTrigger>
                          <SelectContent>
                            {tribunais.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.sigla} — {t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Senha</Label>
                        <Input id="signup-password" type="password" value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Criar conta
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
                <p className="text-xs text-muted-foreground text-center mt-6">
                  Acesso restrito a servidores autorizados.{" "}
                  <Link to="/" className="underline">voltar</Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
