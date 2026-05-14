import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER") ?? "itayfunes1";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "client-source";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const githubPat = Deno.env.get("GITHUB_PAT");

    if (!githubPat) {
      return new Response(JSON.stringify({ error: "GITHUB_PAT secret is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT and get the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Look up THIS user's tenant context and API key server-side (never trust client payload)
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [{ data: apiKey, error: keyErr }, { data: membership, error: membershipErr }] = await Promise.all([
      admin.rpc("get_tenant_api_key", { _user_id: userId }),
      admin
        .from("tenant_members")
        .select("tenant_id, role, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (membershipErr || !membership?.tenant_id) {
      console.error("generate-build: tenant lookup failed", membershipErr?.message ?? "no membership");
      return new Response(
        JSON.stringify({ error: "No tenant membership found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (keyErr || !apiKey) {
      console.error("generate-build: tenant API key lookup failed", keyErr?.message ?? "no api key");
      return new Response(
        JSON.stringify({ error: "No tenant API key found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique build ID for this request — used as the artifact filename
    const buildId = crypto.randomUUID();

    const { error: buildRecordErr } = await admin.from("build_history").insert({
      build_id: buildId,
      tenant_id: membership.tenant_id,
      user_id: userId,
      status: "building",
    });

    if (buildRecordErr) {
      console.error("generate-build: failed to record build", buildRecordErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to record build request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`generate-build: dispatching ${GITHUB_OWNER}/${GITHUB_REPO} for build ${buildId}`);

    // Dispatch the GitHub Actions workflow
    const dispatchResp = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${githubPat}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "rythenox-build-dispatcher",
        },
        body: JSON.stringify({
          event_type: "generate-agent",
          client_payload: {
            api_key: apiKey,
            supabase_url: supabaseUrl,
            task_id: buildId,
            user_id: userId,
            tenant_id: membership.tenant_id,
          },
        }),
      }
    );

    if (!dispatchResp.ok) {
      const text = await dispatchResp.text();
      console.error("generate-build: GitHub dispatch failed", dispatchResp.status, text.slice(0, 500));
      await admin
        .from("build_history")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("build_id", buildId);
      return new Response(
        JSON.stringify({
          error: "Failed to dispatch GitHub Actions workflow",
          status: dispatchResp.status,
          details: text,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`generate-build: GitHub dispatch accepted for build ${buildId}`);

    return new Response(JSON.stringify({ buildId, status: "queued" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-build: unhandled error", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
