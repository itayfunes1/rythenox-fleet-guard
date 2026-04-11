import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Rocket, Loader2, Check, AlertCircle } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DeploymentCenter() {
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const SUPABASE_URL = "https://prodlnwtjkomsstrufqr.supabase.co";

  const handleBuild = async () => {
    if (!tenant?.apiKey) return;
    setIsBuilding(true);
    setBuildId(null);
    setProgress(0);

    const { data, error } = await supabase.functions.invoke("generate-build", {
      body: { api_key: tenant.apiKey },
    });

    if (error) {
      setIsBuilding(false);
      toast({ title: "Build Error", description: error.message, variant: "destructive" });
      return;
    }

    setBuildId(data.buildId);

    // 40 second timer to match GitHub Action duration
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBuilding(false);
          return 100;
        }
        return prev + 2.5;
      });
    }, 1000);
  };

  const triggerDownload = async () => {
    if (!buildId) return;

    const downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/builds/${buildId}.exe`;

    try {
      setIsDownloading(true);

      const fileName = `rythenox-agent-${buildId.slice(0, 5)}.exe`;
      const windowWithPicker = window as Window & {
        showSaveFilePicker?: (options?: unknown) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      };

      const fileHandle = windowWithPicker.showSaveFilePicker
        ? await windowWithPicker.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "Windows executable",
                accept: { "application/octet-stream": [".exe"] },
              },
            ],
          })
        : null;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

      const blob = await response.blob();

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        link.remove();
      }, 1000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast({
        title: "Download Error",
        description: error instanceof Error ? error.message : "Unable to download the build.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Deployment Center</h1>
      <div className="max-w-md p-6 border rounded-xl bg-card shadow-sm">
        <h3 className="text-lg font-medium mb-4">Provision Custom Agent</h3>

        {!buildId ? (
          <Button onClick={handleBuild} disabled={isBuilding} className="w-full">
            {isBuilding ? <Loader2 className="animate-spin mr-2" /> : <Rocket className="mr-2" />}
            Initialize Build
          </Button>
        ) : (
          <div className="space-y-4">
            {isBuilding ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-center text-xs text-muted-foreground">Compiling... {Math.round(progress)}%</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={triggerDownload} disabled={isDownloading} className="w-full bg-green-600 hover:bg-green-700">
                  {isDownloading ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
                  {isDownloading ? "Preparing download..." : "Download agent.exe"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" /> If download doesn't start, check your browser's pop-up blocker.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
