const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GeoEntry = {
  lat: number;
  lon: number;
  country?: string;
  city?: string;
  ts: number;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isIpLike = (value: string) =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || /^[0-9a-f:]+$/i.test(value);

async function lookupIp(ip: string): Promise<GeoEntry | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.success || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }

    return {
      lat: data.latitude,
      lon: data.longitude,
      country: typeof data.country === "string" ? data.country : undefined,
      city: typeof data.city === "string" ? data.city : undefined,
      ts: Date.now(),
    };
  } catch (error) {
    console.warn(`[geo-lookup] lookup failed for ${ip}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { ips?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const ips = Array.isArray(body.ips)
    ? [...new Set(body.ips.map((ip) => String(ip).trim()).filter((ip) => ip && isIpLike(ip)))].slice(0, 100)
    : [];

  const results: Record<string, GeoEntry> = {};
  for (const ip of ips) {
    const entry = await lookupIp(ip);
    if (entry) results[ip] = entry;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return jsonResponse({ results });
});