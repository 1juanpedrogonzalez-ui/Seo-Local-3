import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CRMEstado = "no_contactado" | "contactado" | "cerrado";

export type CRMItem = {
  id: string;
  negocio_id: string;
  asunto: string;
  estado: CRMEstado | string;
  canal: string;
  created_at: string;
  negocio_nombre: string;
  negocio_categoria: string;
  municipio: string;
};

export const useCRM = () => {
  const [items, setItems] = useState<CRMItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contactos")
      .select(`
        id, negocio_id, asunto, estado, canal, created_at,
        negocios:negocio_id ( nombre, categoria, municipios:municipio_id ( nombre ) )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetch contactos", error);
      setLoading(false);
      return;
    }

    setItems(
      (data ?? []).map((r: any) => ({
        id: r.id,
        negocio_id: r.negocio_id,
        asunto: r.asunto,
        estado: r.estado,
        canal: r.canal,
        created_at: r.created_at,
        negocio_nombre: r.negocios?.nombre ?? "—",
        negocio_categoria: r.negocios?.categoria ?? "—",
        municipio: r.negocios?.municipios?.nombre ?? "—",
      }))
    );
    setLoading(false);
  }, []);

  const updateEstado = useCallback(async (id: string, estado: CRMEstado) => {
    const { error } = await supabase.from("contactos").update({ estado }).eq("id", id);
    if (error) throw error;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado } : i)));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, loading, refetch: fetchAll, updateEstado };
};
