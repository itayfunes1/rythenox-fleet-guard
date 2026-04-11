import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Copy, Check, Rocket, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DeploymentCenter() {
  const [agentType, setAgentType] = useState("standard");
  const [platform, setPlatform] = useState("windows");
  const [remoteAssist, setRemoteAssist] = useState(true);
  const [autoUpdates, setAutoUpdates] = useState(true);
  const [diagnosticLogging, setDiagnosticLogging] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const script = agentType === "privileged"
    ? `# Rythenox Privileged Administrator Agent
# Requires: OAuth 2.0 Organization Authentication
# Platform: ${platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "Linux"}

$OrgToken = Get-RythenoxOAuthToken -Scope "admin:fleet"
$Config = @{
  AgentType        = "PrivilegedAdmin"
  RemoteAssistance = $${remoteAssist}
  AutoUpdates      = $${autoUpdates}
  DiagnosticLog    = $${diagnosticLogging}
  ComplianceNotify = $true
  DataScope        = @("CPU","RAM","Disk","ScreenShare")
}

Install-RythenoxAgent -Token $OrgToken -Configuration $Config
Register-ManagedDevice -PolicyGroup "Privileged-Fleet"
Enable-ComplianceAudit -Level "Full"`
    : `# Rythenox Standard User Agent
# Platform: ${platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "Linux"}

$Config = @{
  AgentType        = "StandardUser"
  RemoteAssistance = $${remoteAssist}
  AutoUpdates      = $${autoUpdates}
  DiagnosticLog    = $${diagnosticLogging}
  ComplianceNotify = $true
  DataScope        = @("CPU","RAM","Disk")
}

Install-RythenoxAgent -Configuration $Config
Register-ManagedDevice -PolicyGroup "Standard-Fleet"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Deployment Center</h1>
        <p className="text-sm text-muted-foreground">Generate and deploy management agent configurations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 stagger-children">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              Agent Configuration
            </CardTitle>
            <CardDescription>Configure the management agent for deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Agent Type</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger className="bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard User Agent</SelectItem>
                  <SelectItem value="privileged">Privileged Administrator Agent</SelectItem>
                </SelectContent>
              </Select>
              {agentType === "privileged" && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-xl border border-warning/20 bg-warning/5 animate-fade-in">
                  <Shield className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Privileged agents require <strong className="text-foreground">OAuth 2.0 organization-level authentication</strong> before deployment.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Target Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="windows">Windows (GPO / Intune)</SelectItem>
                  <SelectItem value="macos">macOS (MDM / Jamf)</SelectItem>
                  <SelectItem value="linux">Linux (Ansible / Chef)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Features</Label>
              <div className="space-y-3">
                {[
                  { id: "remote", label: "Enable Remote Assistance", checked: remoteAssist, onChange: setRemoteAssist },
                  { id: "updates", label: "Automatic System Updates", checked: autoUpdates, onChange: setAutoUpdates },
                  { id: "diag", label: "Diagnostic Logging", checked: diagnosticLogging, onChange: setDiagnosticLogging },
                ].map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between py-1">
                    <Label htmlFor={feature.id} className="text-sm font-normal">{feature.label}</Label>
                    <Switch id={feature.id} checked={feature.checked} onCheckedChange={feature.onChange} />
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              onClick={() => setGenerated(true)}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Generate Configuration
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                </div>
                Deployment Script
              </CardTitle>
              {generated && (
                <Button variant="outline" size="sm" onClick={handleCopy} className="border-border/50 hover:border-primary/50 transition-colors">
                  {copied ? <Check className="h-3 w-3 mr-1 text-success" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            <CardDescription>
              {generated ? "Deploy via MDM, GPO, or manual execution" : "Configure and generate to see the deployment script"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generated ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px] rounded-full border-primary/20 bg-primary/10 text-primary">{agentType === "privileged" ? "Privileged" : "Standard"}</Badge>
                  <Badge variant="outline" className="text-[10px] rounded-full border-border/50">{platform}</Badge>
                </div>
                <pre className="rounded-xl terminal-bg p-4 text-xs text-[hsl(var(--terminal-foreground))] overflow-x-auto font-mono leading-relaxed border border-border/20">
                  {script}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Code2 className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Configure the agent and click "Generate Configuration"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
