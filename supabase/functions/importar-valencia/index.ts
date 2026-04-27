// Importa negocios de TODOS los municipios de Valencia.
// Combina Google Places (resuelve CP + negocios) + Páginas Amarillas (Firecrawl).
// Procesa en lotes con cursor para evitar timeouts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { MUNICIPIOS_VALENCIA } from "./_municipios.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HIGH = ["dentist","lawyer","doctor","real_estate_agency","insurance_agency","plumber","electrician","physiotherapist","veterinary_care","car_repair","car_dealer","moving_company","locksmith","roofing_contractor"];
const MID = ["restaurant","beauty_salon","hair_care","gym","spa","cafe","bakery","florist","pet_store","school","travel_agency"];
const tipoScore = (t:string[]=[]) => t.some(x=>HIGH.includes(x))?20: t.some(x=>MID.includes(x))?10:0;
const reviewsScore = (n:number)=> n<=10?25: n<=50?15:5;
const ubicScore = (p:number)=> p>50000?15: p>=10000?10:5;
const etiquetaFor = (p:number)=> p>=80?"Caliente": p>=60?"Templado":"Frío";

const CAT_MAP: Record<string,string> = {
  restaurant:"Restaurante",cafe:"Cafetería",bakery:"Panadería",bar:"Bar",
  beauty_salon:"Belleza",hair_care:"Peluquería",gym:"Deporte",spa:"Bienestar",
  florist:"Floristería",pet_store:"Mascotas",dentist:"Salud",doctor:"Salud",
  lawyer:"Servicios",real_estate_agency:"Inmobiliaria",insurance_agency:"Seguros",
  plumber:"Servicios",electrician:"Servicios",car_repair:"Mecánico",
  car_dealer:"Automoción",veterinary_care:"Veterinario",book_store:"Librería",
  clothing_store:"Moda",shoe_store:"Moda",supermarket:"Supermercado",
  pharmacy:"Farmacia",travel_agency:"Viajes",school:"Educación",hotel:"Hotel",
};
const categoriaFromTypes = (t:string[]=[]) => {
  for (const x of t) if (CAT_MAP[x]) return CAT_MAP[x];
  return t[0]?.replace(/_/g," ") ?? "Negocio";
};

// --- Google Places: text search con paginación ---
async function gPlacesSearch(query: string, apiKey: string) {
  const fieldMask = [
    "places.id","places.displayName","places.formattedAddress",
    "places.nationalPhoneNumber","places.websiteUri","places.rating",
    "places.userRatingCount","places.types","places.primaryType",
    "places.addressComponents",
  ].join(",");
  const all: any[] = [];
  let pageToken: string|undefined; let pages=0;
  do {
    const body: Record<string,unknown> = {
      textQuery: query, languageCode:"es", regionCode:"ES", pageSize:20,
    };
    if (pageToken) body.pageToken = pageToken;
    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": `${fieldMask},nextPageToken`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.warn("Places err", resp.status, await resp.text());
      break;
    }
    const j = await resp.json();
    if (j.places) all.push(...j.places);
    pageToken = j.nextPageToken;
    pages++;
    if (pageToken) await new Promise(r=>setTimeout(r,1500));
  } while (pageToken && pages < 3);
  return all;
}

// Resuelve el código postal del municipio buscando "ayuntamiento de X, Valencia"
function extractPostal(places: any[]): string {
  for (const p of places) {
    const comps = p.addressComponents ?? [];
    const pc = comps.find((c:any)=> c.types?.includes("postal_code"));
    if (pc?.longText) return pc.longText;
  }
  return "";
}

// --- Páginas Amarillas vía Firecrawl ---
type PAEntry = { nombre:string; categoria?:string; telefono?:string; direccion?:string; website?:string };
async function scrapePaginasAmarillas(municipio: string, fcKey: string): Promise<PAEntry[]> {
  // Página de búsqueda por localidad
  const url = `https://www.paginasamarillas.es/search/-/p-${encodeURIComponent(municipio)}/1`;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${fcKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        url,
        formats: [{ type:"json", prompt:"Extract a list of businesses listed on this page. For each return: nombre, categoria (if visible), telefono, direccion (full street address), website (if any)." }],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) { console.warn("PA fc fail", res.status); return []; }
    const j = await res.json();
    const data = j?.data?.json ?? j?.json ?? {};
    const arr = data.businesses ?? data.negocios ?? data.results ?? data.list ?? [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x:any)=> x?.nombre).slice(0, 30);
  } catch (e) {
    console.warn("PA scrape err", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { offset = 0, batchSize = 3, minPob = 0, includePA = true } = await req.json().catch(()=>({}));
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY no configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Filtra por población mínima si se pide
    const lista = MUNICIPIOS_VALENCIA.filter(m => m.poblacion >= minPob);
    const slice = lista.slice(offset, offset + batchSize);
    const totalMunicipios = lista.length;

    const resultados: any[] = [];
    let totalNuevos = 0, totalActualizados = 0;

    for (const muni of slice) {
      try {
        // 1) Buscar negocios en Google Places. Probamos varias queries hasta tener resultados.
        const queries = [
          `empresas y comercios en ${muni.nombre}, Valencia, España`,
          `restaurantes ${muni.nombre} Valencia`,
          `tiendas en ${muni.nombre} (Valencia)`,
        ];
        let places: any[] = [];
        for (const q of queries) {
          places = await gPlacesSearch(q, apiKey);
          if (places.length > 0) break;
        }

        // 2) CP del municipio (lo sacamos de los resultados o del ayuntamiento)
        let postal = extractPostal(places);
        if (!postal) {
          const extra = await gPlacesSearch(`ayuntamiento de ${muni.nombre}, Valencia`, apiKey);
          postal = extractPostal(extra);
        }

        // 3) Asegurar municipio en BD (upsert por nombre, sin tocar codigo_postal si ya existe y colisionaría)
        let { data: muniRow } = await supabase
          .from("municipios")
          .select("id,poblacion,codigo_postal")
          .eq("nombre", muni.nombre)
          .maybeSingle();
        let municipioId = muniRow?.id;
        if (!municipioId) {
          // Si no hay CP resuelto, usar uno único derivado del nombre para evitar colisión UNIQUE
          const cp = postal || `V-${muni.nombre.slice(0,8)}`;
          const ins = await supabase.from("municipios")
            .insert({ nombre: muni.nombre, codigo_postal: cp, poblacion: muni.poblacion })
            .select("id").single();
          if (ins.error) throw ins.error;
          municipioId = ins.data.id;
        } else if (postal && postal !== muniRow?.codigo_postal) {
          // Solo actualizamos CP si lo hemos resuelto y es diferente
          await supabase.from("municipios")
            .update({ codigo_postal: postal, poblacion: muni.poblacion })
            .eq("id", municipioId);
        } else {
          await supabase.from("municipios")
            .update({ poblacion: muni.poblacion })
            .eq("id", municipioId);
        }

        let nuevos=0, actualizados=0;

        // 4) Upsert Google Places
        for (const p of places) {
          const nombre = p.displayName?.text ?? "Sin nombre";
          const reviews = p.userRatingCount ?? 0;
          const rating = p.rating ?? 0;
          const website = p.websiteUri ?? null;
          const hasWeb = Boolean(website);
          const telefono = p.nationalPhoneNumber ?? null;
          const direccion = p.formattedAddress ?? null;
          const types: string[] = p.types ?? [];
          const categoria = categoriaFromTypes(p.primaryType ? [p.primaryType, ...types] : types);

          const exist = await supabase.from("negocios")
            .select("id").eq("municipio_id", municipioId).eq("nombre", nombre).maybeSingle();
          let negocioId: string;
          if (exist.data) {
            await supabase.from("negocios").update({
              categoria, direccion, telefono, url_web: website, numero_resenas: reviews, rating, tiene_web: hasWeb,
            }).eq("id", exist.data.id);
            negocioId = exist.data.id;
            actualizados++;
          } else {
            const ins = await supabase.from("negocios").insert({
              nombre, categoria, direccion, telefono, url_web: website, numero_resenas: reviews, rating,
              tiene_web: hasWeb, municipio_id: municipioId,
            }).select("id").single();
            if (ins.error) throw ins.error;
            negocioId = ins.data.id;
            nuevos++;
          }

          const sWeb = hasWeb?0:40, sRev = reviewsScore(reviews), sTipo = tipoScore(types), sUbi = ubicScore(muni.poblacion);
          const total = sWeb+sRev+sTipo+sUbi;
          const factores = { web:sWeb, reviews:sRev, tipo:sTipo, ubicacion:sUbi };
          const sc = await supabase.from("score").select("id").eq("negocio_id", negocioId).maybeSingle();
          if (sc.data) {
            await supabase.from("score").update({ score_total: total, etiqueta: etiquetaFor(total), factores }).eq("id", sc.data.id);
          } else {
            await supabase.from("score").insert({ negocio_id: negocioId, score_total: total, etiqueta: etiquetaFor(total), factores });
          }
        }

        // 5) Páginas Amarillas (opcional)
        let paCount = 0;
        if (includePA && fcKey) {
          const pa = await scrapePaginasAmarillas(muni.nombre, fcKey);
          for (const e of pa) {
            const nombre = String(e.nombre).trim();
            if (!nombre) continue;
            const exist = await supabase.from("negocios")
              .select("id, tiene_web, url_web, telefono, direccion")
              .eq("municipio_id", municipioId).eq("nombre", nombre).maybeSingle();
            const website = e.website ?? null;
            const hasWeb = Boolean(website);
            const categoria = e.categoria ?? "Negocio";
            if (exist.data) {
              await supabase.from("negocios").update({
                telefono: exist.data.telefono ?? e.telefono ?? null,
                direccion: exist.data.direccion ?? e.direccion ?? null,
                url_web: exist.data.url_web ?? website,
                tiene_web: exist.data.tiene_web || hasWeb,
              }).eq("id", exist.data.id);
              actualizados++;
            } else {
              const ins = await supabase.from("negocios").insert({
                nombre, categoria, direccion: e.direccion ?? null,
                telefono: e.telefono ?? null, url_web: website,
                numero_resenas: 0, rating: 0, tiene_web: hasWeb, municipio_id: municipioId,
              }).select("id").single();
              if (!ins.error && ins.data) {
                const sWeb = hasWeb?0:40, sUbi = ubicScore(muni.poblacion);
                const total = sWeb+5+0+sUbi;
                await supabase.from("score").insert({
                  negocio_id: ins.data.id, score_total: total,
                  etiqueta: etiquetaFor(total),
                  factores: { web:sWeb, reviews:5, tipo:0, ubicacion:sUbi, fuente:"paginas_amarillas" },
                });
                nuevos++;
              }
            }
            paCount++;
          }
        }

        totalNuevos += nuevos; totalActualizados += actualizados;
        resultados.push({ municipio: muni.nombre, postal, places: places.length, paginas_amarillas: paCount, nuevos, actualizados });
      } catch (e:any) {
        console.error("Municipio err", muni.nombre, e?.message ?? e);
        resultados.push({ municipio: muni.nombre, error: e?.message ?? String(e) });
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= totalMunicipios;

    return new Response(JSON.stringify({
      ok: true,
      procesados: slice.length,
      offset, nextOffset, done, totalMunicipios,
      totalNuevos, totalActualizados,
      resultados,
    }), { headers: { ...corsHeaders, "Content-Type":"application/json" } });
  } catch (err) {
    console.error("importar-valencia error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type":"application/json" },
    });
  }
});
