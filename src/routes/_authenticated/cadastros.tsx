import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { maskCnpj } from "@/lib/masks";

export const Route = createFileRoute("/_authenticated/cadastros")({
  component: CadastrosPage,
});

function CadastrosPage() {
  return (
    <Tabs defaultValue="unidades">
      <TabsList>
        <TabsTrigger value="unidades">Unidades Gestoras</TabsTrigger>
        <TabsTrigger value="orgaos">Órgãos Julgadores</TabsTrigger>
        <TabsTrigger value="tipos_decisao">Tipos de Decisão</TabsTrigger>
        <TabsTrigger value="tipos_julgamento">Tipos de Julgamento</TabsTrigger>
        <TabsTrigger value="tipos_deliberacao">Tipos de Deliberação</TabsTrigger>
      </TabsList>
      <TabsContent value="unidades"><UnidadesGestoras /></TabsContent>
      <TabsContent value="orgaos"><SimpleCrud table="orgaos_julgadores" label="Órgão Julgador" /></TabsContent>
      <TabsContent value="tipos_decisao"><SimpleCrud table="tipos_decisao" label="Tipo de Decisão" /></TabsContent>
      <TabsContent value="tipos_julgamento"><SimpleCrud table="tipos_julgamento" label="Tipo de Julgamento" /></TabsContent>
      <TabsContent value="tipos_deliberacao"><TiposDeliberacao /></TabsContent>
    </Tabs>
  );
}

function UnidadesGestoras() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["unidades_gestoras"],
    queryFn: async () => (await supabase.from("unidades_gestoras").select("*").order("nome_unidade")).data ?? [],
  });

  const save = async (form: any) => {
    const payload = { ...form, cnpj: form.cnpj?.replace(/\D/g, "") || null };
    const { error } = edit
      ? await supabase.from("unidades_gestoras").update(payload).eq("id", edit.id)
      : await supabase.from("unidades_gestoras").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
    setOpen(false); setEdit(null);
    qc.invalidateQueries({ queryKey: ["unidades_gestoras"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        {canEdit && (
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova Unidade</Button></DialogTrigger>
              <UnidadeForm initial={edit} onSave={save} onCancel={() => { setOpen(false); setEdit(null); }} />
            </Dialog>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Esfera</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome_unidade}</TableCell>
                <TableCell>{u.sigla ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{u.esfera}</Badge></TableCell>
                <TableCell>{u.municipio ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{u.cnpj ? maskCnpj(u.cnpj) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.status ? "default" : "outline"}>{u.status ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => { setEdit(u); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UnidadeForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState<any>(initial ?? { esfera: "municipal", status: true });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} Unidade Gestora</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nome *</Label><Input value={form.nome_unidade ?? ""} onChange={(e) => setForm({ ...form, nome_unidade: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Sigla</Label><Input value={form.sigla ?? ""} onChange={(e) => setForm({ ...form, sigla: e.target.value })} /></div>
          <div>
            <Label>Esfera</Label>
            <Select value={form.esfera} onValueChange={(v) => setForm({ ...form, esfera: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="municipal">Municipal</SelectItem>
                <SelectItem value="estadual">Estadual</SelectItem>
                <SelectItem value="federal">Federal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Município</Label><Input value={form.municipio ?? ""} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></div>
          <div><Label>CNPJ</Label><Input value={form.cnpj ? maskCnpj(form.cnpj) : ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.status ?? true} onCheckedChange={(v) => setForm({ ...form, status: v })} />
          <Label>Ativa</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SimpleCrud({ table, label }: { table: "orgaos_julgadores" | "tipos_decisao" | "tipos_julgamento"; label: string }) {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [novo, setNovo] = useState("");

  const { data } = useQuery({
    queryKey: [table],
    queryFn: async () => (await supabase.from(table).select("*").order("descricao")).data ?? [],
  });

  const add = async () => {
    if (!novo.trim()) return;
    const { error } = await supabase.from(table).insert({ descricao: novo.trim() });
    if (error) { toast.error(error.message); return; }
    setNovo(""); toast.success("Adicionado.");
    qc.invalidateQueries({ queryKey: [table] });
  };

  const toggle = async (id: string, ativo: boolean) => {
    await supabase.from(table).update({ ativo: !ativo }).eq("id", id);
    qc.invalidateQueries({ queryKey: [table] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        {canEdit && (
          <div className="flex gap-2">
            <Input placeholder={`Novo ${label}…`} value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="w-[100px]">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.descricao}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Switch checked={r.ativo} onCheckedChange={() => toggle(r.id, r.ativo)} />
                  ) : (
                    <Badge variant={r.ativo ? "default" : "outline"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TiposDeliberacao() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ cor: "#1e40af", icone: "gavel", gera_prazo: false, permite_valor: false, permite_unidade_medida: false, ativo: true });

  const { data } = useQuery({
    queryKey: ["tipos_deliberacao"],
    queryFn: async () => (await supabase.from("tipos_deliberacao").select("*").order("descricao")).data ?? [],
  });

  const save = async () => {
    const { error } = await supabase.from("tipos_deliberacao").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Adicionado.");
    setOpen(false);
    setForm({ cor: "#1e40af", icone: "gavel", gera_prazo: false, permite_valor: false, permite_unidade_medida: false, ativo: true });
    qc.invalidateQueries({ queryKey: ["tipos_deliberacao"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        {canEdit && (
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Novo Tipo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Tipo de Deliberação</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Descrição *</Label><Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
                    <div><Label>Ícone (lucide)</Label><Input value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Switch checked={form.gera_prazo} onCheckedChange={(v) => setForm({ ...form, gera_prazo: v })} /><Label>Gera prazo</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={form.permite_valor} onCheckedChange={(v) => setForm({ ...form, permite_valor: v })} /><Label>Permite valor</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={form.permite_unidade_medida} onCheckedChange={(v) => setForm({ ...form, permite_unidade_medida: v })} /><Label>Permite unidade de medida</Label></div>
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Características</TableHead><TableHead>Cor</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.descricao}</TableCell>
                <TableCell className="space-x-1">
                  {t.gera_prazo && <Badge variant="outline">Prazo</Badge>}
                  {t.permite_valor && <Badge variant="outline">Valor</Badge>}
                  {t.permite_unidade_medida && <Badge variant="outline">Unidade</Badge>}
                </TableCell>
                <TableCell><div className="h-5 w-5 rounded" style={{ backgroundColor: t.cor }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
