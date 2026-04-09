import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, EyeOff, Key } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: tenant, isLoading } = useTenant();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);

  const copyApiKey = () => {
    if (tenant?.apiKey) {
      navigator.clipboard.writeText(tenant.apiKey);
      toast({ title: "Copied", description: "API key copied to clipboard" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage portal preferences and notifications</p>
      </div>

      {/* API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" /> VPS API Configuration
          </CardTitle>
          <CardDescription>Use this API key to authenticate your Go VPS agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tenant ? (
            <>
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Input value={tenant.tenantName || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={showKey ? (tenant.apiKey || "") : "••••••••••••••••••••••••••••••••"}
                    readOnly
                    className="font-mono bg-muted"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
                <p><strong>Usage:</strong> Set the <code className="bg-background px-1 rounded">x-api-key</code> header in your Go VPS requests to authenticate with the edge functions.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in and join a tenant to view your API key.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Portal and organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input defaultValue={tenant?.tenantName || "Acme Corporation"} />
          </div>
          <div className="space-y-2">
            <Label>Default Check-in Interval</Label>
            <Select defaultValue="5">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure alert preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-normal">Device offline alerts</Label>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="font-normal">Failed update notifications</Label>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="font-normal">Remote session audit emails</Label>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Button>Save Settings</Button>
    </div>
  );
}
