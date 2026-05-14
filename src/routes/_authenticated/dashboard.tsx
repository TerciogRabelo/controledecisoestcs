import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileStack, Gavel, AlertTriangle, CheckCircle2, Clock, TrendingUp, Building2, FileWarning, X, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const COLORS = ["oklch(0.45 0.15 250)", "oklch(0.75 0.15 75)", "oklch(0.65 0.18 145)", "oklch(0.65 0.22 25)", "oklch(0.6 0.05 250)"];

const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_monitoramento: "Em monitoramento",
  cumprida: "Cumprida",
  descumprida: "Descumprida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};


function DashboardPage() {
  const [filtroUnidade, setFiltroUnidade] = useState<string>("__all");
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroNome, setFiltroNome] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const [registros, deliberacoes, unidades, tiposDel, unidadesTec] = await Promise.all([
        supabase.from("registros_decisao").select("id, numero_processo, status_registro, houve_deliberacao, quantidade_deliberacoes, data_decisao, unidade_gestora_id, orgao_julgador_id, gestor_responsavel, cpf_cnpj"),
        supabase.from("deliberacoes").select("id, registro_decisao_id, status_monitoramento, prazo_dias, criado_em, tipo_deliberacao_id, unidade_tecnica_id"),
        supabase.from("unidades_gestoras").select("id, nome_unidade, sigla"),
        supabase.from("tipos_deliberacao").select("id, descricao, cor"),
        supabase.from("unidades_tecnicas").select("id, nome, sigla"),
      ]);
      return {
        registros: registros.data ?? [],
        deliberacoes: deliberacoes.data ?? [],
        unidades: unidades.data ?? [],
        tiposDel: tiposDel.data ?? [],
        unidadesTec: unidadesTec.data ?? [],
      };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    const cpfDigits = filtroCpf.replace(/\D/g, "");
    const nomeLower = filtroNome.trim().toLowerCase();
    const r = data.registros.filter((x) => {
      if (filtroUnidade !== "__all" && x.unidade_gestora_id !== filtroUnidade) return false;
      if (cpfDigits && !(x.cpf_cnpj ?? "").replace(/\D/g, "").includes(cpfDigits)) return false;
      if (nomeLower && !(x.gestor_responsavel ?? "").toLowerCase().includes(nomeLower)) return false;
      return true;
    });
    const ids = new Set(r.map((x) => x.id));
    const d = data.deliberacoes.filter((x) => ids.has(x.registro_decisao_id));

    const statusCount = d.reduce<Record<string, number>>((acc, x) => {
      acc[x.status_monitoramento] = (acc[x.status_monitoramento] ?? 0) + 1;
      return acc;
    }, {});

    const porUnidade = data.unidades
      .map((un) => ({ nome: (un.sigla ?? un.nome_unidade).slice(0, 20), total: r.filter((x) => x.unidade_gestora_id === un.id).length }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const porTipoDel = data.tiposDel
      .map((t) => ({ name: t.descricao, value: d.filter((x) => x.tipo_deliberacao_id === t.id).length, color: t.cor }))
      .filter((x) => x.value > 0);

    const unidadeMap = new Map(data.unidades.map((u) => [u.id, u]));
    const tableRows = r
      .map((x) => {
        const dels = data.deliberacoes.filter((dd) => dd.registro_decisao_id === x.id);
        const u = x.unidade_gestora_id ? unidadeMap.get(x.unidade_gestora_id) : null;
        return {
          id: x.id,
          numero_processo: x.numero_processo,
          unidade: u ? (u.sigla ?? u.nome_unidade) : "—",
          gestor: x.gestor_responsavel ?? "—",
          cpf_cnpj: x.cpf_cnpj ?? "—",
          data_decisao: x.data_decisao,
          totalDel: dels.length,
          dels,
        };
      })
      .sort((a, b) => (b.data_decisao ?? "").localeCompare(a.data_decisao ?? ""));

    const naoIniciadas = statusCount["nao_iniciado"] ?? 0;
    const emMon = statusCount["em_monitoramento"] ?? 0;
    const finalizadas = (statusCount["cumprida"] ?? 0) + (statusCount["descumprida"] ?? 0) + (statusCount["vencida"] ?? 0) + (statusCount["cancelada"] ?? 0);
    const totalDel = d.length;
    const comMonitoramento = emMon + finalizadas;
    const pctCobertura = totalDel > 0 ? Math.round((comMonitoramento / totalDel) * 100) : 0;

    return {
      totalRegistros: r.length,
      totalDeliberacoes: totalDel,
      comDeliberacao: r.filter((x) => x.houve_deliberacao).length,
      semDeliberacao: r.filter((x) => !x.houve_deliberacao).length,
      naoIniciadas,
      emMonitoramento: emMon,
      cumpridas: statusCount["cumprida"] ?? 0,
      descumpridas: statusCount["descumprida"] ?? 0,
      vencidas: statusCount["vencida"] ?? 0,
      finalizadas,
      comMonitoramento,
      pctCobertura,
      gaugeData: [
        { name: "Em monitoramento", value: emMon, color: "oklch(0.65 0.18 230)" },
        { name: "Finalizadas", value: finalizadas, color: "oklch(0.65 0.18 145)" },
        { name: "Não iniciadas", value: naoIniciadas, color: "oklch(0.75 0.05 250)" },
      ].filter((x) => x.value > 0),
      porUnidade,
      porTipoDel,
      porUnidadeTec: data.unidadesTec
        .map((ut) => {
          const dels = d.filter((x) => x.unidade_tecnica_id === ut.id);
          const pendentes = dels.filter((x) => x.status_monitoramento === "nao_iniciado").length;
          return { nome: (ut.sigla ?? ut.nome).slice(0, 20), total: dels.length, pendentes };
        })
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total),
      statusData: [
        { name: "Não iniciado", value: naoIniciadas },
        { name: "Em monitoramento", value: emMon },
        { name: "Cumpridas", value: statusCount["cumprida"] ?? 0 },
        { name: "Descumpridas", value: statusCount["descumprida"] ?? 0 },
        { name: "Vencidas", value: statusCount["vencida"] ?? 0 },
      ].filter((x) => x.value > 0),
      tableRows,
    };
  }, [data, filtroUnidade, filtroCpf, filtroNome]);

  if (isLoading || !data || !filtered) {
    return <div className="text-sm text-muted-foreground">Carregando indicadores…</div>;
  }

  const cards = [
    { label: "Registros de Decisão", value: filtered.totalRegistros, icon: FileStack, color: "text-primary", bg: "bg-primary/10" },
    { label: "Deliberações", value: filtered.totalDeliberacoes, icon: Gavel, color: "text-gold", bg: "bg-gold/10" },
    { label: "Com Deliberação", value: filtered.comDeliberacao, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Sem Deliberação", value: filtered.semDeliberacao, icon: FileWarning, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Em Monitoramento", value: filtered.emMonitoramento, icon: Clock, color: "text-info", bg: "bg-info/10" },
    { label: "Cumpridas", value: filtered.cumpridas, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Descumpridas", value: filtered.descumpridas, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Vencidas", value: filtered.vencidas, icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
  ];

  const hasFilters = filtroUnidade !== "__all" || filtroCpf || filtroNome;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Filtros</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setFiltroUnidade("__all"); setFiltroCpf(""); setFiltroNome(""); }}>
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Unidade Gestora</Label>
            <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                {data.unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.sigla ? `${u.sigla} — ` : ""}{u.nome_unidade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CPF/CNPJ</Label>
            <Input value={filtroCpf} onChange={(e) => setFiltroCpf(e.target.value)} placeholder="Busca por dígitos" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Gestor</Label>
            <Input value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} placeholder="Busca por nome" />
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Cobertura de Monitoramento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.totalDeliberacoes === 0 ? (
            <p className="text-sm text-muted-foreground">Sem deliberações cadastradas.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={filtered.gaugeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="90%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                    >
                      {filtered.gaugeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-4 text-center">
                  <div className="text-3xl font-bold text-success">{filtered.pctCobertura}%</div>
                  <div className="text-xs text-muted-foreground">com monitoramento</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Total de deliberações</span>
                  <span className="font-semibold">{filtered.totalDeliberacoes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Não iniciadas</span>
                  <span className="font-medium">{filtered.naoIniciadas} ({filtered.totalDeliberacoes ? Math.round(filtered.naoIniciadas / filtered.totalDeliberacoes * 100) : 0}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-info" /> Em monitoramento</span>
                  <span className="font-medium">{filtered.emMonitoramento} ({filtered.totalDeliberacoes ? Math.round(filtered.emMonitoramento / filtered.totalDeliberacoes * 100) : 0}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" /> Finalizadas</span>
                  <span className="font-medium">{filtered.finalizadas} ({filtered.totalDeliberacoes ? Math.round(filtered.finalizadas / filtered.totalDeliberacoes * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Top Unidades Gestoras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.porUnidade.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={filtered.porUnidade}>
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
            {filtered.statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={filtered.statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {filtered.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registros e Deliberações ({filtered.tableRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.tableRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado com os filtros aplicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Data Decisão</TableHead>
                    <TableHead>Deliberações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.tableRows.map((row) => {
                    const statusAgg = row.dels.reduce<Record<string, number>>((acc, d) => {
                      acc[d.status_monitoramento] = (acc[d.status_monitoramento] ?? 0) + 1;
                      return acc;
                    }, {});
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.numero_processo}</TableCell>
                        <TableCell className="text-sm">{row.unidade}</TableCell>
                        <TableCell className="text-sm">{row.gestor}</TableCell>
                        <TableCell className="font-mono text-xs">{row.cpf_cnpj}</TableCell>
                        <TableCell className="text-sm">{row.data_decisao ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{row.totalDel}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(statusAgg).map(([k, v]) => (
                              <Badge key={k} variant="outline" className="text-xs">{STATUS_LABELS[k] ?? k}: {v}</Badge>
                            ))}
                            {row.totalDel === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/registros/$id" params={{ id: row.id }}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
