import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return jsonResponse({ error: "Missing x-api-key header" }, 401);
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
    return jsonResponse({ error: "Invalid API key" }, 403);
  }

  const url = new URL(req.url);
  const targetId = url.searchParams.get("target_id") ?? url.searchParams.get("targetId");
  if (!targetId) {
    return jsonResponse({ error: "target_id query param required" }, 400);
  }

  const { data: task, error: fetchErr } = await supabase
    .from("remote_tasks")
    .select("id, target_id, command, created_at")
    .eq("tenant_id", tenant.id)
    .eq("target_id", targetId)
    .eq("status", "Pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error(`[task-poll] fetch failed for tenant=${tenant.id} target=${targetId}: ${fetchErr.message}`);
    return jsonResponse({ error: fetchErr.message }, 500);
  }

  if (!task) {
    console.log(`[task-poll] no task for tenant=${tenant.id} target=${targetId}`);
    return jsonResponse(
      {
        task: null,
        task_id: null,
        target_id: targetId,
        command: null,
        created_at: null,
        status: "idle",
      },
      200,
    );
  }

  const { data: sentTask, error: updateErr } = await supabase
    .from("remote_tasks")
    .update({ status: "Sent" })
    .eq("id", task.id)
    .eq("tenant_id", tenant.id)
    .select("id, target_id, command, created_at, status")
    .maybeSingle();

  if (updateErr) {
    console.error(`[task-poll] failed to claim task=${task.id}: ${updateErr.message}`);
    return jsonResponse({ error: updateErr.message }, 500);
  }

  if (!sentTask) {
    console.warn(`[task-poll] task=${task.id} was not claimed for target=${targetId}`);
    return jsonResponse({ error: "Task was already claimed" }, 409);
  }

  console.log(`[task-poll] dispatched task=${sentTask.id} target=${sentTask.target_id}`);

  return jsonResponse(
    {
      task: sentTask,
      task_id: sentTask.id,
      target_id: sentTask.target_id,
      command: sentTask.command,
      created_at: sentTask.created_at,
      status: sentTask.status,
    },
    200,
  );
});
