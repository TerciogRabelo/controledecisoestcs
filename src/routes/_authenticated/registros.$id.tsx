import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

function ProcessoInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [suggestions, setSuggestions] = useState<{ value: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchFn = useServerFn(fetchFonteExterna);

  const { data: fonte } = useQuery({
    queryKey: ["fonte_processos"],
    queryFn: async () => {
      const { data } = await supabase.from("fontes_dados").select("id").eq("tipo_alvo", "processos").eq("ativo", true).limit(1).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!fonte?.id || value.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res: any = await fetchFn({ data: { fonteId: fonte.id, query: value } });
        setSuggestions(res.items ?? []);
        setOpen((res.items ?? []).length > 0);
      } finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [value, fonte?.id]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(maskProcesso(e.target.value))}
        placeholder="000000/0000"
        disabled={disabled}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2.5 text-muted-foreground" />}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={(e) => { e.preventDefault(); onChange(maskProcesso(s.value)); setOpen(false); }}
            >
              <div className="font-mono">{s.value}</div>
              <div className="text-xs text-muted-foreground truncate">{s.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { maskProcesso, maskCpfCnpj, formatDate } from "@/lib/masks";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { fetchFonteExterna } from "@/lib/fontes.functions";

export const Route = createFileRoute("/_authenticated/registros/$id")({
  component: RegistroFormPage,
});

const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_monitoramento: "Em monitoramento",
  cumprida: "Cumprida",
  descumprida: "Descumprida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

type RD = {
  numero_processo: string;
  numero_decisao: string;
  data_decisao: string;
  data_transito_julgado: string;
  gestor_responsavel: string;
  cpf_cnpj: string;
  observacoes: string;
  unidade_gestora_id: string | null;
  orgao_julgador_id: string | null;
  tipo_decisao_id: string | null;
  tipo_julgamento_id: string | null;
};

const empty: RD = {
  numero_processo: "",
  numero_decisao: "",
  data_decisao: "",
  data_transito_julgado: "",
  gestor_responsavel: "",
  cpf_cnpj: "",
  observacoes: "",
  unidade_gestora_id: null,
  orgao_julgador_id: null,
  tipo_decisao_id: null,
  tipo_julgamento_id: null,
};

function RegistroFormPage() {
  const { id } = useParams({ from: "/_authenticated/registros/$id" });
  const isNew = id === "novo";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasAnyRole, hasRole, user, unidadeTecnicaId } = useAuth();
  const canEdit = hasAnyRole(["admin", "secretaria"]);
  const canEditMonitoramento = hasRole("admin") || hasRole("monitoramento");
  const canCreateDeliberacao = hasAnyRole(["admin", "secretaria"]);

  const [form, setForm] = useState<RD>(empty);
  const [saving, setSaving] = useState(false);
  const [registroId, setRegistroId] = useState<string | null>(isNew ? null : id);

  const { data: lookups } = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => {
      const [u, o, td, tj, tdel, ut, rm, sm] = await Promise.all([
        supabase.from("unidades_gestoras").select("id, nome_unidade, sigla").eq("status", true).order("nome_unidade"),
        supabase.from("orgaos_julgadores").select("id, descricao").eq("ativo", true).order("descricao"),
        supabase.from("tipos_decisao").select("id, descricao").eq("ativo", true).order("descricao"),
        supabase.from("tipos_julgamento").select("id, descricao").eq("ativo", true).order("descricao"),
        supabase.from("tipos_deliberacao").select("*").eq("ativo", true).order("descricao"),
        (supabase as any).from("unidades_tecnicas").select("id, nome, sigla").eq("ativo", true).order("nome"),
        (supabase as any).from("resultados_monitoramento").select("id, descricao").eq("ativo", true).order("ordem"),
        (supabase as any).from("status_monitoramento_options").select("codigo, descricao, cor, ordem").eq("ativo", true).order("ordem"),
      ]);
      return { unidades: u.data ?? [], orgaos: o.data ?? [], tiposDecisao: td.data ?? [], tiposJulg: tj.data ?? [], tiposDel: tdel.data ?? [], unidadesTec: ut.data ?? [], resultadosMon: rm.data ?? [], statusOptions: sm.data ?? [] };
    },
  });

  const { data: registro } = useQuery({
    queryKey: ["registro", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("registros_decisao").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: deliberacoes, refetch: refetchDel } = useQuery({
    queryKey: ["deliberacoes", registroId],
    enabled: !!registroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliberacoes")
        .select("*, tipos_deliberacao(descricao, cor, gera_prazo, permite_valor, permite_unidade_medida)")
        .eq("registro_decisao_id", registroId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (registro) {
      setForm({
        numero_processo: registro.numero_processo ?? "",
        numero_decisao: registro.numero_decisao ?? "",
        data_decisao: registro.data_decisao ?? "",
        data_transito_julgado: registro.data_transito_julgado ?? "",
        gestor_responsavel: registro.gestor_responsavel ?? "",
        cpf_cnpj: registro.cpf_cnpj ?? "",
        observacoes: registro.observacoes ?? "",
        unidade_gestora_id: registro.unidade_gestora_id,
        orgao_julgador_id: registro.orgao_julgador_id,
        tipo_decisao_id: registro.tipo_decisao_id,
        tipo_julgamento_id: registro.tipo_julgamento_id,
      });
    }
  }, [registro]);

  const validateDates = (): string | null => {
    if (form.data_decisao && form.data_decisao > TODAY) return "Data da decisão não pode ser futura.";
    if (form.data_transito_julgado && form.data_transito_julgado > TODAY) return "Data de trânsito em julgado não pode ser futura.";
    return null;
  };

  const save = async () => {
    if (!form.numero_processo || form.numero_processo.length < 11) {
      toast.error("Informe o número do processo no formato 000000/0000.");
      return;
    }
    const dateErr = validateDates();
    if (dateErr) { toast.error(dateErr); return; }
    setSaving(true);
    try {
      const payload = { ...form, atualizado_por: user?.id };
      if (isNew) {
        const { data, error } = await supabase
          .from("registros_decisao")
          .insert({ ...payload, criado_por: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Registro criado.");
        setRegistroId(data.id);
        navigate({ to: "/registros/$id", params: { id: data.id } });
      } else {
        const { error } = await supabase.from("registros_decisao").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Registro atualizado.");
      }
      qc.invalidateQueries({ queryKey: ["registros"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof RD>(k: K, v: RD[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/registros"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{isNew ? "Novo Registro de Decisão" : `Processo ${form.numero_processo}`}</h2>
            <p className="text-xs text-muted-foreground">Preencha os blocos e salve para habilitar deliberações.</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">1. Identificação do Processo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Número do Processo *">
            <ProcessoInput value={form.numero_processo} onChange={(v: string) => set("numero_processo", v)} disabled={!canEdit} />
          </Field>
          <Field label="Órgão Julgador">
            <SelectField value={form.orgao_julgador_id} onChange={(v) => set("orgao_julgador_id", v)} options={lookups?.orgaos.map((o) => ({ value: o.id, label: o.descricao })) ?? []} disabled={!canEdit} />
          </Field>
          <Field label="Unidade Gestora">
            <SelectField value={form.unidade_gestora_id} onChange={(v) => set("unidade_gestora_id", v)} options={lookups?.unidades.map((o) => ({ value: o.id, label: `${o.sigla ? o.sigla + " — " : ""}${o.nome_unidade}` })) ?? []} disabled={!canEdit} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">2. Decisão</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Tipo de Decisão">
            <SelectField value={form.tipo_decisao_id} onChange={(v) => set("tipo_decisao_id", v)} options={lookups?.tiposDecisao.map((o) => ({ value: o.id, label: o.descricao })) ?? []} disabled={!canEdit} />
          </Field>
          <Field label="Número da Decisão">
            <Input value={form.numero_decisao} onChange={(e) => set("numero_decisao", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Data da Decisão">
            <Input type="date" max={TODAY} value={form.data_decisao} onChange={(e) => set("data_decisao", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Tipo de Julgamento">
            <SelectField value={form.tipo_julgamento_id} onChange={(v) => set("tipo_julgamento_id", v)} options={lookups?.tiposJulg.map((o) => ({ value: o.id, label: o.descricao })) ?? []} disabled={!canEdit} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">3. Gestor Responsável</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="CPF/CNPJ *">
            <CpfCnpjLookup
              value={form.cpf_cnpj}
              onChange={(v) => set("cpf_cnpj", v)}
              onMatch={(nome) => {
                if (nome && !form.gestor_responsavel) set("gestor_responsavel", nome);
              }}
              disabled={!canEdit}
              currentRegistroId={isNew ? null : id}
            />
          </Field>
          <Field label="Nome do Gestor">
            <Input value={form.gestor_responsavel} onChange={(e) => set("gestor_responsavel", e.target.value)} disabled={!canEdit} placeholder="Preenchido automaticamente se já cadastrado" />
          </Field>
          <Field label="Data de Trânsito em Julgado">
            <Input type="date" max={TODAY} value={form.data_transito_julgado} onChange={(e) => set("data_transito_julgado", e.target.value)} disabled={!canEdit} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">4. Observações</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} disabled={!canEdit} />
        </CardContent>
      </Card>

      {!isNew && registroId && (
        <RegistroAnexos registroId={registroId} canEdit={canEdit} />
      )}

      {!isNew && registroId && (
        <DeliberacoesGrid
          registroId={registroId}
          numeroProcessoOrigem={form.numero_processo}
          tipos={lookups?.tiposDel ?? []}
          unidadesTec={lookups?.unidadesTec ?? []}
          resultadosMon={lookups?.resultadosMon ?? []}
          statusOptions={lookups?.statusOptions ?? []}
          deliberacoes={deliberacoes ?? []}
          onChange={refetchDel}
          canEdit={canEdit}
          canCreateDeliberacao={canCreateDeliberacao}
          canEditMonitoramento={canEditMonitoramento}
          userUnidadeTecnicaId={unidadeTecnicaId}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, disabled }: { value: string | null; onChange: (v: string | null) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <Select value={value ?? undefined} onValueChange={(v) => onChange(v || null)} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function computePrazo(d: any): { label: string; tone: "ok" | "warn" | "danger" | "muted" } {
  if (!d.tipos_deliberacao?.gera_prazo || !d.prazo_dias || !d.data_inicio_prazo) {
    return { label: "—", tone: "muted" };
  }
  if (d.status_monitoramento === "cumprida" || d.status_monitoramento === "cancelada") {
    return { label: `${d.prazo_dias}d`, tone: "muted" };
  }
  const inicio = new Date(d.data_inicio_prazo + "T00:00:00");
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + Number(d.prazo_dias));
  const hoje = new Date(TODAY + "T00:00:00");
  const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Vencida há ${-diff}d`, tone: "danger" };
  if (diff <= 7) return { label: `${diff}d restantes`, tone: "warn" };
  return { label: `${diff}d restantes`, tone: "ok" };
}

function DeliberacoesGrid({ registroId, numeroProcessoOrigem, tipos, unidadesTec, resultadosMon, statusOptions, deliberacoes, onChange, canEdit, canCreateDeliberacao, canEditMonitoramento, userUnidadeTecnicaId }: {
  registroId: string;
  numeroProcessoOrigem: string;
  tipos: any[];
  unidadesTec: any[];
  resultadosMon: any[];
  statusOptions: any[];
  deliberacoes: any[];
  onChange: () => void;
  canEdit: boolean;
  canCreateDeliberacao: boolean;
  canEditMonitoramento: boolean;
  userUnidadeTecnicaId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { status_monitoramento: "nao_iniciado", deliberacao_solidaria: false, anexos: [] as any[] };
  const [form, setForm] = useState<any>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const tipoSel = tipos.find((t) => t.id === form.tipo_deliberacao_id);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      tipo_deliberacao_id: d.tipo_deliberacao_id,
      status_monitoramento: d.status_monitoramento,
      deliberacao_solidaria: d.deliberacao_solidaria,
      descricao: d.descricao,
      observacao: d.observacao,
      prazo_dias: d.prazo_dias,
      data_inicio_prazo: d.data_inicio_prazo,
      valor: d.valor,
      unidade_medida: d.unidade_medida,
      resposta_gestor: d.resposta_gestor,
      resultado_monitoramento: d.resultado_monitoramento,
      resultado_monitoramento_id: d.resultado_monitoramento_id,
      data_verificacao: d.data_verificacao,
      unidade_tecnica_id: d.unidade_tecnica_id,
      monitoramento_inicio: d.monitoramento_inicio,
      monitoramento_fim: d.monitoramento_fim,
      monitoramento_tipo: d.monitoramento_tipo,
      monitoramento_processo_origem: d.monitoramento_processo_origem,
      monitoramento_numero_processo: d.monitoramento_numero_processo,
      anexos: d.anexos ?? [],
    });
    setOpen(true);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newAnexos: any[] = [...(form.anexos ?? [])];
      for (const file of Array.from(files)) {
        const path = `${registroId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("deliberacao-anexos").upload(path, file);
        if (error) { toast.error(`Falha ao enviar ${file.name}: ${error.message}`); continue; }
        newAnexos.push({ path, nome: file.name, tamanho: file.size, criado_em: new Date().toISOString() });
      }
      setForm({ ...form, anexos: newAnexos });
      toast.success("Evidência(s) enviada(s).");
    } finally {
      setUploading(false);
    }
  };

  const removeAnexo = async (path: string) => {
    await supabase.storage.from("deliberacao-anexos").remove([path]);
    setForm({ ...form, anexos: (form.anexos ?? []).filter((a: any) => a.path !== path) });
  };

  const downloadAnexo = async (path: string) => {
    const { data } = await supabase.storage.from("deliberacao-anexos").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const submit = async () => {
    if (!form.tipo_deliberacao_id) { toast.error("Selecione o tipo de deliberação."); return; }
    if (tipoSel?.gera_prazo) {
      if (!form.data_inicio_prazo) { toast.error("Informe a data de início do prazo."); return; }
      if (!form.prazo_dias) { toast.error("Informe o prazo em dias."); return; }
    }
    if (form.data_inicio_prazo && form.data_inicio_prazo > TODAY) { toast.error("Data de início do prazo não pode ser futura."); return; }
    if (form.data_verificacao && form.data_verificacao > TODAY) { toast.error("Data de verificação não pode ser futura."); return; }
    if (form.monitoramento_inicio && form.monitoramento_fim && form.monitoramento_fim < form.monitoramento_inicio) {
      toast.error("Fim do monitoramento não pode ser anterior ao início."); return;
    }
    if (form.monitoramento_tipo === "processual" && form.monitoramento_processo_origem === false && !form.monitoramento_numero_processo?.trim()) {
      toast.error("Informe o número do outro processo de monitoramento."); return;
    }

    const payload: any = { ...form };
    if (form.monitoramento_tipo === "processual" && form.monitoramento_processo_origem) {
      payload.monitoramento_numero_processo = numeroProcessoOrigem;
    }
    if (form.monitoramento_tipo === "extraprocessual") {
      payload.monitoramento_processo_origem = null;
      payload.monitoramento_numero_processo = null;
    }

    if (editing) {
      const { error } = await supabase
        .from("deliberacoes")
        .update({ ...payload, atualizado_por: user?.id })
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Deliberação atualizada.");
    } else {
      const ins = { ...payload, registro_decisao_id: registroId, criado_por: user?.id, atualizado_por: user?.id };
      const { error } = await supabase.from("deliberacoes").insert(ins);
      if (error) { toast.error(error.message); return; }
      toast.success("Deliberação adicionada.");
    }
    setOpen(false); setEditing(null); setForm(emptyForm);
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta deliberação?")) return;
    const { error } = await supabase.from("deliberacoes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluída.");
    onChange();
  };

  // Permissões dentro do diálogo:
  // - Bloco "Deliberação" só pode ser editado por admin/secretaria
  // - Bloco "Monitoramento" só pode ser editado por admin/monitoramento
  const delibDisabled = !canEdit;
  const monitDisabled = !canEditMonitoramento;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Deliberações ({deliberacoes.length})</CardTitle>
        {(canCreateDeliberacao || canEditMonitoramento) && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
            {canCreateDeliberacao && (
              <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Nova</Button></DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar Deliberação" : "Nova Deliberação"}</DialogTitle></DialogHeader>

              {/* Bloco 1: Deliberação */}
              <div className="rounded-md border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliberação</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo de Deliberação *">
                    <SelectField value={form.tipo_deliberacao_id ?? null} onChange={(v) => setForm({ ...form, tipo_deliberacao_id: v })} options={tipos.map((t) => ({ value: t.id, label: t.descricao }))} disabled={delibDisabled} />
                  </Field>
                  <Field label="Unidade Técnica Responsável">
                    <SelectField
                      value={form.unidade_tecnica_id ?? null}
                      onChange={(v) => setForm({ ...form, unidade_tecnica_id: v })}
                      options={unidadesTec.map((u) => ({ value: u.id, label: `${u.sigla ? u.sigla + " — " : ""}${u.nome}` }))}
                      disabled={delibDisabled}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Descrição">
                      <Textarea value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} disabled={delibDisabled} />
                    </Field>
                  </div>
                  {tipoSel?.gera_prazo && (
                    <>
                      <Field label={`Data de Início do Prazo${tipoSel?.prazo_facultativo ? " (opcional)" : " *"}`}>
                        <Input type="date" max={TODAY} value={form.data_inicio_prazo ?? ""} onChange={(e) => setForm({ ...form, data_inicio_prazo: e.target.value })} disabled={delibDisabled} />
                      </Field>
                      <Field label={`Prazo (dias)${tipoSel?.prazo_facultativo ? " (opcional)" : " *"}`}>
                        <Input type="number" min={1} value={form.prazo_dias ?? ""} onChange={(e) => setForm({ ...form, prazo_dias: e.target.value ? Number(e.target.value) : null })} disabled={delibDisabled} />
                      </Field>
                    </>
                  )}
                  {tipoSel?.permite_valor && (
                    <Field label="Valor (R$)">
                      <Input type="number" step="0.01" value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: e.target.value ? Number(e.target.value) : null })} disabled={delibDisabled} />
                    </Field>
                  )}
                  {tipoSel?.permite_unidade_medida && (
                    <Field label="Unidade de Medida">
                      <Input value={form.unidade_medida ?? ""} onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })} disabled={delibDisabled} />
                    </Field>
                  )}
                  <div className="col-span-2">
                    <Field label="Observação">
                      <Textarea value={form.observacao ?? ""} onChange={(e) => setForm({ ...form, observacao: e.target.value })} rows={2} disabled={delibDisabled} />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Monitoramento */}
              <div className="rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Monitoramento</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status">
                    <Select value={form.status_monitoramento} onValueChange={(v) => setForm({ ...form, status_monitoramento: v })} disabled={monitDisabled}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(statusOptions.length > 0
                          ? statusOptions.map((s) => ({ value: s.codigo, label: s.descricao }))
                          : Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))
                        ).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tipo de Monitoramento">
                    <Select value={form.monitoramento_tipo ?? ""} onValueChange={(v) => setForm({ ...form, monitoramento_tipo: v })} disabled={monitDisabled}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processual">Processual</SelectItem>
                        <SelectItem value="extraprocessual">Extraprocessual (sem processo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Início do Monitoramento">
                    <Input type="date" value={form.monitoramento_inicio ?? ""} onChange={(e) => setForm({ ...form, monitoramento_inicio: e.target.value })} disabled={monitDisabled} />
                  </Field>
                  <Field label="Fim Previsto do Monitoramento">
                    <Input type="date" value={form.monitoramento_fim ?? ""} onChange={(e) => setForm({ ...form, monitoramento_fim: e.target.value })} disabled={monitDisabled} />
                  </Field>
                  {form.monitoramento_tipo === "processual" && (
                    <>
                      <Field label="Processo do Monitoramento">
                        <Select
                          value={form.monitoramento_processo_origem === true ? "origem" : form.monitoramento_processo_origem === false ? "outro" : ""}
                          onValueChange={(v) => setForm({ ...form, monitoramento_processo_origem: v === "origem" })}
                          disabled={monitDisabled}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="origem">No processo de origem ({numeroProcessoOrigem})</SelectItem>
                            <SelectItem value="outro">Em outro processo</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      {form.monitoramento_processo_origem === false && (
                        <Field label="Número do Outro Processo *">
                          <Input value={form.monitoramento_numero_processo ?? ""} onChange={(e) => setForm({ ...form, monitoramento_numero_processo: maskProcesso(e.target.value) })} placeholder="000000/0000" disabled={monitDisabled} />
                        </Field>
                      )}
                    </>
                  )}
                  <Field label="Data de Verificação">
                    <Input type="date" max={TODAY} value={form.data_verificacao ?? ""} onChange={(e) => setForm({ ...form, data_verificacao: e.target.value })} disabled={monitDisabled} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Resposta do Gestor">
                      <Textarea value={form.resposta_gestor ?? ""} onChange={(e) => setForm({ ...form, resposta_gestor: e.target.value })} rows={2} disabled={monitDisabled} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                  <Field label="Resultado do Monitoramento">
                    <SelectField
                      value={form.resultado_monitoramento_id ?? null}
                      onChange={(v) => setForm({ ...form, resultado_monitoramento_id: v })}
                      options={resultadosMon.map((r) => ({ value: r.id, label: r.descricao }))}
                      disabled={monitDisabled}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Detalhamento do Resultado (opcional)">
                      <Textarea value={form.resultado_monitoramento ?? ""} onChange={(e) => setForm({ ...form, resultado_monitoramento: e.target.value })} rows={2} disabled={monitDisabled} />
                    </Field>
                  </div>
                  </div>
                  <div className="col-span-2">
                    <Field label="Evidências">
                      <div className="space-y-2">
                        <Input type="file" multiple disabled={uploading || monitDisabled} onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }} />
                        {(form.anexos ?? []).length > 0 && (
                          <ul className="text-xs space-y-1">
                            {(form.anexos ?? []).map((a: any) => (
                              <li key={a.path} className="flex items-center justify-between bg-background border border-border rounded px-2 py-1">
                                <button type="button" className="truncate text-left hover:underline flex-1" onClick={() => downloadAnexo(a.path)}>{a.nome}</button>
                                {!monitDisabled && (
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAnexo(a.path)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit}>{editing ? "Salvar" : "Adicionar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {deliberacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma deliberação cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada</TableHead>
                <TableHead className="w-[90px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliberacoes.map((d) => {
                const prazo = computePrazo(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge style={{ backgroundColor: (d.tipos_deliberacao as any)?.cor, color: "white" }}>
                        {(d.tipos_deliberacao as any)?.descricao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-md truncate">{d.descricao ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span className={
                        prazo.tone === "danger" ? "text-destructive font-medium" :
                        prazo.tone === "warn" ? "text-amber-600 font-medium" :
                        prazo.tone === "ok" ? "text-emerald-600" :
                        "text-muted-foreground"
                      }>
                        {prazo.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status_monitoramento === "cumprida" ? "default" : d.status_monitoramento === "descumprida" || d.status_monitoramento === "vencida" ? "destructive" : "secondary"}>
                        {STATUS_LABELS[d.status_monitoramento] ?? d.status_monitoramento}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(d.criado_em?.slice(0, 10))}</TableCell>
                    <TableCell>
                      {(() => {
                        const canEditRow = canEdit || (canEditMonitoramento && d.unidade_tecnica_id && d.unidade_tecnica_id === userUnidadeTecnicaId);
                        const canDeleteRow = canEdit; /* RLS permite apenas admin de fato */
                        if (!canEditRow) return null;
                        return (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDeleteRow && (
                              <Button variant="ghost" size="icon" onClick={() => remove(d.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CpfCnpjLookup({ value, onChange, onMatch, disabled, currentRegistroId }: { value: string; onChange: (v: string) => void; onMatch: (nome: string | null) => void; disabled?: boolean; currentRegistroId: string | null }) {
  const [hint, setHint] = useState<string | null>(null);
  const digits = value.replace(/\D/g, "");

  useEffect(() => {
    setHint(null);
    if (digits.length !== 11 && digits.length !== 14) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      let q = supabase
        .from("registros_decisao")
        .select("id, gestor_responsavel, numero_processo")
        .eq("cpf_cnpj", value)
        .order("criado_em", { ascending: false })
        .limit(1);
      if (currentRegistroId) q = q.neq("id", currentRegistroId);
      const { data } = await q;
      if (cancelled) return;
      if (data && data.length > 0) {
        const r = data[0];
        onMatch(r.gestor_responsavel ?? null);
        setHint(`Cadastrado: ${r.gestor_responsavel ?? "(sem nome)"} — proc. ${r.numero_processo}`);
      } else {
        setHint("Novo CPF/CNPJ — será cadastrado.");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, currentRegistroId]);

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(maskCpfCnpj(e.target.value))}
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
        disabled={disabled}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RegistroAnexos({ registroId, canEdit }: { registroId: string; canEdit: boolean }) {
  const [anexos, setAnexos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("registros_decisao").select("anexos").eq("id", registroId).single();
      setAnexos(((data as any)?.anexos as any[]) ?? []);
      setLoading(false);
    })();
  }, [registroId]);

  const persist = async (next: any[]) => {
    setAnexos(next);
    const { error } = await (supabase as any).from("registros_decisao").update({ anexos: next }).eq("id", registroId);
    if (error) toast.error(error.message);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const next = [...anexos];
      for (const file of Array.from(files)) {
        const path = `registros/${registroId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("deliberacao-anexos").upload(path, file);
        if (error) { toast.error(`Falha ao enviar ${file.name}: ${error.message}`); continue; }
        next.push({ path, nome: file.name, tamanho: file.size, criado_em: new Date().toISOString() });
      }
      await persist(next);
      toast.success("Arquivo(s) anexado(s).");
    } finally { setUploading(false); }
  };

  const remove = async (path: string) => {
    await supabase.storage.from("deliberacao-anexos").remove([path]);
    await persist(anexos.filter((a) => a.path !== path));
  };

  const download = async (path: string) => {
    const { data } = await supabase.storage.from("deliberacao-anexos").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">5. Anexos do Registro (acórdão, decisão etc.)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {canEdit && (
          <Input type="file" multiple disabled={uploading} onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }} />
        )}
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : anexos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum anexo.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {anexos.map((a) => (
              <li key={a.path} className="flex items-center justify-between bg-background border border-border rounded px-2 py-1.5">
                <button type="button" className="truncate text-left hover:underline flex-1" onClick={() => download(a.path)}>{a.nome}</button>
                {canEdit && (
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(a.path)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
