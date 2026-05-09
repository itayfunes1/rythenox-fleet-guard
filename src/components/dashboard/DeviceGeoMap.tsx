import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Loader2, MapPin, Maximize2, Terminal, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useQuery } from "@tanstack/react-query";
import { useDevices, type ManagedDevice } from "@/hooks/use-devices";
import { useTerminals } from "@/components/TerminalContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";

interface GeoPoint {
  ip: string;
  lat: number;
  lon: number;
  country?: string;
  city?: string;
  devices: ManagedDevice[];
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

async function lookupIps(ips: string[]): Promise<Record<string, CacheEntry>> {
  if (ips.length === 0) return {};
  try {
    const { data, error } = await supabase.functions.invoke("geo-lookup", { body: { ips } });
    if (error) throw error;
    return (data?.results || {}) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

async function resolveIps(ips: string[]): Promise<Cache> {
  const cache = loadCache();
  const missing = ips.filter((ip) => !cache[ip]);
  if (missing.length > 0) {
    const resolved = await lookupIps(missing);
    Object.entries(resolved).forEach(([ip, entry]) => {
      cache[ip] = entry;
    });
    saveCache(cache);
  }
  return cache;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MapView({
  points,
  height,
  onDeviceClick,
}: {
  points: GeoPoint[];
  height: string;
  onDeviceClick: (device: ManagedDevice) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 130 }}
      style={{ width: "100%", height }}
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
          const onlineDevices = p.devices.filter((d) => d.status === "Online");
          const onlineCount = onlineDevices.length;
          const isOnline = onlineCount > 0;
          const radius = Math.min(12, 4 + Math.log2(p.devices.length + 1) * 2);
          const color = isOnline ? "hsl(var(--success))" : "hsl(var(--destructive))";
          const key = `${p.lat}-${p.lon}`;
          const label = [p.city, p.country].filter(Boolean).join(", ") || p.ip;
          const clickable = isOnline;

          return (
            <Marker key={key} coordinates={[p.lon, p.lat]}>
              <Popover
                open={openKey === key}
                onOpenChange={(o) => setOpenKey(o ? key : null)}
              >
                <PopoverTrigger asChild>
                  <g
                    style={{ cursor: clickable ? "pointer" : "default" }}
                    onClick={(e) => {
                      if (!clickable) return;
                      e.stopPropagation();
                      if (onlineDevices.length === 1) {
                        onDeviceClick(onlineDevices[0]);
                      } else {
                        setOpenKey(key);
                      }
                    }}
                  >
                    <title>
                      {label} — {p.devices.length} device{p.devices.length === 1 ? "" : "s"} ({onlineCount} online)
                      {clickable ? " · click to open terminal" : ""}
                    </title>
                    {isOnline && (
                      <circle
                        r={radius + 4}
                        fill={color}
                        fillOpacity={0.15}
                        className="animate-pulse"
                      />
                    )}
                    <circle r={radius} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={1.2} />
                    <circle r={Math.max(2, radius / 3)} fill={color} />
                  </g>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="center">
                  <div className="px-2 py-1.5 border-b border-border/40 mb-1">
                    <div className="text-xs font-semibold">{label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.devices.length} device{p.devices.length === 1 ? "" : "s"} · {onlineCount} online
                    </div>
                  </div>
                  <div className="max-h-56 overflow-auto space-y-0.5">
                    {p.devices.map((d) => {
                      const online = d.status === "Online";
                      return (
                        <button
                          key={d.id}
                          disabled={!online}
                          onClick={() => {
                            setOpenKey(null);
                            onDeviceClick(d);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-mono truncate">{d.nickname || d.target_id}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {formatRelative(d.last_seen)}
                            </div>
                          </div>
                          <StatusBadge status={online ? "online" : "offline"} />
                          {online && <Terminal className="h-3 w-3 text-success shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </Marker>
          );
        })}
      </ZoomableGroup>
    </ComposableMap>
  );
}

export function DeviceGeoMap() {
  const tenantId = useTenant().data?.tenantId;
  const { data: devices = [] } = useDevices(tenantId);
  const { openTerminal } = useTerminals();
  const [maximized, setMaximized] = useState(false);

  const ips = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => {
      const ip = d.public_ip?.trim();
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) set.add(ip);
    });
    return [...set];
  }, [devices]);

  const { data: geoCache, isLoading } = useQuery({
    queryKey: ["geo_cache", ips.sort().join(",")],
    enabled: ips.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => resolveIps(ips),
  });

  const points: GeoPoint[] = useMemo(() => {
    if (!geoCache) return [];
    const byKey = new Map<string, GeoPoint>();
    devices.forEach((d) => {
      const ip = d.public_ip?.trim();
      if (!ip) return;
      const entry = geoCache[ip];
      if (!entry) return;
      const key = `${entry.lat.toFixed(2)}_${entry.lon.toFixed(2)}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.devices.push(d);
      } else {
        byKey.set(key, {
          ip,
          lat: entry.lat,
          lon: entry.lon,
          country: entry.country,
          city: entry.city,
          devices: [d],
        });
      }
    });
    return [...byKey.values()];
  }, [devices, geoCache]);

  const totalLocated = points.reduce((s, p) => s + p.devices.length, 0);

  // Last 24h devices, sorted by recency
  const recentDevices = useMemo(
    () =>
      [...devices].sort(
        (a, b) =>
          new Date(b.last_seen ?? 0).getTime() - new Date(a.last_seen ?? 0).getTime()
      ),
    [devices]
  );

  const handleDeviceClick = (device: ManagedDevice) => {
    openTerminal(device);
    setMaximized(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-primary" />
          {totalLocated} device{totalLocated === 1 ? "" : "s"} mapped across {points.length} location
          {points.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> resolving IPs…
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setMaximized(true)}
          >
            <Maximize2 className="h-3 w-3 mr-1" /> Expand
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
        <MapView points={points} height="320px" onDeviceClick={handleDeviceClick} />
      </div>

      {ips.length === 0 && !isLoading && (
        <p className="text-[11px] text-muted-foreground italic">
          No public IPs reported yet — devices need to send a heartbeat with public_ip.
        </p>
      )}

      <Dialog open={maximized} onOpenChange={setMaximized}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 gap-0 flex flex-col overflow-hidden [&>button.absolute]:hidden">
          <DialogTitle className="sr-only">Device Geo Map</DialogTitle>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-semibold">Global Device Map</div>
                <div className="text-[11px] text-muted-foreground">
                  {totalLocated} located · {points.length} location{points.length === 1 ? "" : "s"} ·
                  click an online marker to open its terminal
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMaximized(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0">
            <div className="bg-muted/20 min-h-0">
              <MapView points={points} height="100%" onDeviceClick={handleDeviceClick} />
            </div>

            <div className="border-l border-border bg-card flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Last 24 hours</div>
                  <div className="text-[11px] text-muted-foreground">
                    {recentDevices.length} device{recentDevices.length === 1 ? "" : "s"} active
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {recentDevices.length === 0 && (
                    <div className="text-xs text-muted-foreground italic p-3">
                      No devices have checked in within the last 24h.
                    </div>
                  )}
                  {recentDevices.map((d) => {
                    const online = d.status === "Online";
                    return (
                      <button
                        key={d.id}
                        disabled={!online}
                        onClick={() => handleDeviceClick(d)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left hover:bg-accent/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-border"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono font-medium truncate">
                            {d.nickname || d.target_id}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {d.public_ip || "no ip"} · {formatRelative(d.last_seen)}
                          </div>
                        </div>
                        <StatusBadge status={online ? "online" : "offline"} />
                        {online && <Terminal className="h-3.5 w-3.5 text-success shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
