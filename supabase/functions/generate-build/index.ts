import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_OWNER = "itayfunes1";
const GITHUB_REPO = "client-source";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Look up THIS user's tenant API key server-side (via security-definer RPC)
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: apiKey, error: keyErr } = await admin.rpc("get_tenant_api_key", {
      _user_id: userId,
    });

    if (keyErr || !apiKey) {
      return new Response(
        JSON.stringify({ error: "No tenant API key found for this user", details: keyErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique build ID for this request — used as the artifact filename
    const buildId = crypto.randomUUID();

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
        },
        body: JSON.stringify({
          event_type: "generate-agent",
          client_payload: {
            api_key: apiKey,
            supabase_url: supabaseUrl,
            task_id: buildId,
            user_id: userId,
          },
        }),
      }
    );

    if (!dispatchResp.ok) {
      const text = await dispatchResp.text();
      return new Response(
        JSON.stringify({
          error: "Failed to dispatch GitHub Actions workflow",
          status: dispatchResp.status,
          details: text,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ buildId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
