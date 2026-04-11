import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Rocket, Loader2, Check } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DeploymentCenter() {
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const SUPABASE_URL = "https://prodlnwtjkomsstrufqr.supabase.co";

  const handleBuild = async () => {
    if (!tenant?.apiKey) return;
    setIsBuilding(true);
    setProgress(0);

    const { data, error } = await supabase.functions.invoke("generate-build", {
      body: { api_key: tenant.apiKey },
    });

    if (error) {
      setIsBuilding(false);
      toast({ title: "Build Error", variant: "destructive" });
      return;
    }

    setBuildId(data.buildId);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBuilding(false);
          return 100;
        }
        return prev + 2.5; // 40 seconds total
      });
    }, 1000);
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
                <p className="text-center text-xs text-muted-foreground">
                  Compiling executable... {Math.round(progress)}%
                </p>
              </div>
            ) : (
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <a href={`${SUPABASE_URL}/storage/v1/object/public/builds/${buildId}.exe`} download>
                  <Download className="mr-2" /> Download agent.exe
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
