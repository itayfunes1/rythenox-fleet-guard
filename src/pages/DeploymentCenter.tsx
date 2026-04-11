import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Key, Copy, Check, Download, BookOpen, FileJson, Shield, Rocket, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";

export default function DeploymentCenter() {
  const { toast } = useToast();
  const { data: tenant, isLoading: tenantLoading } = useTenant();

  // Build States
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [keyCopied, setKeyCopied] = useState(false);

  const SUPABASE_URL = "https://prodlnwtjkomsstrufqr.supabase.co";

  const handleInitializeBuild = async () => {
    if (!tenant?.apiKey) {
      toast({ title: "Error", description: "No API Key found for this tenant.", variant: "destructive" });
      return;
    }

    setIsBuilding(true);
    setBuildProgress(0);

    try {
      // 1. Call the Edge Function to trigger GitHub Action
      const { data, error } = await supabase.functions.invoke("generate-build", {
        body: { api_key: tenant.apiKey },
      });

      if (error || !data?.buildId) throw new Error(error?.message || "Failed to start build");

      const newBuildId = data.buildId;
      setBuildId(newBuildId);

      // 2. Animate progress bar over 30 seconds
      const duration = 30000;
      const intervalTime = 100;
      const step = (intervalTime / duration) * 100;

      const timer = setInterval(() => {
        setBuildProgress((old) => {
          if (old >= 100) {
            clearInterval(timer);
            setIsBuilding(false);
            toast({ title: "Utility Ready", description: "Your custom agent is now ready for download." });
            return 100;
          }
          return old + step;
        });
      }, intervalTime);
    } catch (err: any) {
      setIsBuilding(false);
      toast({ title: "Build Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCopyKey = () => {
    if (!tenant?.apiKey) return;
    navigator.clipboard.writeText(tenant.apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
    toast({ title: "Access key copied" });
  };

  const maskedKey = tenant?.apiKey
    ? `${tenant.apiKey.slice(0, 8)}${"•".repeat(24)}${tenant.apiKey.slice(-8)}`
    : "Loading...";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Deployment Center</h1>
        <p className="text-sm text-muted-foreground">
          Provision custom synchronization utilities for your organization
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Key & Preview */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4 text-primary" />
                Organizational Access Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-xl terminal-bg p-3 text-xs text-primary font-mono border border-border/20 truncate">
                  {tenantLoading ? "Loading..." : maskedKey}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyKey}>
                  {keyCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-4 w-4 text-muted-foreground" />
                Build Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-xl terminal-bg p-4 text-[10px] text-primary/80 font-mono border border-border/20">
                {JSON.stringify(
                  {
                    tenant_id: tenant?.id,
                    status: isBuilding ? "COMPILING" : buildId ? "READY" : "IDLE",
                    platform: "windows_amd64",
                    obfuscation: "garble-literals-tiny",
                  },
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Right: Setup Wizard */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Setup Wizard
            </CardTitle>
            <CardDescription>Generate and download your unique synchronization binary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  1
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-sm font-medium">Initialize Custom Build</p>
                    <p className="text-xs text-muted-foreground">
                      Request a custom-compiled binary with your credentials embedded.
                    </p>
                  </div>

                  {!buildId ? (
                    <Button
                      onClick={handleInitializeBuild}
                      disabled={isBuilding || tenantLoading}
                      className="w-full sm:w-auto"
                    >
                      {isBuilding ? "Requesting Build..." : "Initialize Build"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="text-success border-success/20 bg-success/5 pointer-events-none"
                    >
                      <Check className="h-4 w-4 mr-2" /> Build Triggered
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Section */}
              {isBuilding && (
                <div className="pl-12 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>GITHUB_ACTIONS_RUNNING</span>
                    <span>{Math.round(buildProgress)}%</span>
                  </div>
                  <Progress value={buildProgress} className="h-1" />
                  <p className="text-[10px] text-primary italic">Note: Compilation takes ~30 seconds...</p>
                </div>
              )}

              {/* Step 2 */}
              <div className={`flex gap-4 transition-opacity ${!buildId || isBuilding ? "opacity-40" : "opacity-100"}`}>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  2
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-sm font-medium">Download Binary</p>
                    <p className="text-xs text-muted-foreground">
                      Once compilation finishes, download your unique `.exe` file.
                    </p>
                  </div>
                  {buildId && !isBuilding && (
                    <Button asChild className="w-full sm:w-auto bg-success hover:bg-success/90">
                      <a href={`${SUPABASE_URL}/storage/v1/object/public/builds/${buildId}.exe`} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download agent.exe
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
