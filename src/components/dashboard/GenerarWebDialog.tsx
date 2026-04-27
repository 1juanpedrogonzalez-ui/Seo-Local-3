import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save, Sparkles, Download, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { BusinessWithScore } from "@/hooks/useBusinesses";

interface Props {
  business?: BusinessWithScore;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const GenerarWebDialog = ({ business, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [html, setHtml] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (open && business) generate();
    if (!open) {
      setHtml("");
      setRecordId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, business?.id]);

  const generate = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generar-web", {
        body: {
          negocio: {
            nombre: business.name,
            categoria: business.category,
            direccion: business.address,
            telefono: business.phone,
            email: business.email,
            ciudad: business.city,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setHtml((data as any).html ?? "");
    } catch (e: any) {
      toast({ title: "Error generando web", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!business || !user) return;
    setSaving(true);
    let error;
    if (recordId) {
      ({ error } = await supabase
        .from("web_generada")
        .update({ contenido: html, estado: "preview" })
        .eq("id", recordId));
    } else {
      const res = await supabase
        .from("web_generada")
        .insert({
          negocio_id: business.id,
          user_id: user.id,
          contenido: html,
          estado: "preview",
        })
        .select("id")
        .single();
      error = res.error;
      if (res.data) setRecordId(res.data.id);
    }
    setSaving(false);
    if (error) {
      toast({ title: "Error guardando", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Web guardada", description: "Borrador guardado correctamente." });
    onOpenChange(false);
  };

  const publish = async () => {
    if (!business || !user) return;
    setPublishing(true);
    let error;
    let id = recordId;
    if (!id) {
      // Buscar el registro más reciente para este negocio
      const { data: existing } = await supabase
        .from("web_generada")
        .select("id")
        .eq("negocio_id", business.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      id = existing?.id ?? null;
    }
    if (id) {
      ({ error } = await supabase
        .from("web_generada")
        .update({ contenido: html, estado: "publicada" })
        .eq("id", id));
      if (!error) setRecordId(id);
    } else {
      const res = await supabase
        .from("web_generada")
        .insert({
          negocio_id: business.id,
          user_id: user.id,
          contenido: html,
          estado: "publicada",
        })
        .select("id")
        .single();
      error = res.error;
      if (res.data) setRecordId(res.data.id);
    }
    setPublishing(false);
    if (error) {
      toast({ title: "Error publicando", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Web publicada", description: "Marcada como publicada correctamente." });
    onOpenChange(false);
  };

  const download = () => {
    if (!html || !business) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.download = `${safe || "web"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generar web — {business?.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Generando con IA...
          </div>
        ) : (
          <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="codigo">Código (editable)</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="flex-1 mt-3 min-h-0">
              <iframe
                title="preview"
                srcDoc={html}
                className="w-full h-full rounded-lg border border-border bg-white"
              />
            </TabsContent>
            <TabsContent value="codigo" className="flex-1 mt-3 min-h-0">
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full h-full font-mono text-xs resize-none"
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={generate} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" /> Regenerar
          </Button>
          <Button variant="outline" onClick={download} disabled={!html || loading}>
            <Download className="h-4 w-4 mr-2" /> Descargar HTML
          </Button>
          <Button variant="outline" onClick={save} disabled={saving || loading || !html}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar borrador
          </Button>
          <Button onClick={publish} disabled={publishing || loading || !html}>
            {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            Marcar como publicada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
