import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Copy, Check, Rocket, Code2, Download, Key, BookOpen, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";

export default function DeploymentCenter() {
  const [agentType, setAgentType] = useState("standard");
  const [platform, setPlatform] = useState("windows");
  const [remoteAssist, setRemoteAssist] = useState(true);
  const [autoUpdates, setAutoUpdates] = useState(true);
  const [diagnosticLogging, setDiagnosticLogging] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);
  const { toast } = useToast();
  const { data: tenant, isLoading: tenantLoading } = useTenant();

  const SUPABASE_URL = "https://prodlnwtjkomsstrufqr.supabase.co";
  const SYNC_UTILITY_URL = `${SUPABASE_URL}/storage/v1/object/public/builds/sync-utility.exe`;

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

  const handleCopyKey = () => {
    if (!tenant?.apiKey) return;
    navigator.clipboard.writeText(tenant.apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
    toast({ title: "Access key copied to clipboard" });
  };

  const handleCopyConfig = () => {
    if (!tenant?.apiKey) return;
    const config = JSON.stringify({
      api_key: tenant.apiKey,
      supabase_url: SUPABASE_URL,
    }, null, 2);
    navigator.clipboard.writeText(config);
    setConfigCopied(true);
    setTimeout(() => setConfigCopied(false), 2000);
    toast({ title: "Configuration JSON copied to clipboard" });
  };

  const maskedKey = tenant?.apiKey
    ? `${tenant.apiKey.slice(0, 8)}${"•".repeat(24)}${tenant.apiKey.slice(-8)}`
    : "Loading...";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Deployment Center</h1>
        <p className="text-sm text-muted-foreground">Generate configurations and connect local systems to your cloud dashboard</p>
      </div>

      {/* Network Integration Section */}
      <div className="grid lg:grid-cols-2 gap-6 stagger-children">
        {/* Organizational Access Key */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="h-4 w-4 text-primary" />
              </div>
              Organizational Access Key
            </CardTitle>
            <CardDescription>Your unique key for authenticating local system connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl terminal-bg p-3 text-xs text-[hsl(var(--terminal-foreground))] font-mono border border-border/20 truncate">
                {tenantLoading ? "Loading..." : maskedKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyKey}
                disabled={!tenant?.apiKey}
                className="border-border/50 hover:border-primary/50 transition-colors shrink-0"
              >
                {keyCopied ? <Check className="h-3 w-3 mr-1 text-success" /> : <Copy className="h-3 w-3 mr-1" />}
                {keyCopied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl border border-warning/20 bg-warning/5">
              <Shield className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-muted-foreground">
                Keep this key secure. It grants access to your organization's fleet data.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Setup Wizard */}
        <Card className="glass-card lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              Setup Wizard
            </CardTitle>
            <CardDescription>Follow these steps to connect a local system to your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                step: 1,
                title: "Download the synchronization utility",
                description: "Get the latest version of the system sync utility for your platform.",
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/50 hover:border-primary/50 transition-colors"
                    asChild
                  >
                    <a href={SYNC_UTILITY_URL} download>
                      <Download className="h-3 w-3 mr-1" />
                      Download Utility
                    </a>
                  </Button>
                ),
              },
              {
                step: 2,
                title: "Create a configuration file",
                description: (
                  <>
                    Create a file named <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted/50 font-mono">config.json</code> in the same folder as the utility.
                  </>
                ),
              },
              {
                step: 3,
                title: "Generate & paste your config",
                description: "Click below to copy your unique JSON configuration, then paste it into config.json.",
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyConfig}
                    disabled={!tenant?.apiKey}
                    className="border-border/50 hover:border-primary/50 transition-colors"
                  >
                    {configCopied ? <Check className="h-3 w-3 mr-1 text-success" /> : <FileJson className="h-3 w-3 mr-1" />}
                    {configCopied ? "Copied" : "Generate Config"}
                  </Button>
                ),
              },
              {
                step: 4,
                title: "Run the utility",
                description: "Execute the synchronization utility to begin reporting local system metrics to your cloud dashboard.",
              },
            ].map(({ step, title, description, action }) => (
              <div key={step} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{step}</span>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  {action && <div className="pt-1">{action}</div>}
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 rounded-xl border border-border/30 bg-muted/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Note:</strong> This utility is custom-configured with your organization's unique synchronization key for direct dashboard reporting.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Config Preview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <FileJson className="h-4 w-4 text-muted-foreground" />
              </div>
              Configuration Preview
            </CardTitle>
            <CardDescription>Your generated config.json contents</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-xl terminal-bg p-4 text-xs text-[hsl(var(--terminal-foreground))] overflow-x-auto font-mono leading-relaxed border border-border/20">
              {tenant?.apiKey
                ? JSON.stringify({ api_key: tenant.apiKey, supabase_url: SUPABASE_URL }, null, 2)
                : "// Sign in to view your configuration"}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Agent Configuration Section */}
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
