import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Rocket, Loader2, Check, AlertCircle } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function DeploymentCenter() {
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const storageBaseUrl = `${import.meta.env.VITE_SUPABASE_URL ?? "https://prodlnwtjkomsstrufqr.supabase.co"}/storage/v1/object/public/builds`;

  const getBuildDownloadUrl = (id: string) => `${storageBaseUrl}/${id}.exe`;

  const waitForBuildArtifact = async (id: string) => {
    const url = getBuildDownloadUrl(id);

    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (response.ok) {
          return url;
        }
      } catch {
        // Keep polling until the artifact is uploaded.
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
      if (!data?.buildId) {
        throw new Error("The build started, but no build ID was returned.");
      }

      setBuildId(data.buildId);

      const readyUrl = await waitForBuildArtifact(data.buildId);
      if (!readyUrl) {
        throw new Error("The build was triggered, but the executable never became available for download.");
      }

      setDownloadUrl(readyUrl);
      setProgress(100);
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

  const triggerDownload = async () => {
    if (!downloadUrl) return;

    setIsDownloading(true);

    try {
      const response = await fetch(downloadUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to fetch the generated executable.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "agent.exe";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);

      toast({
        title: "Download Started",
        description: "agent.exe has been sent to your browser.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Deployment Center</h1>
      <div className="max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">Provision Custom Agent</h3>

        {!buildId ? (
          <Button onClick={handleBuild} disabled={isBuilding} className="w-full">
            {isBuilding ? <Loader2 className="mr-2 animate-spin" /> : <Rocket className="mr-2" />}
            Initialize Build
          </Button>
        ) : (
          <div className="space-y-4">
            {isBuilding ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-center text-xs text-muted-foreground">
                  Preparing your executable... {Math.round(progress)}%
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  Build ready: {buildId}.exe
                </div>
                <Button onClick={triggerDownload} disabled={isDownloading} className="w-full">
                  {isDownloading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                  Download agent.exe
                </Button>
                {downloadUrl ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-sm text-primary underline underline-offset-4"
                  >
                    Open direct file link
                  </a>
                ) : null}
                <p className="flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Direct download is used now, so pop-up blocking should no longer interfere.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
