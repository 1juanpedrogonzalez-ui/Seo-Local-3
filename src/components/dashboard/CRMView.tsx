import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Inbox } from "lucide-react";
import { useCRM, type CRMEstado, type CRMItem } from "@/hooks/useCRM";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLUMNS: { id: CRMEstado; label: string; accent: string }[] = [
  { id: "no_contactado", label: "No contactado", accent: "text-muted-foreground" },
  { id: "contactado", label: "Contactado", accent: "text-warning" },
  { id: "cerrado", label: "Cerrado", accent: "text-success" },
];

const normalizeEstado = (e: string): CRMEstado => {
  if (e === "contactado") return "contactado";
  if (e === "cerrado" || e === "ganado") return "cerrado";
  return "no_contactado";
};

export const CRMView = () => {
  const { items, loading, updateEstado } = useCRM();

  const grouped = useMemo(() => {
    const g: Record<CRMEstado, CRMItem[]> = {
      no_contactado: [],
      contactado: [],
      cerrado: [],
    };
    for (const it of items) g[normalizeEstado(it.estado)].push(it);
    return g;
  }, [items]);

  const handleMove = async (id: string, to: CRMEstado) => {
    try {
      await updateEstado(id, to);
      toast.success("Estado actualizado");
    } catch (e: any) {
      toast.error(`Error: ${e.message ?? e}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando CRM…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-muted grid place-items-center mb-3">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Tu CRM está vacío</p>
        <p className="text-xs text-muted-foreground mt-1">
          Genera un email desde un negocio en "Explorar" para empezar a llevar el seguimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div key={col.id} className="rounded-xl border border-border bg-card flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", col.id === "no_contactado" ? "bg-muted-foreground" : col.id === "contactado" ? "bg-warning" : "bg-success")} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
            </div>
            <Badge variant="outline" className="font-mono text-xs">{grouped[col.id].length}</Badge>
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {grouped[col.id].length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Vacío</p>
            )}
            {grouped[col.id].map((it) => (
              <div key={it.id} className="rounded-lg border border-border bg-background p-3 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{it.negocio_nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {it.negocio_categoria} · {it.municipio}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Mail className="h-3 w-3" /> {it.canal}
                  </Badge>
                </div>
                <p className="text-xs mt-2 line-clamp-2 text-muted-foreground">{it.asunto}</p>
                <div className="flex gap-1 mt-3">
                  {COLUMNS.filter((c) => c.id !== col.id).map((c) => (
                    <Button
                      key={c.id}
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] flex-1"
                      onClick={() => handleMove(it.id, c.id)}
                    >
                      → {c.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
