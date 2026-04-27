import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Globe, Eye, Code2 } from "lucide-react";
import { useWebsCreadas, type WebItem } from "@/hooks/useWebsCreadas";

const estadoColor = (estado: string) => {
  if (estado === "publicada") return "bg-success/15 text-success border-success/30";
  if (estado === "revisada") return "bg-primary/15 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

export const WebsCreadasView = () => {
  const { items, loading } = useWebsCreadas();
  const [preview, setPreview] = useState<WebItem | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando webs…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-muted grid place-items-center mb-3">
          <Globe className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Aún no has generado ninguna web</p>
        <p className="text-xs text-muted-foreground mt-1">
          Selecciona un negocio en "Explorar" y pulsa "Generar web".
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((w) => (
          <div key={w.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="h-40 bg-muted/40 relative overflow-hidden border-b border-border">
              <iframe
                title={w.negocio_nombre}
                srcDoc={w.html}
                className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                sandbox=""
              />
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className={estadoColor(w.estado)}>{w.estado}</Badge>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-sm font-semibold truncate">{w.negocio_nombre}</p>
              <p className="text-xs text-muted-foreground truncate">
                {w.negocio_categoria} · {w.municipio}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{w.estado}</Badge>
                {w.url_publicacion && <span className="truncate">· publicada</span>}
                <span className="ml-auto">{new Date(w.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" className="flex-1 gap-1" onClick={() => setPreview(w)}>
                  <Eye className="h-3.5 w-3.5" /> Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    const blob = new Blob([w.html], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                  }}
                >
                  <Code2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle>{preview?.negocio_nombre}</DialogTitle>
          </DialogHeader>
          {preview && (
            <iframe
              title="preview"
              srcDoc={preview.html}
              className="w-full h-full"
              sandbox="allow-same-origin"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
