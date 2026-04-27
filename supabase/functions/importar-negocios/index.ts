// Edge function: importar negocios reales desde Google Places API (New)
// alrededor de un código postal español. Hace upsert por (nombre, municipio_id)
// y recalcula el score automáticamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Heurística de "tipo de negocio" → puntuación scoring ---
const HIGH_VALUE = [
  "dentist", "lawyer", "doctor", "real_estate_agency", "insurance_agency",
  "plumber", "electrician", "physiotherapist", "veterinary_care", "car_repair",
  "car_dealer", "moving_company", "locksmith", "roofing_contractor",
];
const MID_VALUE = [
  "restaurant", "beauty_salon", "hair_care", "gym", "spa", "cafe", "bakery",
  "florist", "pet_store", "school", "travel_agency",
];

const tipoScore = (types: string[] = []) => {
  if (types.some((t) => HIGH_VALUE.includes(t))) return 20;
  if (types.some((t) => MID_VALUE.includes(t))) return 10;
  return 0;
};

const reviewsScore = (n: number) => (n <= 10 ? 25 : n <= 50 ? 15 : 5);
const ubicacionScore = (pob: number) =>
  pob > 50000 ? 15 : pob >= 10000 ? 10 : 5;

const etiquetaFor = (p: number) =>
  p >= 80 ? "Caliente" : p >= 60 ? "Templado" : "Frío";

// Categoría legible a partir de los types de Google
const categoriaFromTypes = (types: string[] = []) => {
  const map: Record<string, string> = {
    restaurant: "Restaurante", cafe: "Cafetería", bakery: "Panadería",
    bar: "Bar", beauty_salon: "Belleza", hair_care: "Peluquería",
    gym: "Deporte", spa: "Bienestar", florist: "Floristería",
    pet_store: "Mascotas", dentist: "Salud", doctor: "Salud",
    lawyer: "Servicios", real_estate_agency: "Inmobiliaria",
    insurance_agency: "Seguros", plumber: "Servicios",
    electrician: "Servicios", car_repair: "Mecánico",
    car_dealer: "Automoción", veterinary_care: "Veterinario",
    book_store: "Librería", clothing_store: "Moda", shoe_store: "Moda",
    supermarket: "Supermercado", pharmacy: "Farmacia",
    travel_agency: "Viajes", school: "Educación", hotel: "Hotel",
  };
  for (const t of types) if (map[t]) return map[t];
  return types[0]?.replace(/_/g, " ") ?? "Negocio";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postal } = await req.json();
    if (!postal || typeof postal !== "string" || postal.length < 4) {
      return new Response(
        JSON.stringify({ error: "Código postal inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY no configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Buscar en Google Places (Text Search New). El query "negocios en {CP} España"
    //    funciona bien para acotar por código postal.
    const fieldMask = [
      "places.id", "places.displayName", "places.formattedAddress",
      "places.nationalPhoneNumber", "places.internationalPhoneNumber",
      "places.websiteUri", "places.rating", "places.userRatingCount",
      "places.types", "places.primaryType", "places.addressComponents",
      "places.location",
    ].join(",");

    const allPlaces: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const body: Record<string, unknown> = {
        textQuery: `negocios en ${postal} España`,
        languageCode: "es",
        regionCode: "ES",
        pageSize: 20,
      };
      if (pageToken) body.pageToken = pageToken;

      const resp = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": pageToken
              ? `${fieldMask},nextPageToken`
              : `${fieldMask},nextPageToken`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Google Places error ${resp.status}: ${txt}`);
      }
      const json = await resp.json();
      if (json.places) allPlaces.push(...json.places);
      pageToken = json.nextPageToken;
      pages++;
      // Google requiere una pequeña espera antes de usar el nextPageToken
      if (pageToken) await new Promise((r) => setTimeout(r, 1500));
    } while (pageToken && pages < 3); // máx 60 resultados

    // 2) Cache de municipios por CP (se va llenando bajo demanda)
    const muniCache = new Map<string, { id: string; poblacion: number }>();
    const resolveMunicipio = async (cp: string, ciudad: string) => {
      if (muniCache.has(cp)) return muniCache.get(cp)!;
      const { data: existente } = await supabase
        .from("municipios")
        .select("id, poblacion")
        .eq("codigo_postal", cp)
        .maybeSingle();
      if (existente) {
        muniCache.set(cp, existente);
        return existente;
      }
      const { data: nuevo, error: muniErr } = await supabase
        .from("municipios")
        .insert({ nombre: ciudad || `CP ${cp}`, codigo_postal: cp, poblacion: 25000 })
        .select("id, poblacion")
        .single();
      if (muniErr) {
        // Posible colisión por unique (nombre, codigo_postal) si ya existe
        // con otra grafía. Reintentamos buscando por (nombre, cp) o solo por cp.
        const { data: porNombre } = await supabase
          .from("municipios")
          .select("id, poblacion")
          .eq("codigo_postal", cp)
          .limit(1)
          .maybeSingle();
        if (porNombre) {
          muniCache.set(cp, porNombre);
          return porNombre;
        }
        throw muniErr;
      }
      muniCache.set(cp, nuevo);
      return nuevo;
    };

    // 3) Upsert de cada negocio (CP real desde addressComponents)
    let nuevos = 0;
    let actualizados = 0;
    let descartadosConWeb = 0;
    let descartadosSinCp = 0;

    for (const p of allPlaces) {
      const nombre = p.displayName?.text ?? "Sin nombre";
      const reviews = p.userRatingCount ?? 0;
      const rating = p.rating ?? 0;
      const website = p.websiteUri ?? null;
      const hasWeb = Boolean(website);
      // Solo nos interesan negocios SIN web (target principal del producto)
      if (hasWeb) {
        descartadosConWeb++;
        continue;
      }
      // Extraer CP real y locality desde addressComponents (mucho más fiable
      // que regex sobre formattedAddress).
      const comps: any[] = p.addressComponents ?? [];
      const cpComp = comps.find((c) => c.types?.includes("postal_code"));
      const locComp = comps.find(
        (c) => c.types?.includes("locality") || c.types?.includes("postal_town"),
      );
      const cpReal: string | null = cpComp?.longText ?? null;
      if (!cpReal || !/^\d{5}$/.test(cpReal)) {
        descartadosSinCp++;
        continue;
      }
      const ciudadReal: string = locComp?.longText ?? `CP ${cpReal}`;
      const muni = await resolveMunicipio(cpReal, ciudadReal);
      const municipioId = muni.id;
      const poblacion = muni.poblacion;

      const telefono = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null;
      const direccion = p.formattedAddress ?? null;
      const types: string[] = p.types ?? [];
      const categoria = categoriaFromTypes(
        p.primaryType ? [p.primaryType, ...types] : types,
      );

      // ¿Existe ya?
      const { data: existing } = await supabase
        .from("negocios")
        .select("id")
        .eq("municipio_id", municipioId)
        .eq("nombre", nombre)
        .maybeSingle();

      let negocioId: string;
      if (existing) {
        const { error } = await supabase
          .from("negocios")
          .update({
            categoria, direccion, telefono, url_web: website,
            numero_resenas: reviews, rating, tiene_web: hasWeb,
          })
          .eq("id", existing.id);
        if (error) throw error;
        negocioId = existing.id;
        actualizados++;
      } else {
        const { data: ins, error } = await supabase
          .from("negocios")
          .insert({
            nombre, categoria, direccion, telefono, url_web: website,
            numero_resenas: reviews, rating, tiene_web: hasWeb, municipio_id: municipioId,
          })
          .select("id")
          .single();
        if (error) throw error;
        negocioId = ins.id;
        nuevos++;
      }

      // 4) Score
      const sWeb = hasWeb ? 0 : 40;
      const sRev = reviewsScore(reviews);
      const sTipo = tipoScore(types);
      const sUbi = ubicacionScore(poblacion);
      const total = sWeb + sRev + sTipo + sUbi;
      const factores = { web: sWeb, reviews: sRev, tipo: sTipo, ubicacion: sUbi };

      const { data: scoreRow } = await supabase
        .from("score")
        .select("id")
        .eq("negocio_id", negocioId)
        .maybeSingle();

      if (scoreRow) {
        await supabase.from("score").update({
          score_total: total, etiqueta: etiquetaFor(total), factores,
        }).eq("id", scoreRow.id);
      } else {
        await supabase.from("score").insert({
          negocio_id: negocioId, score_total: total,
          etiqueta: etiquetaFor(total), factores,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: allPlaces.length,
        nuevos,
        actualizados,
        descartadosConWeb,
        descartadosSinCp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("importar-negocios error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
