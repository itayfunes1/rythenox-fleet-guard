import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Check, Download, BookOpen, FileJson, Rocket, Code2, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";

export default function DeploymentCenter() {
  const { toast } = useToast();
  const { data: tenant, isLoading: tenantLoading } = useTenant();

  // Build Orchestration States
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [keyCopied, setKeyCopied] = useState(false);

  const SUPABASE_URL = "https://prodlnwtjkomsstrufqr.supabase.co";

  const handleInitializeBuild = async () => {
    if (!tenant?.apiKey) {
      toast({
        title: "Error",
        description: "Organizational Access Key not found. Please ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsBuilding(true);
    setBuildProgress(0);

    try {
      // 1. Invoke the Edge Function to trigger the GitHub Action
      const { data, error } = await supabase.functions.invoke("generate-build", {
        body: { api_key: tenant.apiKey },
      });

      if (error || !data?.buildId) {
        throw new Error(error?.message || "Failed to initiate provisioning server.");
      }

      setBuildId(data.buildId);

      // 2. Animate progress bar over 40 seconds to account for Go build and Storage upload
      const duration = 40000;
      const intervalTime = 100;
      const step = (intervalTime / duration) * 100;

      const timer = setInterval(() => {
        setBuildProgress((old) => {
          if (old >= 100) {
            clearInterval(timer);
            setIsBuilding(false);
            toast({
              title: "Provisioning Complete",
              description: "Your custom synchronization utility is ready for download.",
            });
            return 100;
          }
          return old + step;
        });
      }, intervalTime);
    } catch (err: any) {
      setIsBuilding(false);
      toast({
        title: "Provisioning Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleCopyKey = () => {
    if (!tenant?.apiKey) return;
    navigator.clipboard.writeText(tenant.apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
    toast({ title: "Access key copied to clipboard" });
  };

  const maskedKey = tenant?.apiKey
    ? `${tenant.apiKey.slice(0, 8)}${"•".repeat(24)}${tenant.apiKey.slice(-8)}`
    : "Loading credentials...";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Deployment Center</h1>
        <p className="text-sm text-muted-foreground">
          Provision secure synchronization utilities for your fleet infrastructure.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Access Key Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Key className="h-4 w-4 text-primary" />
                Organizational Access Key
              </CardTitle>
              <CardDescription>Unique identifier for local system authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-xl terminal-bg p-3 text-xs text-primary font-mono border border-border/20 truncate">
                  {tenantLoading ? "Loading..." : maskedKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                  disabled={tenantLoading}
                  className="shrink-0"
                >
                  {keyCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Shield className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-normal">
                  This key is embedded into the utility during provisioning. Keep it secure as it defines your
                  organization's data boundary.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* System Metadata Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                System Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-xl terminal-bg p-4 text-[10px] text-primary/80 font-mono border border-border/20 overflow-x-auto">
                {JSON.stringify(
                  {
                    tenant_id: tenant?.id || "unknown",
                    platform: "windows_x64",
                    status: isBuilding ? "PROVISIONING" : buildId ? "READY" : "IDLE",
                    security_layer: "ldflags-stripped-symbols",
                  },
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Setup Wizard Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-4 w-4 text-primary" />
              Setup Wizard
            </CardTitle>
            <CardDescription>Follow these steps to deploy your local synchronization node</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="relative space-y-8">
              {/* Connector line for the wizard steps */}
              <div className="absolute left-4 top-4 bottom-4 w-px bg-border/40 -z-10" />

              {/* Step 1: Initialize */}
              <div className="flex gap-4 bg-background/50 relative z-10">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary shadow-sm">
                  1
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-sm font-medium">Initialize Secure Build</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Triggers a remote compilation on the Rythenox build server with your unique key embedded directly
                      into the binary.
                    </p>
                  </div>

                  {!buildId ? (
                    <Button
                      onClick={handleInitializeBuild}
                      disabled={isBuilding || tenantLoading}
                      className="w-full sm:w-auto shadow-md"
                    >
                      {isBuilding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Provisioning...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" /> Start Provisioning
                        </>
                      )}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-success border-success/20 bg-success/5 py-1 px-3">
                      <Check className="h-3 w-3 mr-2" /> Server Dispatch Confirmed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Feedback for Step 1 */}
              {isBuilding && (
                <div className="pl-12 space-y-2 animate-in slide-in-from-top-1 duration-300">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    <span>Compiling Node Utility</span>
                    <span>{Math.round(buildProgress)}%</span>
                  </div>
                  <Progress value={buildProgress} className="h-1.5" />
                  <p className="text-[10px] text-primary/70 italic">
                    The build server is currently generating your secure executable. This process usually takes 35-40
                    seconds.
                  </p>
                </div>
              )}

              {/* Step 2: Download */}
              <div
                className={`flex gap-4 transition-all duration-500 ${!buildId || isBuilding ? "opacity-40 grayscale" : "opacity-100"}`}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary shadow-sm">
                  2
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-sm font-medium">Retrieve Synchronization Utility</p>
                    <p className="text-xs text-muted-foreground">
                      Download the finalized binary once compilation is complete.
                    </p>
                  </div>
                  {buildId && !isBuilding && (
                    <Button
                      asChild
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                      <a href={`${SUPABASE_URL}/storage/v1/object/public/builds/${buildId}.exe`} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download agent.exe
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Final Note */}
              <div className="mt-6 p-4 rounded-xl border border-border/40 bg-muted/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Security Note:</strong> This utility is pre-configured with your
                  organizational synchronization key. No additional{" "}
                  <code className="text-[10px] px-1 bg-muted rounded font-mono">config.json</code> is required for
                  deployment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
