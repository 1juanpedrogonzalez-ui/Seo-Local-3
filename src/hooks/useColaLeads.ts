import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Prioridad = "alta" | "media" | "baja";

export type ColaLead = {
  id: string;
  negocio_id: string;
  estado: string;
  prioridad: Prioridad | string;
  created_at: string;
  negocio_nombre: string;
  negocio_categoria: string;
  municipio: string;
  telefono: string;
  email: string;
  score: number;
};

export const useColaLeads = () => {
  const [items, setItems] = useState<ColaLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm")
      .select(`
        id, negocio_id, estado, prioridad, created_at,
        negocios:negocio_id (
          nombre, categoria, telefono, email, tiene_web,
          municipios:municipio_id ( nombre ),
          score ( score_total )
        )
      `)
      .eq("estado", "no_contactado")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetch cola", error);
      setLoading(false);
      return;
    }

    const mapped: ColaLead[] = (data ?? []).map((r: any) => ({
      id: r.id,
      negocio_id: r.negocio_id,
      estado: r.estado,
      prioridad: r.prioridad ?? "media",
      created_at: r.created_at,
      negocio_nombre: r.negocios?.nombre ?? "—",
      negocio_categoria: r.negocios?.categoria ?? "—",
      municipio: r.negocios?.municipios?.nombre ?? "—",
      telefono: r.negocios?.telefono ?? "",
      email: r.negocios?.email ?? "",
      score: r.negocios?.score?.score_total ?? 0,
    }));

    const order: Record<string, number> = { alta: 0, media: 1, baja: 2 };
    mapped.sort((a, b) => (order[a.prioridad] ?? 9) - (order[b.prioridad] ?? 9) || b.score - a.score);

    setItems(mapped);
    setLoading(false);
  }, []);

  const enqueueAll = useCallback(async () => {
    const { data, error } = await supabase.rpc("enqueue_high_potential_leads" as any);
    if (error) throw error;
    await fetchAll();
    return (data as number) ?? 0;
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { items, loading, refetch: fetchAll, enqueueAll };
};