
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
        const res = await fetchFn({ data: { fonteId: fonte.id, query: value } });
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
