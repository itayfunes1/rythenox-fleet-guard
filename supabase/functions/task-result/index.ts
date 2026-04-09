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

const getString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

const getNullableString = (value: unknown) => {
  if (value === null) return null;
  return getString(value);
};

const normalizeTaskStatus = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  switch (value.trim().toLowerCase()) {
    case "completed":
    case "complete":
    case "success":
    case "succeeded":
    case "ok":
      return "Completed";
    case "failed":
    case "fail":
    case "error":
      return "Failed";
    default:
      return undefined;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const taskId = getString(body.task_id) ?? getString(body.taskId) ?? getString(body.id);
  const targetId = getString(body.target_id) ?? getString(body.targetId);
  const rawStatus = getString(body.status) ?? getString(body.state);
  const status = normalizeTaskStatus(body.status ?? body.state);
  const stdout = getNullableString(body.stdout);
  const stderr = getNullableString(body.stderr);
  const result =
    getNullableString(body.result) ??
    getNullableString(body.output) ??
    (stdout && stderr ? `stdout:\n${stdout}\n\nstderr:\n${stderr}` : stdout ?? stderr) ??
    getNullableString(body.message);

  const type = getString(body.type);
  const fileUrl = getString(body.file_url) ?? getString(body.fileUrl);
  const hasTaskResultPayload = Boolean(taskId || (targetId && (rawStatus || result !== undefined)));
  const hasDiagnosticPayload = Boolean(targetId && type && fileUrl);

  if (rawStatus && !status) {
    return jsonResponse({ error: "status must be Completed or Failed" }, 400);
  }

  if (hasTaskResultPayload && !hasDiagnosticPayload) {
    let resolvedTaskId = taskId;

    if (!resolvedTaskId && targetId) {
      const { data: pendingTask, error: lookupErr } = await supabase
      .from("remote_tasks")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("target_id", targetId)
        .in("status", ["Sent", "Pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupErr) {
        console.error(`[task-result] failed to resolve task for target=${targetId}: ${lookupErr.message}`);
        return jsonResponse({ error: lookupErr.message }, 500);
      }

      if (!pendingTask) {
        console.warn(`[task-result] no matching task found for target=${targetId}`);
        return jsonResponse({ error: `No matching task found for target_id ${targetId}` }, 404);
      }

      resolvedTaskId = pendingTask.id;
    }

    if (!resolvedTaskId) {
      return jsonResponse({ error: "Provide task_id, taskId, id, or target_id with a task result payload" }, 400);
    }

    const { data: updatedTask, error: updateErr } = await supabase
      .from("remote_tasks")
      .update({ status: status || "Completed", result: result ?? null })
      .eq("id", resolvedTaskId)
      .eq("tenant_id", tenant.id)
      .select("id, target_id, status")
      .maybeSingle();

    if (updateErr) {
      console.error(`[task-result] failed to update task=${resolvedTaskId}: ${updateErr.message}`);
      return jsonResponse({ error: updateErr.message }, 500);
    }

    if (!updatedTask) {
      console.warn(`[task-result] task=${resolvedTaskId} not found for tenant=${tenant.id}`);
      return jsonResponse({ error: "Task not found for this tenant" }, 404);
    }

    console.log(
      `[task-result] updated task=${updatedTask.id} target=${updatedTask.target_id} status=${updatedTask.status} via=${taskId ? "task_id" : "target_id"}`,
    );

    return jsonResponse(
      { ok: true, task_id: updatedTask.id, target_id: updatedTask.target_id, status: updatedTask.status },
      200,
    );
  }

  if (hasDiagnosticPayload && targetId && type && fileUrl) {
    if (!["image", "audio", "text"].includes(type)) {
      return jsonResponse({ error: "type must be image, audio, or text" }, 400);
    }

    const { error: insertErr } = await supabase
      .from("diagnostic_vault")
      .insert({
        tenant_id: tenant.id,
        target_id: targetId,
        type,
        file_url: fileUrl,
      });

    if (insertErr) {
      console.error(`[task-result] failed diagnostic upload for target=${targetId}: ${insertErr.message}`);
      return jsonResponse({ error: insertErr.message }, 500);
    }

    console.log(`[task-result] stored diagnostic for target=${targetId} type=${type}`);
    return jsonResponse({ ok: true }, 200);
  }

  return jsonResponse(
    { error: "Provide a task result payload or (target_id + type + file_url) for diagnostics" },
    400,
  );
});
