import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, RefreshCw, Mail, Phone, Inbox } from "lucide-react";
import { useColaLeads, type Prioridad } from "@/hooks/useColaLeads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const prioridadStyles: Record<Prioridad, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baja: "bg-muted text-muted-foreground border-border",
};

export const ColaLeadsView = () => {
  const { items, loading, enqueueAll, refetch } = useColaLeads();
  const [running, setRunning] = useState(false);

  const handleEnqueue = async () => {
    setRunning(true);
    try {
      const n = await enqueueAll();
      toast.success(n > 0 ? `${n} leads añadidos a la cola` : "No hay nuevos leads que cumplan los criterios");
    } catch (e: any) {
      toast.error(`Error: ${e.message ?? e}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" /> Cola de leads automática
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Se añaden automáticamente los negocios con <span className="font-mono text-foreground">score &gt; 70</span> y <span className="font-mono text-foreground">sin web</span>. Prioridad: ≥90 alta · ≥80 media · resto baja.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refrescar
          </Button>
          <Button size="sm" onClick={handleEnqueue} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flame className="h-4 w-4 mr-2" />}
            Encolar leads ahora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total cola" value={items.length} />
        <Stat label="Alta" value={items.filter(i => i.prioridad === "alta").length} accent="text-destructive" />
        <Stat label="Media" value={items.filter(i => i.prioridad === "media").length} accent="text-warning" />
        <Stat label="Baja" value={items.filter(i => i.prioridad === "baja").length} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando cola…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted grid place-items-center mb-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">La cola está vacía</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pulsa "Encolar leads ahora" para procesar los negocios actuales con score &gt; 70 y sin web.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Prioridad</th>
                <th className="text-left font-medium px-4 py-2">Negocio</th>
                <th className="text-left font-medium px-4 py-2 hidden md:table-cell">Categoría</th>
                <th className="text-left font-medium px-4 py-2 hidden lg:table-cell">Municipio</th>
                <th className="text-right font-medium px-4 py-2">Score</th>
                <th className="text-left font-medium px-4 py-2 hidden md:table-cell">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={cn("uppercase text-[10px] tracking-wider", prioridadStyles[(it.prioridad as Prioridad)] ?? prioridadStyles.media)}>
                      {it.prioridad}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 font-medium">{it.negocio_nombre}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{it.negocio_categoria}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">{it.municipio}</td>
                  <td className="px-4 py-2 text-right font-mono">{it.score}</td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {it.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{it.telefono}</span>}
                      {it.email && <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail className="h-3 w-3" />{it.email}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number; accent?: string }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn("text-xl font-semibold font-mono mt-1", accent)}>{value}</p>
  </div>
);