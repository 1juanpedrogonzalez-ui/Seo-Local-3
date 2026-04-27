import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Business } from "@/data/businesses";

export type ScoreLabel = "Caliente" | "Templado" | "Frío";

export type BusinessWithScore = Business & {
  scoreLabel: ScoreLabel;
};

export const useBusinesses = (postal: string) => {
  const [data, setData] = useState<BusinessWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    console.log("[useBusinesses] postal recibido:", postal);

    // Si hay CP: primero buscamos los municipios que matchean (prefix) y
    // filtramos negocios por esos municipio_id en el servidor.
    let municipioIds: string[] | null = null;
    let fallback = false;
    if (postal && postal.length >= 2) {
      const { data: munis, error: muniErr } = await supabase
        .from("municipios")
        .select("id, codigo_postal, nombre")
        .like("codigo_postal", `${postal}%`);
      if (muniErr) {
        console.error("[useBusinesses] error municipios:", muniErr);
        setLoading(false);
        return;
      }
      console.log("[useBusinesses] municipios encontrados:", munis?.length ?? 0, munis?.slice(0, 5));
      municipioIds = (munis ?? []).map((m: any) => m.id);
      if (municipioIds.length === 0) {
        console.warn("[useBusinesses] sin municipios para CP", postal, "→ fallback a 50 negocios sin filtro");
        fallback = true;
        municipioIds = null;
      }
    }

    let query = supabase
      .from("negocios")
      .select(`
        id, nombre, categoria, direccion, telefono, email, url_web,
        numero_resenas, rating, tiene_web,
        municipios:municipio_id ( nombre, codigo_postal ),
        score ( score_total, etiqueta )
      `)
      .order("nombre")
      .limit(1000);

    if (municipioIds) {
      query = query.in("municipio_id", municipioIds);
    }
    if (fallback) {
      query = supabase
        .from("negocios")
        .select(`
          id, nombre, categoria, direccion, telefono, email, url_web,
          numero_resenas, rating, tiene_web,
          municipios:municipio_id ( nombre, codigo_postal ),
          score ( score_total, etiqueta )
        `)
        .order("nombre")
        .limit(50);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[useBusinesses] error negocios:", error);
      setLoading(false);
      return;
    }
    console.log("[useBusinesses] negocios recibidos:", rows?.length ?? 0);

    const mapped: BusinessWithScore[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.nombre ?? "Sin nombre",
      category: r.categoria ?? "—",
      reviews: r.numero_resenas ?? 0,
      rating: Number(r.rating ?? 0),
      hasWeb: Boolean(r.tiene_web),
      score: r.score?.score_total ?? 0,
      scoreLabel: (r.score?.etiqueta ?? "Frío") as ScoreLabel,
      postalCode: r.municipios?.codigo_postal ?? "",
      city: r.municipios?.nombre ?? "",
      phone: r.telefono ?? "",
      address: r.direccion ?? "",
      email: r.email ?? "",
      website: r.url_web ?? undefined,
    }));

    // Ordenar por score descendente (mayor potencial primero)
    mapped.sort((a, b) => b.score - a.score);

    setData(mapped);
    setLoading(false);
  }, [postal]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, refetch: fetchAll };
};
