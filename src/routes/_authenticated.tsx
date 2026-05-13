import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/registros": "Registros de Decisão",
  "/cadastros": "Cadastros Básicos",
  "/usuarios": "Usuários",
  "/configuracoes": "Configurações",
};

function AuthenticatedLayout() {
  const { user, loading, aprovado, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!aprovado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-md text-center space-y-4 bg-background border rounded-lg p-8 shadow-sm">
          <h2 className="text-lg font-semibold">Cadastro aguardando aprovação</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador antes de acessar o sistema.
          </p>
          <p className="text-xs text-muted-foreground">Entre em contato com o administrador do TCE-PI.</p>
          <Button variant="outline" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>Sair</Button>
        </div>
      </div>
    );
  }


  const title = Object.entries(titles).find(([k]) => path.startsWith(k))?.[1] ?? "TCE-PI";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-background px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-sm font-semibold text-foreground">{title}</h1>
                <p className="text-xs text-muted-foreground">Tribunal de Contas do Estado do Piauí</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
