import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type SidebarView } from "@/components/dashboard/Sidebar";
import { BusinessTable } from "@/components/dashboard/BusinessTable";
import { BusinessDetail } from "@/components/dashboard/BusinessDetail";
import { GenerarWebDialog } from "@/components/dashboard/GenerarWebDialog";
import { GenerarEmailDialog } from "@/components/dashboard/GenerarEmailDialog";
import { MapPlaceholder } from "@/components/dashboard/MapPlaceholder";
import { CRMView } from "@/components/dashboard/CRMView";
import { WebsCreadasView } from "@/components/dashboard/WebsCreadasView";
import { ColaLeadsView } from "@/components/dashboard/ColaLeadsView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Bell, SlidersHorizontal, Loader2, Download, Flame, Thermometer, Snowflake, Building2 } from "lucide-react";

type Provincia = "todas" | "alicante" | "valencia";
const PROVINCIA_PREFIX: Record<Exclude<Provincia, "todas">, string> = {
  alicante: "03",
  valencia: "46",
};
import { useBusinesses, type BusinessWithScore } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VIEW_TITLES: Record<SidebarView, string> = {
  explorar: "Explorar negocios",
  estadisticas: "Estadísticas",
  "negocios-web": "Negocios con web",
  cp: "Búsqueda por CP",
  cola: "Cola de leads",
  crm: "CRM",
  webs: "Webs creadas",
};

const Index = () => {
  const [view, setView] = useState<SidebarView>("explorar");
  const [postal, setPostal] = useState("");
  const [provincia, setProvincia] = useState<Provincia>("todas");

  useEffect(() => {
    console.log("postal:", postal);
  }, [postal]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BusinessWithScore | undefined>();
  const [webOpen, setWebOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingValencia, setImportingValencia] = useState(false);
  const [valenciaProgress, setValenciaProgress] = useState<{done:number; total:number} | null>(null);
  const [lastImport, setLastImport] = useState<{ postal: string; total: number; nuevos: number; actualizados: number; municipio?: string } | null>(null);
  const autoImportedRef = useRef<Set<string>>(new Set());
  const [municipio, setMunicipio] = useState<{ nombre: string; provincia: string | null; codigo_postal: string } | null>(null);
  const [municipioLoading, setMunicipioLoading] = useState(false);
  const [municipioError, setMunicipioError] = useState<string | null>(null);

  const { data, loading, refetch } = useBusinesses(postal);

  const handlePostalChange = (value: string) => {
    const nextPostal = value.replace(/\D/g, "").slice(0, 5);
    setPostal(nextPostal);
  };

  const handleImportar = async () => {
    console.log("[DEBUG] handleImportar ejecutado, postal=", postal);
    if (!postal || postal.length < 4) {
      toast.error("Introduce un código postal válido");
      return;
    }
    setImporting(true);
    try {
      console.log("[importar-negocios] Llamando a importación... postal=", postal);
      const { data: res, error } = await supabase.functions.invoke("importar-negocios", {
        body: { postal },
      });
      console.log("[importar-negocios] Respuesta:", { res, error });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      toast.success(
        `Importados ${res.total} negocios de ${res.municipio} (${res.nuevos} nuevos, ${res.actualizados} actualizados)`
      );
      setLastImport({
        postal,
        total: res.total ?? 0,
        nuevos: res.nuevos ?? 0,
        actualizados: res.actualizados ?? 0,
        municipio: res.municipio,
      });
      await refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(`Error importando: ${e.message ?? e}`);
    } finally {
      setImporting(false);
    }
  };

  // DEBUG: forzar importación cada vez que el CP llega a 5 dígitos
  useEffect(() => {
    if (postal.length !== 5) {
      setMunicipio(null);
      setMunicipioError(null);
      return;
    }
    let cancelled = false;
    setMunicipioLoading(true);
    setMunicipioError(null);
    console.log("[municipios] buscando CP:", postal);
    supabase
      .from("municipios")
      .select("nombre, provincia, codigo_postal")
      .eq("codigo_postal", postal)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        console.log("[municipios] respuesta:", { data, error });
        if (error) {
          setMunicipioError(error.message);
          setMunicipio(null);
        } else if (!data) {
          setMunicipioError("No se encontró ningún municipio para este CP");
          setMunicipio(null);
        } else {
          setMunicipio(data as any);
        }
        setMunicipioLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postal]);

  // Auto-importar UNA sola vez por CP cuando: hay municipio válido, no carga,
  // y no hay negocios todavía. Evita loops infinitos con autoImportedRef.
  useEffect(() => {
    if (postal.length !== 5) return;
    if (!municipio) return;
    if (loading || importing) return;
    if (data.length > 0) return;
    if (autoImportedRef.current.has(postal)) return;
    autoImportedRef.current.add(postal);
    console.log("[auto-import] CP sin negocios → invocando importar-negocios", postal);
    handleImportar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postal, municipio, loading, importing, data.length]);

  const handleImportarValencia = async () => {
    if (!confirm("Vas a importar todos los municipios de la provincia de Valencia (~263). Esto puede tardar varios minutos y consumirá cuota de Google Places y Firecrawl. ¿Continuar?")) return;
    setImportingValencia(true);
    setValenciaProgress({ done: 0, total: 263 });
    let offset = 0;
    let totalNuevos = 0, totalActualizados = 0;
    try {
      while (true) {
        const { data: res, error } = await supabase.functions.invoke("importar-valencia", {
          body: { offset, batchSize: 3, includePA: true },
        });
        if (error) throw error;
        if (res?.error) throw new Error(res.error);
        totalNuevos += res.totalNuevos ?? 0;
        totalActualizados += res.totalActualizados ?? 0;
        offset = res.nextOffset;
        setValenciaProgress({ done: offset, total: res.totalMunicipios });
        if (res.done) break;
      }
      toast.success(`Valencia importada: ${totalNuevos} nuevos, ${totalActualizados} actualizados.`);
      await refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(`Error en importación Valencia: ${e.message ?? e}`);
    } finally {
      setImportingValencia(false);
    }
  };

  const filtered = useMemo(() => {
    let result = data;
    if (view === "negocios-web") {
      result = result.filter((b) => b.hasWeb);
    }
    if (provincia !== "todas") {
      const prefix = PROVINCIA_PREFIX[provincia];
      result = result.filter((b) => b.postalCode.startsWith(prefix));
    }
    if (query) {
      result = result.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
    }
    return result;
  }, [data, query, provincia, view]);

  // Auto-select first if none
  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelected(filtered[0]);
    }
  }, [filtered, selected]);

  const showExploreLayout = view === "explorar" || view === "negocios-web" || view === "cp";
  const calientes = filtered.filter((b) => b.scoreLabel === "Caliente").length;
  const templados = filtered.filter((b) => b.scoreLabel === "Templado").length;
  const frios = filtered.filter((b) => b.scoreLabel === "Frío").length;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar active={view} onChange={(v) => { setView(v); setSelected(undefined); }} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center px-6 gap-4">
          <h1 className="text-base font-semibold">{VIEW_TITLES[view]}</h1>
          <div className="ml-auto flex items-center gap-2">
            {showExploreLayout && (
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar negocio..."
                  className="pl-9 w-64 bg-muted/40 border-border"
                />
              </div>
            )}
            <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
            <div className="h-8 w-8 rounded-full bg-primary/20 grid place-items-center text-xs font-semibold text-primary">
              U
            </div>
          </div>
        </header>

        {showExploreLayout ? (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            <main className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Código postal</label>
                    <div className="relative mt-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="postal"
                        name="postal"
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        spellCheck={false}
                        value={postal ?? ""}
                        onChange={(e) => handlePostalChange(e.target.value)}
                        placeholder="Ej: 28013"
                        aria-label="Código postal"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground caret-primary placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                    </div>
                  </div>
                  <div className="md:w-48">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Provincia</label>
                    <Select value={provincia} onValueChange={(v) => setProvincia(v as Provincia)}>
                      <SelectTrigger className="mt-2 bg-background border-border">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        <SelectItem value="alicante">Alicante (03)</SelectItem>
                        <SelectItem value="valencia">Valencia (46)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="gap-2">
                    <Search className="h-4 w-4" />
                    Buscar
                  </Button>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={handleImportar}
                    disabled={importing}
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Importar de Google
                  </Button>
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={handleImportarValencia}
                    disabled={importingValencia}
                    title="Importa todos los municipios de la provincia de Valencia"
                  >
                    {importingValencia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {importingValencia && valenciaProgress
                      ? `Valencia ${valenciaProgress.done}/${valenciaProgress.total}`
                      : "Importar toda Valencia"}
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtros
                  </Button>
                </div>

                <Tabs defaultValue="todos" className="mt-5">
                  <TabsList>
                    <TabsTrigger value="todos">Todos</TabsTrigger>
                    <TabsTrigger value="sin-web">Sin web</TabsTrigger>
                    <TabsTrigger value="alto-score">Score alto</TabsTrigger>
                    <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
                  </TabsList>
                </Tabs>

                {lastImport && (
                  <div className="mt-4 rounded-md border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Última importación CP <span className="font-mono text-foreground">{lastImport.postal}</span>
                      {lastImport.municipio && <> · {lastImport.municipio}</>}
                    </span>
                    <span><span className="text-foreground font-semibold">{lastImport.total}</span> negocios cargados</span>
                    <span>{lastImport.nuevos} nuevos · {lastImport.actualizados} actualizados</span>
                  </div>
                )}

                {postal.length === 5 && (
                  <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
                    {municipioLoading && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando municipio...
                      </div>
                    )}
                    {!municipioLoading && municipio && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-semibold text-foreground">{municipio.nombre}</span>
                        {municipio.provincia && (
                          <span className="text-muted-foreground">{municipio.provincia}</span>
                        )}
                        <span className="font-mono text-xs text-muted-foreground">CP {municipio.codigo_postal}</span>
                      </div>
                    )}
                    {!municipioLoading && municipioError && (
                      <p className="text-xs text-destructive">{municipioError}</p>
                    )}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Stat label="Total" value={String(data.length)} icon={Building2} accent="text-primary" />
                <Stat label="Filtrados" value={String(filtered.length)} icon={SlidersHorizontal} accent="text-foreground" />
                <Stat label="Calientes" value={String(calientes)} icon={Flame} accent="text-destructive" />
                <Stat label="Templados" value={String(templados)} icon={Thermometer} accent="text-warning" />
                <Stat label="Fríos" value={String(frios)} icon={Snowflake} accent="text-muted-foreground" />
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1">
                  <MapPlaceholder businesses={filtered} selectedId={selected?.id} />
                </div>
                <div className="xl:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Resultados</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                      {filtered.length} negocios
                    </p>
                  </div>
                  {!loading && filtered.length === 0 && postal.length >= 4 && (
                    <div className="mb-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          No hay negocios cargados para el CP {postal}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pulsa para traerlos en directo desde Google Places. Solo se guardarán los que <strong>no tengan web</strong>.
                        </p>
                      </div>
                      <Button onClick={handleImportar} disabled={importing} className="gap-2">
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Importar negocios de {postal}
                      </Button>
                    </div>
                  )}
                  <BusinessTable
                    businesses={filtered}
                    selectedId={selected?.id}
                    onSelect={setSelected}
                  />
                </div>
              </section>
            </main>

            <BusinessDetail
              business={selected}
              onGenerarWeb={() => setWebOpen(true)}
              onGenerarEmail={() => setEmailOpen(true)}
            />
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-6">
            {view === "crm" && <CRMView />}
            {view === "webs" && <WebsCreadasView />}
            {view === "cola" && <ColaLeadsView />}
            {view === "estadisticas" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total negocios" value={String(data.length)} icon={Building2} accent="text-primary" />
                <Stat label="Con web" value={String(data.filter(b => b.hasWeb).length)} icon={Building2} accent="text-success" />
                <Stat label="Sin web" value={String(data.filter(b => !b.hasWeb).length)} icon={Building2} accent="text-warning" />
                <Stat label="Calientes" value={String(data.filter(b => b.scoreLabel === "Caliente").length)} icon={Flame} accent="text-destructive" />
              </div>
            )}
          </main>
        )}
      </div>

      <GenerarWebDialog business={selected} open={webOpen} onOpenChange={setWebOpen} />
      <GenerarEmailDialog business={selected} open={emailOpen} onOpenChange={setEmailOpen} />
    </div>
  );
};

const Stat = ({ label, value, accent, icon: Icon }: { label: string; value: string; accent?: string; icon?: any }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {Icon && <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />}
    </div>
    <p className={`text-2xl font-semibold mt-1 font-mono ${accent ?? ""}`}>{value}</p>
  </div>
);

export default Index;
