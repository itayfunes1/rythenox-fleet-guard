import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Copy, Check } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deployment Center</h1>
        <p className="text-sm text-muted-foreground">Generate and deploy management agent configurations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Configuration</CardTitle>
            <CardDescription>Configure the management agent for deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Agent Type</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard User Agent</SelectItem>
                  <SelectItem value="privileged">Privileged Administrator Agent</SelectItem>
                </SelectContent>
              </Select>
              {agentType === "privileged" && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-md border bg-warning/5 border-warning/20">
                  <Shield className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Privileged agents require <strong>OAuth 2.0 organization-level authentication</strong> before deployment.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Target Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="windows">Windows (GPO / Intune)</SelectItem>
                  <SelectItem value="macos">macOS (MDM / Jamf)</SelectItem>
                  <SelectItem value="linux">Linux (Ansible / Chef)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Features</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="remote" className="text-sm font-normal">Enable Remote Assistance</Label>
                  <Switch id="remote" checked={remoteAssist} onCheckedChange={setRemoteAssist} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="updates" className="text-sm font-normal">Automatic System Updates</Label>
                  <Switch id="updates" checked={autoUpdates} onCheckedChange={setAutoUpdates} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="diag" className="text-sm font-normal">Diagnostic Logging</Label>
                  <Switch id="diag" checked={diagnosticLogging} onCheckedChange={setDiagnosticLogging} />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => setGenerated(true)}>
              Generate Configuration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Deployment Script</CardTitle>
              {generated && (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
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
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline">{agentType === "privileged" ? "Privileged" : "Standard"}</Badge>
                  <Badge variant="outline">{platform}</Badge>
                </div>
                <pre className="rounded-md bg-primary p-4 text-xs text-primary-foreground overflow-x-auto font-mono leading-relaxed">
                  {script}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Configure the agent and click "Generate Configuration"
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
