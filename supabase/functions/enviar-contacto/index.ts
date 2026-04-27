import { corsHeaders } from "npm:@supabase/supabase-js/cors";
import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { negocio_id, asunto, cuerpo, canal = "email" } = await req.json();
    if (!negocio_id || !asunto || !cuerpo) {
      return new Response(JSON.stringify({ error: "Faltan campos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("contactos")
      .insert({ negocio_id, asunto, cuerpo, canal, estado: "pendiente" })
      .select()
      .single();

    if (error) throw error;

    // Hook saliente Make/n8n (estructura preparada). Configurar MAKE_WEBHOOK_URL como secret.
    const webhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    if (webhookUrl) {
      try {
        const hookResp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "contacto", contacto: data }),
        });
        if (hookResp.ok) {
          await supabase.from("contactos").update({ estado: "enviado" }).eq("id", data.id);
          data.estado = "enviado";
        }
      } catch (hookErr) {
        console.error("webhook error", hookErr);
      }
    }

    return new Response(JSON.stringify({ contacto: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enviar-contacto error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
