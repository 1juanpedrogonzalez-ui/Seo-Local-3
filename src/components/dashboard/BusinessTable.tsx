import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star, Flame } from "lucide-react";
import type { BusinessWithScore } from "@/hooks/useBusinesses";

interface Props {
  businesses: BusinessWithScore[];
  selectedId?: string;
  onSelect: (b: BusinessWithScore) => void;
}

const scoreColor = (label: BusinessWithScore["scoreLabel"]) => {
  if (label === "Caliente") return "bg-destructive/15 text-destructive border-destructive/40";
  if (label === "Templado") return "bg-warning/15 text-warning border-warning/40";
  return "bg-muted text-muted-foreground border-border";
};

export const BusinessTable = ({ businesses, selectedId, onSelect }: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Nombre</th>
              <th className="text-left font-medium px-4 py-3">Categoría</th>
              <th className="text-left font-medium px-4 py-3">Reseñas</th>
              <th className="text-left font-medium px-4 py-3">Tiene web</th>
              <th className="text-left font-medium px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr
                key={b.id}
                onClick={() => onSelect(b)}
                className={cn(
                  "border-t border-border cursor-pointer transition-colors",
                  selectedId === b.id
                    ? "bg-primary/5"
                    : b.scoreLabel === "Caliente"
                    ? "bg-destructive/5 hover:bg-destructive/10"
                    : "hover:bg-muted/30"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {b.scoreLabel === "Caliente" && (
                      <Flame className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="font-medium text-foreground">{b.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{b.city} · {b.postalCode}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{b.category}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-medium">{b.rating}</span>
                    <span className="text-muted-foreground text-xs">({b.reviews})</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {b.hasWeb ? (
                    <Badge variant="outline" className="border-border text-muted-foreground">Sí</Badge>
                  ) : (
                    <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">No</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("font-mono gap-1", scoreColor(b.scoreLabel))}>
                    {b.score}
                    <span className="text-[10px] font-sans uppercase tracking-wide opacity-80">
                      {b.scoreLabel}
                    </span>
                  </Badge>
                </td>
              </tr>
            ))}
            {businesses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No se encontraron negocios para ese código postal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
