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
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { maskCnpj } from "@/lib/masks";
import { exportRows, parseImportFile } from "@/lib/export";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRef } from "react";

function ExportButton({ rows, filename }: { rows: any[]; filename: string }) {
  const disabled = !rows || rows.length === 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportRows(rows, filename, "xlsx")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportRows(rows, filename, "csv")}>CSV (.csv)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ImportButton({
  table,
  mapRow,
  onDone,
  hint,
}: {
  table: string;
  mapRow: (row: any) => any | null;
  onDone: () => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const rows = await parseImportFile(file);
      const payload = rows.map(mapRow).filter((x): x is any => x !== null);
      if (payload.length === 0) { toast.error("Nenhuma linha válida encontrada."); return; }
      const { error } = await (supabase as any).from(table).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(`${payload.length} registro(s) importado(s).`);
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao importar.");
    }
  };
  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.csv" className="hidden" onChange={handle} />
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()} title={hint}>
        <Upload className="h-4 w-4" /> Importar
      </Button>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/cadastros")({
  component: CadastrosPage,
});

function CadastrosPage() {
  return (
    <Tabs defaultValue="unidades">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="unidades">Unidades Gestoras</TabsTrigger>
        <TabsTrigger value="orgaos">Órgãos Julgadores</TabsTrigger>
        <TabsTrigger value="tipos_decisao">Tipos de Decisão</TabsTrigger>
        <TabsTrigger value="tipos_julgamento">Tipos de Julgamento</TabsTrigger>
        <TabsTrigger value="tipos_deliberacao">Tipos de Deliberação</TabsTrigger>
        <TabsTrigger value="unidades_tecnicas">Unidades Técnicas</TabsTrigger>
        <TabsTrigger value="resultados_monitoramento">Resultados Monitoramento</TabsTrigger>
        <TabsTrigger value="status_monitoramento">Status Monitoramento</TabsTrigger>
        <TabsTrigger value="tribunais">Tribunais</TabsTrigger>
        <TabsTrigger value="processos">Processos</TabsTrigger>
        <TabsTrigger value="fontes">Fontes Externas (API)</TabsTrigger>
      </TabsList>
      <TabsContent value="unidades"><UnidadesGestoras /></TabsContent>
      <TabsContent value="orgaos"><SimpleCrud table="orgaos_julgadores" label="Órgão Julgador" /></TabsContent>
      <TabsContent value="tipos_decisao"><SimpleCrud table="tipos_decisao" label="Tipo de Decisão" /></TabsContent>
      <TabsContent value="tipos_julgamento"><SimpleCrud table="tipos_julgamento" label="Tipo de Julgamento" /></TabsContent>
      <TabsContent value="tipos_deliberacao"><TiposDeliberacao /></TabsContent>
      <TabsContent value="unidades_tecnicas"><UnidadesTecnicas /></TabsContent>
      <TabsContent value="resultados_monitoramento"><SimpleCrud table="resultados_monitoramento" label="Resultado de Monitoramento" /></TabsContent>
      <TabsContent value="status_monitoramento"><StatusMonitoramento /></TabsContent>
      <TabsContent value="tribunais"><Tribunais /></TabsContent>
      <TabsContent value="processos"><Processos /></TabsContent>
      <TabsContent value="fontes"><FontesDados /></TabsContent>
    </Tabs>
  );
}

function UnidadesGestoras() {
  const qc = useQueryClient();
  const { hasAnyRole, hasRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const canDelete = hasRole("admin");
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

  const remove = async (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"? Só será concluído se não houver registros associados.`)) return;
    const { error } = await supabase.from("unidades_gestoras").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir: existem registros que utilizam esta unidade. Considere desativá-la."); return; }
    toast.success("Excluído.");
    qc.invalidateQueries({ queryKey: ["unidades_gestoras"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename="unidades_gestoras" />
          {canEdit && (
            <ImportButton
              table="unidades_gestoras"
              onDone={() => qc.invalidateQueries({ queryKey: ["unidades_gestoras"] })}
              hint="Colunas: nome_unidade, sigla, esfera, municipio, cnpj, status"
              mapRow={(r) => {
                if (!r.nome_unidade) return null;
                return {
                  nome_unidade: String(r.nome_unidade).trim(),
                  sigla: r.sigla ? String(r.sigla).trim() : null,
                  esfera: ["municipal", "estadual", "federal"].includes(String(r.esfera)) ? r.esfera : "municipal",
                  municipio: r.municipio ? String(r.municipio).trim() : null,
                  cnpj: r.cnpj ? String(r.cnpj).replace(/\D/g, "") : null,
                  status: r.status === false || r.status === "false" || r.status === 0 ? false : true,
                };
              }}
            />
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova Unidade</Button></DialogTrigger>
              <UnidadeForm initial={edit} onSave={save} onCancel={() => { setOpen(false); setEdit(null); }} />
            </Dialog>
          )}
        </div>
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
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => { setEdit(u); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => remove(u.id, u.nome_unidade)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
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

function SimpleCrud({ table, label }: { table: "orgaos_julgadores" | "tipos_decisao" | "tipos_julgamento" | "resultados_monitoramento"; label: string }) {
  const qc = useQueryClient();
  const { hasAnyRole, hasRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const canDelete = hasRole("admin");
  const [novo, setNovo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

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

  const saveEdit = async (id: string) => {
    if (!editingValue.trim()) { toast.error("Descrição obrigatória."); return; }
    const { error } = await supabase.from(table).update({ descricao: editingValue.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditingId(null); setEditingValue("");
    toast.success("Atualizado.");
    qc.invalidateQueries({ queryKey: [table] });
  };

  const toggle = async (id: string, ativo: boolean) => {
    await supabase.from(table).update({ ativo: !ativo }).eq("id", id);
    qc.invalidateQueries({ queryKey: [table] });
  };

  const remove = async (id: string, descricao: string) => {
    if (!confirm(`Excluir "${descricao}"? Esta ação só será concluída se não houver registros associados.`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir: existem registros que utilizam este item. Considere desativá-lo.");
      return;
    }
    toast.success("Excluído.");
    qc.invalidateQueries({ queryKey: [table] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename={table} />
          {canEdit && (
            <ImportButton
              table={table}
              hint="Colunas: descricao, ativo"
              onDone={() => qc.invalidateQueries({ queryKey: [table] })}
              mapRow={(r) => r.descricao ? { descricao: String(r.descricao).trim(), ativo: r.ativo === false ? false : true } : null}
            />
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Input placeholder={`Novo ${label}…`} value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="w-[100px]">Status</TableHead><TableHead className="w-[110px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  {editingId === r.id ? (
                    <div className="flex gap-2">
                      <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(r.id)} autoFocus />
                      <Button size="sm" onClick={() => saveEdit(r.id)}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingValue(""); }}>Cancelar</Button>
                    </div>
                  ) : r.descricao}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Switch checked={r.ativo} onCheckedChange={() => toggle(r.id, r.ativo)} />
                  ) : (
                    <Badge variant={r.ativo ? "default" : "outline"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canEdit && editingId !== r.id && (
                      <Button variant="ghost" size="icon" onClick={() => { setEditingId(r.id); setEditingValue(r.descricao); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id, r.descricao)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
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
  const { hasAnyRole, hasRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const canDelete = hasRole("admin");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { cor: "#1e40af", icone: "gavel", gera_prazo: false, prazo_facultativo: false, permite_valor: false, permite_unidade_medida: false, ativo: true };
  const [form, setForm] = useState<any>(emptyForm);

  const { data } = useQuery({
    queryKey: ["tipos_deliberacao"],
    queryFn: async () => (await supabase.from("tipos_deliberacao").select("*").order("descricao")).data ?? [],
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: any) => { setEditing(t); setForm(t); setOpen(true); };

  const save = async () => {
    if (!form.descricao?.trim()) { toast.error("Descrição obrigatória."); return; }
    const { id: _ignored, ...payload } = form;
    const { error } = editing
      ? await supabase.from("tipos_deliberacao").update(payload).eq("id", editing.id)
      : await supabase.from("tipos_deliberacao").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
    setOpen(false); setEditing(null); setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["tipos_deliberacao"] });
  };

  const toggle = async (t: any) => {
    await supabase.from("tipos_deliberacao").update({ ativo: !t.ativo }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["tipos_deliberacao"] });
  };

  const remove = async (t: any) => {
    if (!confirm(`Excluir "${t.descricao}"? Só será concluído se não houver deliberações associadas.`)) return;
    const { error } = await supabase.from("tipos_deliberacao").delete().eq("id", t.id);
    if (error) { toast.error("Não foi possível excluir: existem deliberações que utilizam este tipo. Considere desativá-lo."); return; }
    toast.success("Excluído.");
    qc.invalidateQueries({ queryKey: ["tipos_deliberacao"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename="tipos_deliberacao" />
          {canEdit && (
            <ImportButton
              table="tipos_deliberacao"
              hint="Colunas: descricao, cor, icone, gera_prazo, prazo_facultativo, permite_valor, permite_unidade_medida, ativo"
              onDone={() => qc.invalidateQueries({ queryKey: ["tipos_deliberacao"] })}
              mapRow={(r) => {
                if (!r.descricao) return null;
                const b = (v: any, d = false) => v === undefined || v === null || v === "" ? d : (v === true || v === "true" || v === 1 || v === "1");
                return {
                  descricao: String(r.descricao).trim(),
                  cor: r.cor ? String(r.cor) : "#1e40af",
                  icone: r.icone ? String(r.icone) : "gavel",
                  gera_prazo: b(r.gera_prazo),
                  prazo_facultativo: b(r.prazo_facultativo),
                  permite_valor: b(r.permite_valor),
                  permite_unidade_medida: b(r.permite_unidade_medida),
                  ativo: b(r.ativo, true),
                };
              }}
            />
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Novo Tipo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Tipo de Deliberação</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Descrição *</Label><Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
                    <div><Label>Ícone (lucide)</Label><Input value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Switch checked={form.gera_prazo} onCheckedChange={(v) => setForm({ ...form, gera_prazo: v, prazo_facultativo: v ? form.prazo_facultativo : false })} /><Label>Gera prazo</Label></div>
                    <div className="flex items-center gap-2 pl-6"><Switch checked={form.prazo_facultativo} onCheckedChange={(v) => setForm({ ...form, prazo_facultativo: v })} disabled={!form.gera_prazo} /><Label className={form.gera_prazo ? "" : "opacity-50"}>Prazo facultativo (não obrigatório ao cadastrar)</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={form.permite_valor} onCheckedChange={(v) => setForm({ ...form, permite_valor: v })} /><Label>Permite valor</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={form.permite_unidade_medida} onCheckedChange={(v) => setForm({ ...form, permite_unidade_medida: v })} /><Label>Permite unidade de medida</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Características</TableHead><TableHead>Cor</TableHead><TableHead className="w-[100px]">Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.descricao}</TableCell>
                <TableCell className="space-x-1">
                  {t.gera_prazo && <Badge variant="outline">{t.prazo_facultativo ? "Prazo (opcional)" : "Prazo"}</Badge>}
                  {t.permite_valor && <Badge variant="outline">Valor</Badge>}
                  {t.permite_unidade_medida && <Badge variant="outline">Unidade</Badge>}
                </TableCell>
                <TableCell><div className="h-5 w-5 rounded" style={{ backgroundColor: t.cor }} /></TableCell>
                <TableCell>
                  {canEdit ? (
                    <Switch checked={t.ativo} onCheckedChange={() => toggle(t)} />
                  ) : (
                    <Badge variant={t.ativo ? "default" : "outline"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
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

const TIPO_ALVO_LABELS: Record<string, string> = {
  processos: "Processos",
  unidades_gestoras: "Unidades Gestoras",
  orgaos_julgadores: "Órgãos Julgadores",
  tipos_decisao: "Tipos de Decisão",
  tipos_julgamento: "Tipos de Julgamento",
  tipos_deliberacao: "Tipos de Deliberação",
};

function FontesDados() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { nome: "", tipo_alvo: "processos", url: "", headers: "{}", caminho_lista: "", campo_label: "label", campo_valor: "value", ativo: true };
  const [form, setForm] = useState<any>(emptyForm);

  const { data } = useQuery({
    queryKey: ["fontes_dados"],
    queryFn: async () => (await supabase.from("fontes_dados").select("*").order("nome")).data ?? [],
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (f: any) => {
    setEditing(f);
    setForm({ ...f, headers: JSON.stringify(f.headers ?? {}, null, 2), caminho_lista: f.caminho_lista ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.url.trim()) { toast.error("Nome e URL são obrigatórios."); return; }
    let headers = {};
    try { headers = form.headers?.trim() ? JSON.parse(form.headers) : {}; }
    catch { toast.error("Cabeçalhos devem ser JSON válido."); return; }
    const payload: any = {
      nome: form.nome.trim(),
      tipo_alvo: form.tipo_alvo,
      url: form.url.trim(),
      headers,
      caminho_lista: form.caminho_lista?.trim() || null,
      campo_label: form.campo_label.trim() || "label",
      campo_valor: form.campo_valor.trim() || "value",
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("fontes_dados").update(payload).eq("id", editing.id)
      : await supabase.from("fontes_dados").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
    setOpen(false); setEditing(null); setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["fontes_dados"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta fonte?")) return;
    await supabase.from("fontes_dados").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["fontes_dados"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Cadastre URLs de APIs que retornam JSON. Use <code className="bg-muted px-1 rounded">{"{query}"}</code> na URL para passar o termo de busca digitado pelo usuário (ex: número do processo). O sistema mapeia <strong>campo_label</strong> e <strong>campo_valor</strong> a partir de cada item retornado.
        </p>
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename="fontes_dados" />
          {canEdit && (
            <ImportButton
              table="fontes_dados"
              hint="Colunas: nome, tipo_alvo, url, headers (JSON), caminho_lista, campo_label, campo_valor, ativo"
              onDone={() => qc.invalidateQueries({ queryKey: ["fontes_dados"] })}
              mapRow={(r) => {
                if (!r.nome || !r.url) return null;
                let headers: any = {};
                if (r.headers) {
                  try { headers = typeof r.headers === "string" ? JSON.parse(r.headers) : r.headers; } catch { headers = {}; }
                }
                return {
                  nome: String(r.nome).trim(),
                  tipo_alvo: r.tipo_alvo ? String(r.tipo_alvo) : "processos",
                  url: String(r.url).trim(),
                  headers,
                  caminho_lista: r.caminho_lista ? String(r.caminho_lista).trim() : null,
                  campo_label: r.campo_label ? String(r.campo_label).trim() : "label",
                  campo_valor: r.campo_valor ? String(r.campo_valor).trim() : "value",
                  ativo: r.ativo === false ? false : true,
                };
              }}
            />
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Nova Fonte</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Fonte de Dados</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                    <div>
                      <Label>Popula</Label>
                      <Select value={form.tipo_alvo} onValueChange={(v) => setForm({ ...form, tipo_alvo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_ALVO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>URL *</Label><Input placeholder="https://api.exemplo.gov.br/processos?q={query}" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
                  <div><Label>Cabeçalhos (JSON)</Label><Input placeholder='{"Authorization":"Bearer ..."}' value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Caminho da lista</Label><Input placeholder="data.items" value={form.caminho_lista} onChange={(e) => setForm({ ...form, caminho_lista: e.target.value })} /></div>
                    <div><Label>Campo rótulo</Label><Input value={form.campo_label} onChange={(e) => setForm({ ...form, campo_label: e.target.value })} /></div>
                    <div><Label>Campo valor</Label><Input value={form.campo_valor} onChange={(e) => setForm({ ...form, campo_valor: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativa</Label></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Popula</TableHead><TableHead>URL</TableHead><TableHead className="w-[80px]">Status</TableHead><TableHead className="w-[90px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell><Badge variant="outline">{TIPO_ALVO_LABELS[f.tipo_alvo] ?? f.tipo_alvo}</Badge></TableCell>
                <TableCell className="font-mono text-xs max-w-md truncate">{f.url}</TableCell>
                <TableCell><Badge variant={f.ativo ? "default" : "outline"}>{f.ativo ? "Ativa" : "Inativa"}</Badge></TableCell>
                <TableCell>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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

function UnidadesTecnicas() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { nome: "", sigla: "", ativo: true };
  const [form, setForm] = useState<any>(emptyForm);

  const { data } = useQuery({
    queryKey: ["unidades_tecnicas"],
    queryFn: async () => (await (supabase as any).from("unidades_tecnicas").select("*").order("nome")).data ?? [],
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (u: any) => { setEditing(u); setForm(u); setOpen(true); };

  const save = async () => {
    if (!form.nome?.trim()) { toast.error("Nome obrigatório."); return; }
    const payload = { nome: form.nome.trim(), sigla: form.sigla?.trim() || null, ativo: form.ativo };
    const { error } = editing
      ? await (supabase as any).from("unidades_tecnicas").update(payload).eq("id", editing.id)
      : await (supabase as any).from("unidades_tecnicas").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
    setOpen(false); setEditing(null); setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["unidades_tecnicas"] });
  };

  const toggle = async (u: any) => {
    await (supabase as any).from("unidades_tecnicas").update({ ativo: !u.ativo }).eq("id", u.id);
    qc.invalidateQueries({ queryKey: ["unidades_tecnicas"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Unidades técnicas responsáveis pela execução do monitoramento das deliberações.</p>
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename="unidades_tecnicas" />
          {canEdit && (
            <ImportButton
              table="unidades_tecnicas"
              hint="Colunas: nome, sigla, ativo"
              onDone={() => qc.invalidateQueries({ queryKey: ["unidades_tecnicas"] })}
              mapRow={(r) => r.nome ? { nome: String(r.nome).trim(), sigla: r.sigla ? String(r.sigla).trim() : null, ativo: r.ativo === false ? false : true } : null}
            />
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Nova Unidade Técnica</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Unidade Técnica</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div><Label>Sigla</Label><Input value={form.sigla ?? ""} onChange={(e) => setForm({ ...form, sigla: e.target.value })} /></div>
                  <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativa</Label></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Sigla</TableHead><TableHead className="w-[100px]">Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.sigla ?? "—"}</TableCell>
                <TableCell>
                  {canEdit ? <Switch checked={u.ativo} onCheckedChange={() => toggle(u)} /> : <Badge variant={u.ativo ? "default" : "outline"}>{u.ativo ? "Ativa" : "Inativa"}</Badge>}
                </TableCell>
                <TableCell>
                  {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Processos() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { numero: "", descricao: "", ativo: true };
  const [form, setForm] = useState<any>(emptyForm);

  const { data } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => (await (supabase as any).from("processos").select("*").order("numero")).data ?? [],
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm(p); setOpen(true); };

  const save = async () => {
    if (!form.numero?.trim()) { toast.error("Número obrigatório."); return; }
    const payload = { numero: form.numero.trim(), descricao: form.descricao?.trim() || null, ativo: form.ativo };
    const { error } = editing
      ? await (supabase as any).from("processos").update(payload).eq("id", editing.id)
      : await (supabase as any).from("processos").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
    setOpen(false); setEditing(null); setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["processos"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este processo?")) return;
    await (supabase as any).from("processos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["processos"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Cadastro básico de processos. Use Importar para carregar uma planilha (.xlsx/.csv) com as colunas <code className="bg-muted px-1 rounded">numero</code>, <code className="bg-muted px-1 rounded">descricao</code>, <code className="bg-muted px-1 rounded">ativo</code>.</p>
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename="processos" />
          {canEdit && (
            <ImportButton
              table="processos"
              hint="Colunas: numero, descricao, ativo"
              onDone={() => qc.invalidateQueries({ queryKey: ["processos"] })}
              mapRow={(r) => r.numero ? { numero: String(r.numero).trim(), descricao: r.descricao ? String(r.descricao).trim() : null, ativo: r.ativo === false ? false : true } : null}
            />
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Novo Processo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Processo</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                  <div><Label>Descrição</Label><Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                  <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Descrição</TableHead><TableHead className="w-[100px]">Status</TableHead><TableHead className="w-[90px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.numero}</TableCell>
                <TableCell>{p.descricao ?? "—"}</TableCell>
                <TableCell><Badge variant={p.ativo ? "default" : "outline"}>{p.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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

function StatusMonitoramento() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin");

  const { data } = useQuery({
    queryKey: ["status_monitoramento_options"],
    queryFn: async () => (await (supabase as any).from("status_monitoramento_options").select("*").order("ordem")).data ?? [],
  });

  const update = async (codigo: string, patch: any) => {
    const { error } = await (supabase as any).from("status_monitoramento_options").update(patch).eq("codigo", codigo);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["status_monitoramento_options"] });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Status disponíveis para o monitoramento das deliberações. O código é fixo (vinculado ao sistema); descrição, ordem e cor são editáveis.</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[80px]">Ordem</TableHead>
              <TableHead className="w-[80px]">Cor</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((s: any) => (
              <TableRow key={s.codigo}>
                <TableCell className="font-mono text-xs">{s.codigo}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Input defaultValue={s.descricao} onBlur={(e) => e.target.value !== s.descricao && update(s.codigo, { descricao: e.target.value })} />
                  ) : s.descricao}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Input type="number" defaultValue={s.ordem} className="w-20" onBlur={(e) => Number(e.target.value) !== s.ordem && update(s.codigo, { ordem: Number(e.target.value) })} />
                  ) : s.ordem}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Input type="color" defaultValue={s.cor} className="h-8 w-12 p-0.5" onBlur={(e) => e.target.value !== s.cor && update(s.codigo, { cor: e.target.value })} />
                  ) : <div className="h-5 w-5 rounded" style={{ backgroundColor: s.cor }} />}
                </TableCell>
                <TableCell>
                  {canEdit ? <Switch checked={s.ativo} onCheckedChange={(v) => update(s.codigo, { ativo: v })} /> : <Badge variant={s.ativo ? "default" : "outline"}>{s.ativo ? "Ativo" : "Inativo"}</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Tribunais() {
  const qc = useQueryClient();
  const { hasRole, tribunalId, isMaster, refreshRoles } = useAuth();
  const isAdmin = hasRole("admin");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { sigla: "", nome: "", esfera: "estadual", logo_url: "", ativo: true };
  const [form, setForm] = useState<any>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery({
    queryKey: ["tribunais"],
    queryFn: async () => (await (supabase as any).from("tribunais").select("*").order("sigla")).data ?? [],
  });

  const visible = (data ?? []).filter((t: any) => isMaster || !tribunalId || t.id === tribunalId);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...t, logo_url: t.logo_url ?? "" }); setOpen(true); };

  const handleLogoUpload = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${form.sigla || editing?.sigla || "tmp"}_${Date.now()}_${file.name}`.replace(/\s+/g, "_");
      const { error } = await supabase.storage.from("tribunal-logos").upload(path, file, { upsert: true });
      if (error) { toast.error(error.message); return; }
      const { data: pub } = supabase.storage.from("tribunal-logos").getPublicUrl(path);
      setForm({ ...form, logo_url: pub.publicUrl });
      toast.success("Logo enviada.");
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.sigla?.trim() || !form.nome?.trim()) { toast.error("Sigla e nome obrigatórios."); return; }
    const payload = { sigla: form.sigla.trim(), nome: form.nome.trim(), esfera: form.esfera, logo_url: form.logo_url || null, ativo: form.ativo };
    const { error } = editing
      ? await (supabase as any).from("tribunais").update(payload).eq("id", editing.id)
      : await (supabase as any).from("tribunais").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
    setOpen(false); setEditing(null); setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["tribunais"] });
    refreshRoles();
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">{isMaster ? "Você é usuário master e pode editar qualquer tribunal." : "Você visualiza apenas o seu tribunal. Edite a logo (brasão) e os dados de identificação."}</p>
        <div className="flex justify-end gap-2">
          <ExportButton rows={visible} filename="tribunais" />
          {isMaster && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Novo Tribunal</Button></DialogTrigger>
              <TribunalDialog editing={editing} form={form} setForm={setForm} uploading={uploading} onUpload={handleLogoUpload} onSave={save} onCancel={() => setOpen(false)} />
            </Dialog>
          )}
          {!isMaster && isAdmin && tribunalId && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
              <TribunalDialog editing={editing} form={form} setForm={setForm} uploading={uploading} onUpload={handleLogoUpload} onSave={save} onCancel={() => setOpen(false)} />
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Logo</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Esfera</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>
                  {t.logo_url ? <img src={t.logo_url} alt={t.sigla} className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 rounded bg-muted" />}
                </TableCell>
                <TableCell className="font-mono text-xs">{t.sigla}</TableCell>
                <TableCell>{t.nome}</TableCell>
                <TableCell><Badge variant="outline">{t.esfera}</Badge></TableCell>
                <TableCell><Badge variant={t.ativo ? "default" : "outline"}>{t.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  {(isMaster || (isAdmin && t.id === tribunalId)) && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
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

function TribunalDialog({ editing, form, setForm, uploading, onUpload, onSave, onCancel }: any) {
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Tribunal</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Sigla *</Label><Input value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })} /></div>
          <div>
            <Label>Esfera</Label>
            <Select value={form.esfera} onValueChange={(v) => setForm({ ...form, esfera: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="federal">Federal</SelectItem>
                <SelectItem value="estadual">Estadual</SelectItem>
                <SelectItem value="distrital">Distrital</SelectItem>
                <SelectItem value="municipal_estadual">Municipal (estadual)</SelectItem>
                <SelectItem value="municipal">Municipal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div>
          <Label>Logo (brasão)</Label>
          <div className="flex items-center gap-3">
            {form.logo_url && <img src={form.logo_url} alt="logo" className="h-12 w-12 object-contain border rounded" />}
            <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0])} />
          </div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={onSave}>Salvar</Button></DialogFooter>
    </DialogContent>
  );
}
