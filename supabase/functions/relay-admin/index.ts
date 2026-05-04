import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize via platform_admins allow-list (server-managed, not email-based)
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin, error: adminErr } = await adminClient.rpc("is_platform_admin", { _user_id: user.id });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, relay_id, tenant_id, command } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "force_offline": {
        if (!relay_id) {
          return new Response(JSON.stringify({ error: "relay_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await supabase
          .from("relay_nodes")
          .update({ status: "Offline", client_count: 0 })
          .eq("id", relay_id)
          .eq("tenant_id", tenant_id)
          .select();
        if (error) throw error;
        result = { success: true, message: "Relay forced offline", data };
        break;
      }

      case "purge_stale": {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("relay_nodes")
          .delete()
          .eq("tenant_id", tenant_id)
          .lt("last_seen", cutoff)
          .select();
        if (error) throw error;
        result = { success: true, message: `Purged ${data?.length ?? 0} stale relays`, data };
        break;
      }

      case "broadcast_command": {
        if (!command) {
          return new Response(JSON.stringify({ error: "command required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Get all online relay target addresses and create tasks for each
        const { data: relays, error: fetchError } = await supabase
          .from("relay_nodes")
          .select("addr")
          .eq("tenant_id", tenant_id)
          .eq("status", "Online");
        if (fetchError) throw fetchError;

        const tasks = (relays || []).map((r) => ({
          tenant_id,
          target_id: r.addr,
          command,
        }));

        if (tasks.length > 0) {
          const { error: insertError } = await supabase.from("remote_tasks").insert(tasks);
          if (insertError) throw insertError;
        }

        result = { success: true, message: `Broadcast to ${tasks.length} relays` };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[relay-admin] error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
