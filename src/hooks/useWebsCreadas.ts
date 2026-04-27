import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WebItem = {
  id: string;
  negocio_id: string;
  estado: string;
  url_publicacion: string | null;
  created_at: string;
  html: string;
  negocio_nombre: string;
  negocio_categoria: string;
  municipio: string;
};

export const useWebsCreadas = () => {
  const [items, setItems] = useState<WebItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("web_generada")
      .select(`
        id, negocio_id, estado, url_publicacion, created_at, contenido,
        negocios:negocio_id ( nombre, categoria, municipios:municipio_id ( nombre ) )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetch webs", error);
      setLoading(false);
      return;
    }

    setItems(
      (data ?? []).map((r: any) => ({
        id: r.id,
        negocio_id: r.negocio_id,
        estado: r.estado,
        url_publicacion: r.url_publicacion ?? null,
        created_at: r.created_at,
        html: r.contenido,
        negocio_nombre: r.negocios?.nombre ?? "—",
        negocio_categoria: r.negocios?.categoria ?? "—",
        municipio: r.negocios?.municipios?.nombre ?? "—",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, loading, refetch: fetchAll };
};
