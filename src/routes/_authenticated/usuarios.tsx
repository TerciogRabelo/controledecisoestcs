import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const ROLES: { v: "admin" | "secretaria" | "monitoramento" | "consulta"; label: string }[] = [
  { v: "admin", label: "Administrador" },
  { v: "secretaria", label: "Secretaria" },
  { v: "monitoramento", label: "Monitoramento" },
  { v: "consulta", label: "Consulta" },
];

function UsuariosPage() {
  const qc = useQueryClient();
  const { hasRole, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const [profiles, roles, uts] = await Promise.all([
        (supabase as any).from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
        (supabase as any).from("unidades_tecnicas").select("id, nome, sigla").eq("ativo", true).order("nome"),
      ]);
      return { profiles: profiles.data ?? [], roles: roles.data ?? [], uts: uts.data ?? [] };
    },
  });

  if (!hasRole("admin")) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-8 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
        </CardContent>
      </Card>
    );
  }

  const setRole = async (uid: string, role: "admin" | "secretaria" | "monitoramento" | "consulta") => {
    await supabase.from("user_roles").delete().eq("user_id", uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) { toast.error(error.message); return; }
    // Se mudou para perfil que não é monitoramento, limpa a UT
    if (role !== "monitoramento") {
      await (supabase as any).from("profiles").update({ unidade_tecnica_id: null }).eq("id", uid);
    }
    toast.success("Perfil atualizado.");
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const setUnidadeTecnica = async (uid: string, ut: string | null) => {
    const { error } = await (supabase as any).from("profiles").update({ unidade_tecnica_id: ut }).eq("id", uid);
    if (error) { toast.error(error.message); return; }
    toast.success("Unidade técnica atualizada.");
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const setAprovado = async (uid: string, aprovado: boolean) => {
    const { error } = await supabase.from("profiles").update({ aprovado }).eq("id", uid);
    if (error) { toast.error(error.message); return; }
    toast.success(aprovado ? "Usuário aprovado." : "Acesso revogado.");
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const getCurrentRole = (uid: string) => data?.roles.find((r) => r.user_id === uid)?.role ?? "consulta";

  const profiles = data?.profiles ?? [];
  const pendentes = profiles.filter((p) => !p.aprovado);

  return (
    <div className="space-y-4">
      {pendentes.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm">
            <strong>{pendentes.length}</strong> {pendentes.length === 1 ? "usuário aguardando aprovação." : "usuários aguardando aprovação."}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="w-[200px]">Alterar Perfil</TableHead>
                <TableHead className="w-[140px]">Acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : profiles.map((p) => {
                const role = getCurrentRole(p.id);
                const isMe = p.id === user?.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome} {isMe && <Badge variant="outline" className="ml-2">você</Badge>}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell>
                      {p.aprovado
                        ? <Badge className="bg-success/15 text-success border-success/30">Aprovado</Badge>
                        : <Badge variant="outline" className="border-warning/40 text-warning">Pendente</Badge>}
                    </TableCell>
                    <TableCell><Badge>{role}</Badge></TableCell>
                    <TableCell>
                      <Select value={role} onValueChange={(v) => setRole(p.id, v as any)} disabled={isMe || !p.aprovado}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isMe ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : p.aprovado ? (
                        <Button size="sm" variant="outline" onClick={() => setAprovado(p.id, false)}>Revogar</Button>
                      ) : (
                        <Button size="sm" onClick={() => setAprovado(p.id, true)}>Aprovar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
