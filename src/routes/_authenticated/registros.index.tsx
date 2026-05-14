import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileStack, Pencil, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/masks";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/registros/")({
  component: RegistrosListPage,
});

function RegistrosListPage() {
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["registros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_decisao")
        .select(`
          id, numero_processo, numero_decisao, data_decisao, gestor_responsavel,
          status_registro, houve_deliberacao, quantidade_deliberacoes,
          unidades_gestoras(nome_unidade, sigla),
          orgaos_julgadores(descricao),
          tipos_decisao(descricao)
        `)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.numero_processo?.toLowerCase().includes(q) ||
      r.numero_decisao?.toLowerCase().includes(q) ||
      r.gestor_responsavel?.toLowerCase().includes(q) ||
      (r.unidades_gestoras as any)?.nome_unidade?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Registros de Decisão</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} registro(s)</p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link to="/registros/$id" params={{ id: "novo" }}><Plus className="h-4 w-4" /> Novo Registro</Link>
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por processo, decisão, gestor…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Decisão</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Unidade Gestora</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead className="text-center">Deliberações</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <FileStack className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    <Link to="/registros/$id" params={{ id: r.id }} className="text-primary hover:underline">
                      {r.numero_processo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.numero_decisao ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(r.data_decisao)}</TableCell>
                  <TableCell className="text-sm">
                    {(r.unidades_gestoras as any)?.sigla ?? (r.unidades_gestoras as any)?.nome_unidade ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{r.gestor_responsavel ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {r.quantidade_deliberacoes > 0 ? (
                      <Badge variant="secondary">{r.quantidade_deliberacoes}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status_registro === "ativo" ? "default" : "outline"}>
                      {r.status_registro}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
