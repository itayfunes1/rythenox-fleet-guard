import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useQuery } from "@tanstack/react-query";

interface DeviceLite {
  target_id: string;
  status: string;
  public_ip: string | null;
  nickname?: string | null;
}

interface GeoPoint {
  ip: string;
  lat: number;
  lon: number;
  country?: string;
  city?: string;
  devices: DeviceLite[];
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const CACHE_KEY = "rythenox_ip_geo_cache_v1";

type CacheEntry = { lat: number; lon: number; country?: string; city?: string; ts: number };
type Cache = Record<string, CacheEntry>;

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function saveCache(c: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

async function lookupIp(ip: string): Promise<CacheEntry | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) return null;
    const j = await res.json();
    if (!j?.success || typeof j.latitude !== "number" || typeof j.longitude !== "number") return null;
    return {
      lat: j.latitude,
      lon: j.longitude,
      country: j.country,
      city: j.city,
      ts: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches devices then resolves all unique public IPs to geo coords.
 * Returns the resolved GeoPoints directly — no useEffect needed.
 */
async function fetchDevicesAndResolve(tenantId: string): Promise<{ devices: DeviceLite[]; points: GeoPoint[] }> {
  const { data, error } = await supabase
    .from("managed_devices")
    .select("target_id, status, public_ip, nickname")
    .eq("tenant_id", tenantId)
    .not("public_ip", "is", null);

  if (error) throw error;
  const devices = (data || []) as DeviceLite[];

  // Collect unique IPs
  const ipSet = new Set<string>();
  devices.forEach((d) => {
    const ip = d.public_ip?.trim();
    if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) ipSet.add(ip);
  });

  // Resolve IPs (use cache first)
  const cache = loadCache();
  const uniqueIps = [...ipSet];
  for (const ip of uniqueIps) {
    if (cache[ip]) continue;
    const result = await lookupIp(ip);
    if (result) cache[ip] = result;
    await new Promise((r) => setTimeout(r, 120));
  }
  saveCache(cache);

  // Build GeoPoints
  const byKey = new Map<string, GeoPoint>();
  devices.forEach((d) => {
    const ip = d.public_ip?.trim();
    if (!ip) return;
    const entry = cache[ip];
    if (!entry) return;
    const key = `${entry.lat.toFixed(2)}_${entry.lon.toFixed(2)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.devices.push(d);
    } else {
      byKey.set(key, { ip, lat: entry.lat, lon: entry.lon, country: entry.country, city: entry.city, devices: [d] });
    }
  });

  return { devices, points: [...byKey.values()] };
}

export function DeviceGeoMap() {
  const tenantId = useTenant().data?.tenantId;

  const { data, isLoading } = useQuery({
    queryKey: ["geo_map_devices", tenantId],
    enabled: !!tenantId,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: () => fetchDevicesAndResolve(tenantId!),
  });

  const points = data?.points ?? [];
  const devices = data?.devices ?? [];

  const uniqueIpCount = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => {
      const ip = d.public_ip?.trim();
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) set.add(ip);
    });
    return set.size;
  }, [devices]);

  const totalLocated = points.reduce((s, p) => s + p.devices.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-primary" />
          {totalLocated} device{totalLocated === 1 ? "" : "s"} mapped across {points.length} location{points.length === 1 ? "" : "s"}
        </span>
        {isLoading && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> resolving IPs…
          </span>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130 }}
          style={{ width: "100%", height: "320px" }}
        >
          <ZoomableGroup center={[0, 20]} zoom={1}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--border))"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "hsl(var(--accent))" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {points.map((p) => {
              const onlineCount = p.devices.filter((d) => d.status === "Online").length;
              const isOnline = onlineCount > 0;
              const radius = Math.min(10, 3 + Math.log2(p.devices.length + 1) * 2);
              const color = isOnline ? "hsl(var(--success))" : "hsl(var(--destructive))";
              return (
                <Marker key={`${p.lat}-${p.lon}`} coordinates={[p.lon, p.lat]}>
                  <title>
                    {[p.city, p.country].filter(Boolean).join(", ") || p.ip} — {p.devices.length} device
                    {p.devices.length === 1 ? "" : "s"} ({onlineCount} online)
                  </title>
                  <circle r={radius} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={1.2} />
                  <circle r={Math.max(2, radius / 3)} fill={color} />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {uniqueIpCount === 0 && !isLoading && (
        <p className="text-[11px] text-muted-foreground italic">
          No public IPs reported yet — devices need to send a heartbeat with public_ip.
        </p>
      )}
    </div>
  );
}
