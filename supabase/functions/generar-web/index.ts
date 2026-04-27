import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { negocio } = await req.json();
    if (!negocio?.nombre || !negocio?.categoria) {
      return new Response(JSON.stringify({ error: "Falta nombre o categoría" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const systemPrompt = `Eres un diseñador web profesional. Generas landing pages HTML modernas, responsivas y profesionales en una sola página.
Reglas:
- Devuelve SOLO HTML completo (con <html>, <head>, <body>) sin explicación.
- Usa Tailwind via CDN (<script src="https://cdn.tailwindcss.com"></script>).
- Tono profesional, confiable, orientado al negocio local.
- Incluye: hero con CTA, sección de servicios, sobre nosotros, contacto con datos reales del negocio, footer.
- Paleta sobria adecuada al sector.`;

    const userPrompt = `Genera la landing page para este negocio:
Nombre: ${negocio.nombre}
Categoría: ${negocio.categoria}
Dirección: ${negocio.direccion ?? ""}
Teléfono: ${negocio.telefono ?? ""}
Email: ${negocio.email ?? ""}
Ciudad: ${negocio.ciudad ?? ""}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Límite de uso alcanzado, intenta más tarde." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Sin créditos. Añade fondos en Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "Error del proveedor IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    let html: string = data.choices?.[0]?.message?.content ?? "";
    // Limpiar bloques markdown ```html ... ```
    html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generar-web error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
