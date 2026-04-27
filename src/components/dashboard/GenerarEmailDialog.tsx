import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Sparkles, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { BusinessWithScore } from "@/hooks/useBusinesses";

interface Props {
  business?: BusinessWithScore;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const GenerarEmailDialog = ({ business, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [linkPreview, setLinkPreview] = useState("");
  const [hasWeb, setHasWeb] = useState<boolean | null>(null);

  useEffect(() => {
    if (open && business) {
      setDestinatario(business.email ?? "");
      fetchLinkAndGenerate();
    }
    if (!open) { setAsunto(""); setCuerpo(""); setDestinatario(""); setLinkPreview(""); setHasWeb(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, business?.id]);

  const fetchLinkAndGenerate = async () => {
    if (!business) return;
    // Buscar la última web generada para insertar como preview link
    const { data: web } = await supabase
      .from("web_generada")
      .select("id, url_publicacion")
      .eq("negocio_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!web) {
      setHasWeb(false);
      setLinkPreview("");
      setAsunto("");
      setCuerpo("");
      return;
    }
    setHasWeb(true);
    const link = web.url_publicacion ?? `${window.location.origin}/web/${web.id}`;
    setLinkPreview(link);
    await generate(link);
  };

  const generate = async (link?: string) => {
    if (!business) return;
    const useLink = link ?? linkPreview;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generar-email", {
        body: {
          negocio: {
            nombre: business.name,
            categoria: business.category,
            ciudad: business.city,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const rawCuerpo: string = (data as any).cuerpo ?? "";
      setAsunto((data as any).asunto ?? "Hemos creado una web GRATIS para tu negocio");
      setCuerpo(rawCuerpo.replace(/\[LINK_PREVIEW\]/g, useLink));
    } catch (e: any) {
      toast({ title: "Error generando email", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveContacto = async (estado: "pendiente" | "enviado") => {
    if (!business || !user) return;
    const { error } = await supabase.from("contactos").insert({
      negocio_id: business.id,
      user_id: user.id,
      asunto,
      cuerpo,
      canal: "email",
      estado,
    });
    if (error) throw error;
  };

  const openMailto = async () => {
    if (!destinatario) {
      toast({ title: "Falta destinatario", description: "Introduce un email de destino.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await saveContacto("enviado");
      const url = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      window.location.href = url;
      toast({ title: "Abriendo cliente de correo", description: "Email registrado como enviado." });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyAndSave = async () => {
    setSending(true);
    try {
      await saveContacto("pendiente");
      await navigator.clipboard.writeText(`Asunto: ${asunto}\n\n${cuerpo}`);
      toast({ title: "Copiado al portapapeles", description: "Borrador guardado como pendiente." });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generar email — {business?.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Generando con IA...
          </div>
        ) : hasWeb === false ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
            <Mail className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Primero debes generar la web para este negocio</p>
            <p className="text-xs text-muted-foreground">El email necesita un link de preview válido.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Para</label>
              <Input
                type="email"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="email@negocio.com"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Link preview web</label>
              <Input
                value={linkPreview}
                onChange={(e) => setLinkPreview(e.target.value)}
                placeholder="https://..."
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Asunto</label>
              <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="mt-2" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Cuerpo</label>
              <Textarea
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                className="mt-2 min-h-[260px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => generate()} disabled={loading || hasWeb === false}>
            <Sparkles className="h-4 w-4 mr-2" /> Regenerar
          </Button>
          <Button variant="outline" onClick={copyAndSave} disabled={sending || loading || !asunto || !cuerpo || hasWeb === false}>
            <Copy className="h-4 w-4 mr-2" /> Copiar
          </Button>
          <Button onClick={openMailto} disabled={sending || loading || !asunto || !cuerpo || hasWeb === false}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Abrir en cliente correo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
