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
      <TabsList>
        <TabsTrigger value="unidades">Unidades Gestoras</TabsTrigger>
        <TabsTrigger value="orgaos">Órgãos Julgadores</TabsTrigger>
        <TabsTrigger value="tipos_decisao">Tipos de Decisão</TabsTrigger>
        <TabsTrigger value="tipos_julgamento">Tipos de Julgamento</TabsTrigger>
        <TabsTrigger value="tipos_deliberacao">Tipos de Deliberação</TabsTrigger>
        <TabsTrigger value="unidades_tecnicas">Unidades Técnicas</TabsTrigger>
        <TabsTrigger value="processos">Processos</TabsTrigger>
        <TabsTrigger value="fontes">Fontes Externas (API)</TabsTrigger>
      </TabsList>
      <TabsContent value="unidades"><UnidadesGestoras /></TabsContent>
      <TabsContent value="orgaos"><SimpleCrud table="orgaos_julgadores" label="Órgão Julgador" /></TabsContent>
      <TabsContent value="tipos_decisao"><SimpleCrud table="tipos_decisao" label="Tipo de Decisão" /></TabsContent>
      <TabsContent value="tipos_julgamento"><SimpleCrud table="tipos_julgamento" label="Tipo de Julgamento" /></TabsContent>
      <TabsContent value="tipos_deliberacao"><TiposDeliberacao /></TabsContent>
      <TabsContent value="unidades_tecnicas"><UnidadesTecnicas /></TabsContent>
      <TabsContent value="processos"><Processos /></TabsContent>
      <TabsContent value="fontes"><FontesDados /></TabsContent>
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
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { cor: "#1e40af", icone: "gavel", gera_prazo: false, permite_valor: false, permite_unidade_medida: false, ativo: true };
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

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-end gap-2">
          <ExportButton rows={data ?? []} filename="tipos_deliberacao" />
          {canEdit && (
            <ImportButton
              table="tipos_deliberacao"
              hint="Colunas: descricao, cor, icone, gera_prazo, permite_valor, permite_unidade_medida, ativo"
              onDone={() => qc.invalidateQueries({ queryKey: ["tipos_deliberacao"] })}
              mapRow={(r) => {
                if (!r.descricao) return null;
                const b = (v: any, d = false) => v === undefined || v === null || v === "" ? d : (v === true || v === "true" || v === 1 || v === "1");
                return {
                  descricao: String(r.descricao).trim(),
                  cor: r.cor ? String(r.cor) : "#1e40af",
                  icone: r.icone ? String(r.icone) : "gavel",
                  gera_prazo: b(r.gera_prazo),
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
                    <div className="flex items-center gap-2"><Switch checked={form.gera_prazo} onCheckedChange={(v) => setForm({ ...form, gera_prazo: v })} /><Label>Gera prazo</Label></div>
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
                  {t.gera_prazo && <Badge variant="outline">Prazo</Badge>}
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
