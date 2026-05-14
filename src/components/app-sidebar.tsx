import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Gavel, Users, ShieldCheck, LogOut, Bell, Database } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Registros de Decisão", url: "/registros", icon: Gavel },
  { title: "Avisos", url: "/avisos", icon: Bell },
];

const TODAY = new Date().toISOString().slice(0, 10);
function diffDays(target: string): number {
  const t = new Date(target + "T00:00:00").getTime();
  const h = new Date(TODAY + "T00:00:00").getTime();
  return Math.ceil((t - h) / (1000 * 60 * 60 * 24));
}

const adminItems = [
  { title: "Cadastros Básicos", url: "/cadastros", icon: Database },
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, user, hasRole, isMaster, unidadeTecnicaId, tribunal } = useAuth();
  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  const restrictToUT = hasRole("monitoramento") && !hasRole("admin") && !isMaster;
  const { data: avisosCount = 0 } = useQuery({
    queryKey: ["avisos_count", restrictToUT ? unidadeTecnicaId : "all"],
    queryFn: async () => {
      let q = supabase
        .from("deliberacoes")
        .select("id, prazo_dias, data_inicio_prazo, monitoramento_fim, tipos_deliberacao(gera_prazo)")
        .in("status_monitoramento", ["em_monitoramento", "vencido", "nao_cumprido", "parcialmente_cumprido", "nao_iniciado"] as any);
      if (restrictToUT && unidadeTecnicaId) q = q.eq("unidade_tecnica_id", unidadeTecnicaId);
      const { data } = await q;
      let n = 0;
      for (const d of (data ?? []) as any[]) {
        if (d.tipos_deliberacao?.gera_prazo && d.prazo_dias && d.data_inicio_prazo) {
          const fim = new Date(d.data_inicio_prazo + "T00:00:00");
          fim.setDate(fim.getDate() + Number(d.prazo_dias));
          if (diffDays(fim.toISOString().slice(0, 10)) <= 15) n++;
        }
        if (d.monitoramento_fim && diffDays(d.monitoramento_fim) <= 15) n++;
      }
      return n;
    },
    refetchInterval: 60_000,
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 overflow-hidden">
            {tribunal?.logo_url ? (
              <img src={tribunal.logo_url} alt={tribunal.sigla} className="h-9 w-9 object-contain bg-white" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{tribunal?.sigla ?? "Sistema"}</p>
              <p className="text-xs text-muted-foreground truncate">{tribunal?.nome ?? "Gestão de Decisões"}</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.url === "/avisos" && avisosCount > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{avisosCount}</Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {hasRole("admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t">
        {!collapsed && user && (
          <div className="px-2 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
        )}
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
