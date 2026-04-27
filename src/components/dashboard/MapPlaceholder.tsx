import { MapPin } from "lucide-react";
import type { BusinessWithScore } from "@/hooks/useBusinesses";

interface Props {
  businesses: BusinessWithScore[];
  selectedId?: string;
}

export const MapPlaceholder = ({ businesses, selectedId }: Props) => {
  // Genera puntos pseudo-aleatorios deterministas por id
  const points = businesses.slice(0, 60).map((b) => {
    const seed = Array.from(b.id).reduce((a, c) => a + c.charCodeAt(0), 0);
    const x = (seed * 9301 + 49297) % 100;
    const y = (seed * 4831 + 12345) % 100;
    return { id: b.id, x, y, hot: b.scoreLabel === "Caliente", warm: b.scoreLabel === "Templado" };
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Mapa de leads</h3>
        </div>
        <p className="text-xs text-muted-foreground">{businesses.length} puntos</p>
      </div>
      <div
        className="relative h-[320px] w-full"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          backgroundColor: "hsl(var(--muted) / 0.3)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        {points.map((p) => (
          <span
            key={p.id}
            className={[
              "absolute h-2.5 w-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ring-2 ring-background transition-all",
              p.id === selectedId
                ? "bg-primary scale-150 z-10 shadow-lg shadow-primary/50"
                : p.hot
                ? "bg-destructive"
                : p.warm
                ? "bg-warning"
                : "bg-muted-foreground/60",
            ].join(" ")}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}
        {businesses.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            Sin datos para mostrar en el mapa.
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Caliente</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Templado</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Frío</span>
      </div>
    </div>
  );
};
