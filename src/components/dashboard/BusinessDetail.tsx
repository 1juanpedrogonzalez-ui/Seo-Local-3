import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Globe, Mail, Phone, MapPin, Star, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessWithScore } from "@/hooks/useBusinesses";

interface Props {
  business?: BusinessWithScore;
  onGenerarWeb?: () => void;
  onGenerarEmail?: () => void;
}

const scoreRing = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

export const BusinessDetail = ({ business, onGenerarWeb, onGenerarEmail }: Props) => {
  if (!business) {
    return (
      <aside className="w-full lg:w-[380px] shrink-0 border-l border-border bg-card/40 p-6 flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-full bg-muted grid place-items-center mb-4">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Ningún negocio seleccionado</p>
        <p className="text-xs text-muted-foreground mt-1">Selecciona un negocio de la tabla para ver el detalle.</p>
      </aside>
    );
  }

  const ring = scoreRing(business.score);

  return (
    <aside className="w-full lg:w-[380px] shrink-0 border-l border-border bg-card/40 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{business.category}</p>
            <h2 className="text-lg font-semibold leading-snug mt-1">{business.name}</h2>
          </div>
          {business.hasWeb ? (
            <Badge variant="outline" className="border-border text-muted-foreground">Con web</Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">Sin web</Badge>
          )}
        </div>

        {/* Score destacado */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className={cn("relative h-20 w-20 rounded-full grid place-items-center", ring)}>
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                strokeWidth="3" strokeLinecap="round"
                className="stroke-current"
                strokeDasharray={`${business.score} 100`}
                pathLength={100}
              />
            </svg>
            <span className="text-xl font-bold font-mono">{business.score}</span>
          </div>
          <div>
            <p className="text-sm font-medium">Lead Score</p>
            <p className="text-xs text-muted-foreground mt-0.5">Potencial estimado de conversión.</p>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-xs font-medium">{business.rating}</span>
              <span className="text-xs text-muted-foreground">· {business.reviews} reseñas</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="contacto">Contacto</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-3">
            <DetailRow
              icon={MapPin}
              label="Dirección"
              value={[business.address, business.city].filter(Boolean).join(", ") || "Sin dirección"}
              muted={!business.address && !business.city}
            />
            <DetailRow
              icon={Building2}
              label="Código postal"
              value={business.postalCode || "—"}
              muted={!business.postalCode}
            />
            <DetailRow
              icon={Globe}
              label="Sitio web"
              value={business.website ?? "Sin sitio web"}
              muted={!business.website}
            />
          </TabsContent>

          <TabsContent value="contacto" className="mt-4 space-y-3">
            <DetailRow
              icon={Phone}
              label="Teléfono"
              value={business.phone || "Sin teléfono"}
              muted={!business.phone}
            />
            <DetailRow
              icon={Mail}
              label="Email"
              value={business.email || "Sin email"}
              muted={!business.email}
            />
          </TabsContent>

          <TabsContent value="notas" className="mt-4">
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Aún no hay notas para este negocio.
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        {/* Acciones */}
        <div className="space-y-2">
          <Button className="w-full justify-start gap-2" onClick={onGenerarWeb}>
            <Sparkles className="h-4 w-4" />
            Generar web
          </Button>
          <Button variant="secondary" className="w-full justify-start gap-2" onClick={onGenerarEmail}>
            <Mail className="h-4 w-4" />
            Generar email
          </Button>
        </div>
      </div>
    </aside>
  );
};

const DetailRow = ({
  icon: Icon, label, value, muted,
}: { icon: any; label: string; value: string; muted?: boolean }) => (
  <div className="flex items-start gap-3">
    <div className="h-8 w-8 rounded-md bg-muted grid place-items-center shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-sm truncate", muted && "text-muted-foreground italic")}>{value}</p>
    </div>
  </div>
);
