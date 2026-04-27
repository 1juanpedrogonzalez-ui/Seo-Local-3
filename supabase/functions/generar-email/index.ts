import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { negocio } = await req.json();
    if (!negocio?.nombre) {
      return new Response(JSON.stringify({ error: "Falta nombre del negocio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const systemPrompt = `Eres un copywriter de ventas directo y agresivo (sin ser ofensivo).
Mensaje central OBLIGATORIO: "Hemos creado una web GRATIS para tu negocio".
Tono: directo, persuasivo, cercano. Frases cortas. Sin rodeos.
Estructura OBLIGATORIA del cuerpo:
1) Saludo: "Hola {nombre del negocio},"
2) Frase clave: "Hemos creado una web completamente GRATIS para tu negocio."
3) "Puedes verla aquí:" seguido del placeholder literal [LINK_PREVIEW] en una línea propia.
4) Una frase de beneficio (más clientes / visibilidad) adaptada a la categoría.
5) Oferta de mantenerla online o mejorarla.
6) CTA final EXACTO: "¿Te gustaría que la activemos?"
Asunto OBLIGATORIO: "Hemos creado una web GRATIS para tu negocio".
Devuelve SOLO JSON {"asunto":"...","cuerpo":"..."}.`;

    const userPrompt = `Datos del negocio:
Nombre: ${negocio.nombre}
Categoría: ${negocio.categoria}
Ciudad: ${negocio.ciudad ?? ""}
Texto plano, máximo 120 palabras. Mantén el placeholder [LINK_PREVIEW] tal cual.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generar_email",
            description: "Devuelve asunto y cuerpo del email",
            parameters: {
              type: "object",
              properties: {
                asunto: { type: "string" },
                cuerpo: { type: "string" },
              },
              required: ["asunto", "cuerpo"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generar_email" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Límite de uso alcanzado." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Sin créditos en Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "Error del proveedor IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { asunto: "Te hemos creado una web gratis", cuerpo: "" };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generar-email error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
