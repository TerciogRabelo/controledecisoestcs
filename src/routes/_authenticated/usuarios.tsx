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
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
      ]);
      return { profiles: profiles.data ?? [], roles: roles.data ?? [] };
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
    toast.success("Perfil atualizado.");
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  };

  const getCurrentRole = (uid: string) => data?.roles.find((r) => r.user_id === uid)?.role ?? "consulta";

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-[200px]">Alterar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : (data?.profiles ?? []).map((p) => {
              const role = getCurrentRole(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome} {p.id === user?.id && <Badge variant="outline" className="ml-2">você</Badge>}</TableCell>
                  <TableCell className="text-sm">{p.email}</TableCell>
                  <TableCell><Badge>{role}</Badge></TableCell>
                  <TableCell>
                    <Select value={role} onValueChange={(v) => setRole(p.id, v as any)} disabled={p.id === user?.id}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
