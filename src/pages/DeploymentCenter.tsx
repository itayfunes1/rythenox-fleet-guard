import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Rocket,
  Loader2,
  Check,
  AlertCircle,
  Package,
  ShieldCheck,
  Cpu,
  Zap,
  Terminal,
  FileCode,
  Copy,
  ExternalLink,
  History,
  Clock,
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBuildHistory, type BuildHistoryEntry } from "@/hooks/use-build-history";
import { formatDistanceToNow } from "date-fns";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const BUILD_STAGES = [
  { threshold: 15, label: "Initializing build environment" },
  { threshold: 35, label: "Compiling agent binary" },
  { threshold: 60, label: "Embedding tenant credentials" },
  { threshold: 85, label: "Signing & packaging executable" },
  { threshold: 100, label: "Finalizing artifact" },
];

export default function DeploymentCenter() {
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const { data: history, recordBuild, markBuildReady, markBuildFailed } = useBuildHistory();
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);

  const currentStage = BUILD_STAGES.find((s) => progress <= s.threshold)?.label ?? "Processing";

  const waitForBuildArtifact = async (id: string) => {
    const fileName = `${id}.exe`;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const { data } = await supabase.storage.from("builds").createSignedUrl(fileName, 300);
        if (data?.signedUrl) return data.signedUrl;
      } catch {
        // keep polling
      }
      await wait(3000);
    }
    return null;
  };

  const handleBuild = async () => {
    if (!tenant?.apiKey) {
      toast({ title: "Missing API key", description: "Your tenant API key was not found.", variant: "destructive" });
      return;
    }

    setIsBuilding(true);
    setIsDownloading(false);
    setBuildId(null);
    setDownloadUrl(null);
    setProgress(6);

    const progressInterval = window.setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + 4));
    }, 1500);

    try {
      const { data, error } = await supabase.functions.invoke<{ buildId?: string }>("generate-build", {
        body: { api_key: tenant.apiKey },
      });

      if (error) throw error;
      if (!data?.buildId) throw new Error("The build started, but no build ID was returned.");

      setBuildId(data.buildId);
      await recordBuild(data.buildId);

      const readyUrl = await waitForBuildArtifact(data.buildId);
      if (!readyUrl) {
        await markBuildFailed(data.buildId);
        throw new Error("The build was triggered, but the executable never became available for download.");
      }

      setDownloadUrl(readyUrl);
      setProgress(100);
      await markBuildReady(data.buildId);
      toast({ title: "Build Ready", description: "Your agent executable is ready to download." });
    } catch (error) {
      setBuildId(null);
      setDownloadUrl(null);
      setProgress(0);
      toast({ title: "Build Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      window.clearInterval(progressInterval);
      setIsBuilding(false);
    }
  };

  const downloadById = async (id: string) => {
    setRedownloadingId(id);
    try {
      const { data, error } = await supabase.storage.from("builds").createSignedUrl(`${id}.exe`, 300);
      if (error || !data?.signedUrl) throw new Error("Could not generate a download link for this build.");
      const response = await fetch(data.signedUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to fetch the executable.");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "agent.exe";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      toast({ title: "Download Started", description: "agent.exe has been sent to your browser." });
    } catch (error) {
      toast({ title: "Download Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setRedownloadingId(null);
    }
  };

  const triggerDownload = async () => {
    if (!downloadUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(downloadUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to fetch the generated executable.");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "agent.exe";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      toast({ title: "Download Started", description: "agent.exe has been sent to your browser." });
    } catch (error) {
      toast({ title: "Download Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyBuildId = () => {
    if (!buildId) return;
    navigator.clipboard.writeText(buildId);
    toast({ title: "Copied", description: "Build ID copied to clipboard." });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Deployment Center</h1>
              <p className="text-sm text-muted-foreground">
                Provision and distribute signed agent binaries to your fleet.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Build pipeline online
        </Badge>
      </div>

      {/* Spec strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SpecCard icon={Cpu} label="Architecture" value="x86_64" />
        <SpecCard icon={Package} label="Format" value="Windows .exe" />
        <SpecCard icon={ShieldCheck} label="Signed" value="Tenant key" />
        <SpecCard icon={Zap} label="Avg build time" value="~45 sec" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main build panel */}
        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Custom Agent Build</h3>
            </div>
            {buildId && !isBuilding && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 gap-1">
                <Check className="h-3 w-3" /> Ready
              </Badge>
            )}
            {isBuilding && (
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Building
              </Badge>
            )}
          </div>

          <div className="p-6 space-y-6">
            {!buildId && !isBuilding ? (
              <div className="text-center py-8 space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Rocket className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-semibold">Generate a new agent</h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    A signed Windows executable will be compiled with your tenant credentials embedded.
                    Distribute it to any device you want to manage.
                  </p>
                </div>
                <Button onClick={handleBuild} size="lg" className="gap-2">
                  <Rocket className="h-4 w-4" />
                  Initialize Build
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {isBuilding && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{currentStage}</span>
                        <span className="text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      {BUILD_STAGES.map((stage) => {
                        const done = progress >= stage.threshold;
                        const active =
                          !done && progress >= (BUILD_STAGES[BUILD_STAGES.indexOf(stage) - 1]?.threshold ?? 0);
                        return (
                          <div
                            key={stage.label}
                            className={`flex items-center gap-2.5 text-xs py-1 ${
                              done ? "text-foreground" : active ? "text-primary" : "text-muted-foreground/60"
                            }`}
                          >
                            {done ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : active ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 ml-1" />
                            )}
                            <span>{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {!isBuilding && buildId && (
                  <>
                    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">agent.exe</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          Build artifact
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-background border px-3 py-2 font-mono text-xs">
                        <span className="text-muted-foreground shrink-0">ID:</span>
                        <span className="truncate flex-1">{buildId}</span>
                        <button
                          onClick={copyBuildId}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          aria-label="Copy build ID"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={triggerDownload}
                        disabled={isDownloading}
                        size="lg"
                        className="gap-2"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Download agent.exe
                      </Button>
                      <Button
                        onClick={handleBuild}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        disabled={isBuilding}
                      >
                        <Rocket className="h-4 w-4" />
                        New Build
                      </Button>
                    </div>

                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open direct file link
                      </a>
                    )}

                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        Signed download links expire after 5 minutes. Generate a new build if the link becomes invalid.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Side panel: instructions */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-sm font-semibold">Deployment Guide</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">3 steps to get an agent online</p>
          </div>
          <div className="p-6 space-y-5">
            <Step
              num={1}
              title="Generate"
              desc="Click Initialize Build to compile a signed executable bound to your tenant."
            />
            <Step
              num={2}
              title="Distribute"
              desc="Transfer agent.exe to the target Windows device using your preferred channel."
            />
            <Step
              num={3}
              title="Execute"
              desc="Run the binary once. The device auto-registers and appears in your inventory within seconds."
            />

            <div className="pt-4 border-t space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                System Requirements
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> Windows 10 / 11 (x64)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> Outbound HTTPS (443)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> 50 MB free disk space
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Build History */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Build History</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Last 20 builds</span>
        </div>
        {!history || history.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No builds yet. Initialize your first build above.
          </div>
        ) : (
          <ul className="divide-y">
            {history.map((entry) => (
              <BuildHistoryRow
                key={entry.id}
                entry={entry}
                isDownloading={redownloadingId === entry.build_id}
                onDownload={() => downloadById(entry.build_id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BuildHistoryRow({
  entry,
  isDownloading,
  onDownload,
}: {
  entry: BuildHistoryEntry;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  const statusStyles: Record<string, string> = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    building: "border-primary/30 bg-primary/5 text-primary",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const styles = statusStyles[entry.status] ?? "border-muted bg-muted/30 text-muted-foreground";

  return (
    <li className="px-6 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <FileCode className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">agent.exe</span>
          <Badge variant="outline" className={`gap-1 text-[10px] ${styles}`}>
            {entry.status === "building" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {entry.status === "ready" && <Check className="h-2.5 w-2.5" />}
            {entry.status === "failed" && <AlertCircle className="h-2.5 w-2.5" />}
            {entry.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/70 truncate">{entry.build_id}</span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 shrink-0"
        disabled={entry.status !== "ready" || isDownloading}
        onClick={onDownload}
      >
        {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download
      </Button>
    </li>
  );
}

function SpecCard({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
        {num}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
