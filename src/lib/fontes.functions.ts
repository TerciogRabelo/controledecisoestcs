import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  fonteId: z.string().uuid(),
  query: z.string().max(200).optional(),
});

function getByPath(obj: any, path: string | null | undefined): any {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

export const fetchFonteExterna = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: fonte, error } = await supabase
      .from("fontes_dados")
      .select("*")
      .eq("id", data.fonteId)
      .eq("ativo", true)
      .single();
    if (error || !fonte) return { items: [] as { value: string; label: string }[], error: "Fonte não encontrada." };

    let url = fonte.url;
    if (data.query) {
      url = url.replace(/\{query\}/g, encodeURIComponent(data.query));
    }

    try {
      const headers: Record<string, string> = { Accept: "application/json", ...(fonte.headers as Record<string, string>) };
      const res = await fetch(url, { headers });
      if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
      const json = await res.json();
      const list = getByPath(json, fonte.caminho_lista);
      const arr = Array.isArray(list) ? list : Array.isArray(json) ? json : [];
      const items = arr.slice(0, 100).map((row: any) => ({
        value: String(getByPath(row, fonte.campo_valor) ?? ""),
        label: String(getByPath(row, fonte.campo_label) ?? ""),
      })).filter((i) => i.value && i.label);
      return { items, error: null };
    } catch (e) {
      return { items: [], error: (e as Error).message };
    }
  });
