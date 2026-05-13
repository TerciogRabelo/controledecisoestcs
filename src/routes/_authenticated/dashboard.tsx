import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileStack, Gavel, AlertTriangle, CheckCircle2, Clock, TrendingUp, Building2, FileWarning } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const COLORS = ["oklch(0.45 0.15 250)", "oklch(0.75 0.15 75)", "oklch(0.65 0.18 145)", "oklch(0.65 0.22 25)", "oklch(0.6 0.05 250)"];

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [registros, deliberacoes, unidades, tiposDel] = await Promise.all([
        supabase.from("registros_decisao").select("id, status_registro, houve_deliberacao, data_decisao, unidade_gestora_id, orgao_julgador_id"),
        supabase.from("deliberacoes").select("id, status_monitoramento, prazo_dias, criado_em, tipo_deliberacao_id"),
        supabase.from("unidades_gestoras").select("id, nome_unidade"),
        supabase.from("tipos_deliberacao").select("id, descricao, cor"),
      ]);

      const r = registros.data ?? [];
      const d = deliberacoes.data ?? [];
      const u = unidades.data ?? [];
      const td = tiposDel.data ?? [];

      const statusCount = d.reduce<Record<string, number>>((acc, x) => {
        acc[x.status_monitoramento] = (acc[x.status_monitoramento] ?? 0) + 1;
        return acc;
      }, {});

      const porUnidade = u
        .map((un) => ({ nome: un.nome_unidade.slice(0, 20), total: r.filter((x) => x.unidade_gestora_id === un.id).length }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      const porTipoDel = td
        .map((t) => ({ name: t.descricao, value: d.filter((x) => x.tipo_deliberacao_id === t.id).length, color: t.cor }))
        .filter((x) => x.value > 0);

      return {
        totalRegistros: r.length,
        totalDeliberacoes: d.length,
        comDeliberacao: r.filter((x) => x.houve_deliberacao).length,
        semDeliberacao: r.filter((x) => !x.houve_deliberacao).length,
        emMonitoramento: statusCount["em_monitoramento"] ?? 0,
        cumpridas: statusCount["cumprida"] ?? 0,
        descumpridas: statusCount["descumprida"] ?? 0,
        vencidas: statusCount["vencida"] ?? 0,
        porUnidade,
        porTipoDel,
        statusData: [
          { name: "Em monitoramento", value: statusCount["em_monitoramento"] ?? 0 },
          { name: "Cumpridas", value: statusCount["cumprida"] ?? 0 },
          { name: "Descumpridas", value: statusCount["descumprida"] ?? 0 },
          { name: "Vencidas", value: statusCount["vencida"] ?? 0 },
        ].filter((x) => x.value > 0),
      };
    },
  });

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Carregando indicadores…</div>;
  }

  const cards = [
    { label: "Registros de Decisão", value: data.totalRegistros, icon: FileStack, color: "text-primary", bg: "bg-primary/10" },
    { label: "Deliberações", value: data.totalDeliberacoes, icon: Gavel, color: "text-gold", bg: "bg-gold/10" },
    { label: "Com Deliberação", value: data.comDeliberacao, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Sem Deliberação", value: data.semDeliberacao, icon: FileWarning, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Em Monitoramento", value: data.emMonitoramento, icon: Clock, color: "text-info", bg: "bg-info/10" },
    { label: "Cumpridas", value: data.cumpridas, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Descumpridas", value: data.descumpridas, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Vencidas", value: data.vencidas, icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value.toLocaleString("pt-BR")}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Top Unidades Gestoras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.porUnidade.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.porUnidade}>
                  <XAxis dataKey="nome" fontSize={11} tick={{ fill: "currentColor" }} />
                  <YAxis fontSize={11} tick={{ fill: "currentColor" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="total" fill="oklch(0.45 0.15 250)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das Deliberações</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {data.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
