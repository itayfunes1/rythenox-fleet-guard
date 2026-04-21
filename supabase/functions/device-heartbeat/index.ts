import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const bodyApiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
  const apiKey = req.headers.get("x-api-key")?.trim() || bodyApiKey;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

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

  const { target_id, status, os_info, arch, public_ip } = body as {
    target_id?: string;
    status?: string;
    os_info?: string;
    arch?: string;
    public_ip?: string;
  };

  if (!target_id) {
    return new Response(JSON.stringify({ error: "target_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (status && !["Online", "Offline"].includes(status)) {
    return new Response(JSON.stringify({ error: "status must be Online or Offline" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build upsert payload — only include os_info/arch/public_ip if provided,
  // so we don't overwrite existing values with null on every heartbeat.
  const upsertData: Record<string, unknown> = {
    tenant_id: tenant.id,
    target_id,
    status: status || "Online",
    last_seen: new Date().toISOString(),
  };

  if (os_info !== undefined && os_info !== null && os_info !== "") {
    upsertData.os_info = os_info;
  }
  if (arch !== undefined && arch !== null && arch !== "") {
    upsertData.arch = arch;
  }
  // Auto-detect public IP from request headers if not explicitly provided
  let resolvedPublicIp = public_ip;
  if (!resolvedPublicIp) {
    const xff = req.headers.get("x-forwarded-for") || "";
    const firstIp = xff.split(",")[0]?.trim();
    const realIp = req.headers.get("x-real-ip")?.trim();
    resolvedPublicIp = firstIp || realIp || "";
  }
  if (resolvedPublicIp) {
    upsertData.public_ip = resolvedPublicIp;
  }

  const { error: upsertErr } = await supabase
    .from("managed_devices")
    .upsert(upsertData, { onConflict: "tenant_id,target_id" });

  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
