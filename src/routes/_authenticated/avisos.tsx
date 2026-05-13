import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/masks";

export const Route = createFileRoute("/_authenticated/avisos")({
  component: AvisosPage,
});

const TODAY = new Date().toISOString().slice(0, 10);

function diffDays(target: string): number {
  const t = new Date(target + "T00:00:00").getTime();
  const h = new Date(TODAY + "T00:00:00").getTime();
  return Math.ceil((t - h) / (1000 * 60 * 60 * 24));
}

type Aviso = {
  id: string;
  origem: "deliberacao" | "monitoramento";
  registro_id: string;
  numero_processo: string;
  tipo: string;
  prazo_label: string;
  data_alvo: string;
  dias: number;
  severity: "vencido" | "urgente" | "atencao";
};

function AvisosPage() {
  const { data: deliberacoes } = useQuery({
    queryKey: ["avisos_deliberacoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliberacoes")
        .select("*, tipos_deliberacao(descricao, gera_prazo), registros_decisao(id, numero_processo)")
        .in("status_monitoramento", ["em_monitoramento", "vencida"]);
      return data ?? [];
    },
  });

  const avisos = useMemo<Aviso[]>(() => {
    const out: Aviso[] = [];
    for (const d of (deliberacoes ?? []) as any[]) {
      const reg = d.registros_decisao;
      if (!reg) continue;

      // Prazo da deliberação
      if (d.tipos_deliberacao?.gera_prazo && d.prazo_dias && d.data_inicio_prazo) {
        const fim = new Date(d.data_inicio_prazo + "T00:00:00");
        fim.setDate(fim.getDate() + Number(d.prazo_dias));
        const fimStr = fim.toISOString().slice(0, 10);
        const dias = diffDays(fimStr);
        if (dias <= 15) {
          out.push({
            id: d.id + ":del",
            origem: "deliberacao",
            registro_id: reg.id,
            numero_processo: reg.numero_processo,
            tipo: d.tipos_deliberacao?.descricao ?? "Deliberação",
            prazo_label: dias < 0 ? `Vencida há ${-dias}d` : `${dias}d restantes`,
            data_alvo: fimStr,
            dias,
            severity: dias < 0 ? "vencido" : dias <= 7 ? "urgente" : "atencao",
          });
        }
      }

      // Prazo do monitoramento
      if (d.monitoramento_fim) {
        const dias = diffDays(d.monitoramento_fim);
        if (dias <= 15) {
          out.push({
            id: d.id + ":mon",
            origem: "monitoramento",
            registro_id: reg.id,
            numero_processo: reg.numero_processo,
            tipo: d.tipos_deliberacao?.descricao ?? "Deliberação",
            prazo_label: dias < 0 ? `Vencido há ${-dias}d` : `${dias}d restantes`,
            data_alvo: d.monitoramento_fim,
            dias,
            severity: dias < 0 ? "vencido" : dias <= 7 ? "urgente" : "atencao",
          });
        }
      }
    }
    return out.sort((a, b) => a.dias - b.dias);
  }, [deliberacoes]);

  const vencidos = avisos.filter((a) => a.severity === "vencido");
  const urgentes = avisos.filter((a) => a.severity === "urgente");
  const atencao = avisos.filter((a) => a.severity === "atencao");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Controle de Avisos</h2>
        <p className="text-xs text-muted-foreground">Pendências de prazo de deliberações e de monitoramento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Vencidos" count={vencidos.length} icon={<AlertTriangle className="h-4 w-4" />} tone="destructive" />
        <StatCard label="Vencem em até 7 dias" count={urgentes.length} icon={<Clock className="h-4 w-4" />} tone="warning" />
        <StatCard label="Vencem em 8-15 dias" count={atencao.length} icon={<CheckCircle2 className="h-4 w-4" />} tone="muted" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Pendências ({avisos.length})</CardTitle></CardHeader>
        <CardContent>
          {avisos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pendência nos próximos 15 dias.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Deliberação</TableHead>
                  <TableHead>Data limite</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avisos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant={a.origem === "monitoramento" ? "secondary" : "outline"}>
                        {a.origem === "monitoramento" ? "Monitoramento" : "Deliberação"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to="/registros/$id" params={{ id: a.registro_id }} className="font-mono text-sm hover:underline">
                        {a.numero_processo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{a.tipo}</TableCell>
                    <TableCell className="text-sm">{formatDate(a.data_alvo)}</TableCell>
                    <TableCell>
                      <Badge variant={a.severity === "vencido" ? "destructive" : a.severity === "urgente" ? "default" : "secondary"}>
                        {a.prazo_label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, count, icon, tone }: { label: string; count: number; icon: React.ReactNode; tone: "destructive" | "warning" | "muted" }) {
  const colors = {
    destructive: "text-destructive bg-destructive/10",
    warning: "text-amber-600 bg-amber-500/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${colors[tone]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
