import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-file-name, x-target-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Validate tenant API key
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("api_key", apiKey)
    .single();

  if (tenantErr || !tenant) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fileName = req.headers.get("x-file-name");
  if (!fileName) {
    return new Response(JSON.stringify({ error: "Missing x-file-name header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contentType = req.headers.get("content-type") || "application/octet-stream";
  const body = await req.arrayBuffer();

  // Upload using service role (bypasses RLS)
  const storagePath = `${tenant.id}/${fileName}`;
  const { error: uploadErr } = await supabase.storage
    .from("diagnostics")
    .upload(storagePath, body, {
      contentType,
      upsert: true,
    });

  if (uploadErr) {
    console.error(`[storage-upload] failed: ${uploadErr.message}`);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: urlData } = supabase.storage
    .from("diagnostics")
    .getPublicUrl(storagePath);

  console.log(`[storage-upload] stored ${storagePath} for tenant=${tenant.id}`);

  return new Response(JSON.stringify({ ok: true, url: urlData.publicUrl }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
