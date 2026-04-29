import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeviceInfo {
  target_id: string;
  nickname: string | null;
  os_info: string | null;
  arch: string | null;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt || prompt.length > 1000) {
      return new Response(JSON.stringify({ error: "Prompt must be 1-1000 chars" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant devices (RLS-scoped via user JWT)
    const { data: devicesRaw } = await supabase
      .from("managed_devices")
      .select("target_id,nickname,os_info,arch,status")
      .limit(200);

    const devices: DeviceInfo[] = (devicesRaw ?? []) as any;

    const onlineDevices = devices.filter((d) => d.status === "Online");
    const deviceSummary = devices.length
      ? devices
          .map(
            (d) =>
              `- ${d.target_id}${d.nickname ? ` (${d.nickname})` : ""} | os=${d.os_info ?? "unknown"} | arch=${d.arch ?? "?"} | status=${d.status}`,
          )
          .join("\n")
      : "(no devices enrolled)";

    const systemPrompt = `You are an expert SRE/DevOps assistant for a remote-fleet management platform. Convert the user's natural-language request into a single safe shell command and select which enrolled devices to run it on.

Rules:
- Output ONE command line. No explanations, no multi-line scripts unless absolutely needed (use && or ;).
- Pick the correct command for the target OS (use Windows PowerShell/cmd syntax for Windows targets, POSIX shell for Linux/macOS).
- ONLY select devices whose status is "Online". Offline devices cannot execute commands. If no Online devices match the request, return an empty target_ids array and explain in the rationale that no online devices are available.
- If the fleet is mixed and the request applies to a specific OS, only target Online devices of that OS.
- NEVER suggest destructive commands (rm -rf /, format, dd to disks, shutdown without intent, mkfs, etc.) unless the user explicitly and unambiguously asks for that destruction. When risky, set risk="high" and explain.
- Prefer read-only / diagnostic commands when the request is ambiguous.
- If you cannot fulfill the request safely, return an empty command and explain in the rationale.

Currently ${onlineDevices.length} of ${devices.length} enrolled device(s) are Online.

Enrolled devices:
${deviceSummary}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_command",
              description: "Return a shell command and target device list",
              parameters: {
                type: "object",
                properties: {
                  command: {
                    type: "string",
                    description: "Single shell command to execute. Empty string if not safe to suggest.",
                  },
                  target_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "target_id values from the enrolled devices list to run this on",
                  },
                  rationale: {
                    type: "string",
                    description: "1-2 sentence plain-English explanation of what the command does and why these targets",
                  },
                  risk: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Risk level. high = destructive or potentially data-loss",
                  },
                  os_target: {
                    type: "string",
                    enum: ["linux", "windows", "macos", "any"],
                  },
                },
                required: ["command", "target_ids", "rationale", "risk", "os_target"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_command" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no suggestion" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned malformed suggestion" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const onlineTargets = new Set(onlineDevices.map((d) => d.target_id));
    const target_ids: string[] = Array.isArray(parsed.target_ids)
      ? parsed.target_ids.filter((t: any) => typeof t === "string" && onlineTargets.has(t))
      : [];

    return new Response(
      JSON.stringify({
        command: String(parsed.command ?? ""),
        target_ids,
        rationale: String(parsed.rationale ?? ""),
        risk: ["low", "medium", "high"].includes(parsed.risk) ? parsed.risk : "medium",
        os_target: parsed.os_target ?? "any",
        fleet: { total: devices.length, online: onlineDevices.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-command-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
