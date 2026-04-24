import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Copy, Eye, EyeOff, Key, Search, Settings2, UserPlus, X, Bell } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { useJoinRequests, useOrganizationMutations, useOrganizationSearch } from "@/hooks/use-organization";
export default function SettingsPage() {
  const { data: tenant, isLoading } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const canManageOrganization = !!tenant?.canManageOrganization;
  const organizationSearch = useOrganizationSearch(searchText);
  const joinRequests = useJoinRequests(tenant?.tenantId, canManageOrganization);
  const { createOrganization, requestJoin, approveJoinRequest, rejectJoinRequest } = useOrganizationMutations();

  const copyApiKey = () => {
    if (tenant?.apiKey) {
      navigator.clipboard.writeText(tenant.apiKey);
      toast({ title: "Copied", description: "Organization API key copied to clipboard" });
    }
  };

  const handleCreateOrganization = async () => {
    try {
      await createOrganization.mutateAsync(orgName);
      setOrgName("");
      toast({ title: "Organization created", description: "Your workspace switched to the new organization." });
    } catch (error: any) {
      toast({ title: "Organization not created", description: error.message, variant: "destructive" });
    }
  };

  const handleRequestJoin = async (tenantId: string, name: string) => {
    try {
      await requestJoin.mutateAsync({ tenantId, message: joinMessage });
      setJoinMessage("");
      toast({ title: "Request sent", description: `An admin at ${name} can now approve your access.` });
    } catch (error: any) {
      toast({ title: "Request not sent", description: error.message, variant: "destructive" });
    }
  };

  const handleReviewRequest = async (requestId: string, approve: boolean) => {
    try {
      if (approve) await approveJoinRequest.mutateAsync(requestId);
      else await rejectJoinRequest.mutateAsync(requestId);
      toast({ title: approve ? "Request approved" : "Request rejected" });
    } catch (error: any) {
      toast({ title: "Request update failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage portal preferences and notifications</p>
      </div>

      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Organization
          </CardTitle>
          <CardDescription>Create a shared workspace or request access to an existing organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Current org</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{tenant?.tenantName || "No organization"}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Your role</p>
              <p className="mt-1 text-sm font-semibold capitalize text-foreground">{tenant?.role || "—"}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Members</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{tenant?.memberCount || 0}</p>
            </div>
          </div>

          <Separator className="bg-border/30" />

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Create organization</Label>
            <div className="flex gap-2">
              <Input value={orgName} onChange={(event) => setOrgName(event.target.value)} placeholder="Rythenox" className="bg-muted/30 border-border/50" />
              <Button onClick={handleCreateOrganization} disabled={orgName.trim().length < 2 || createOrganization.isPending} className="shrink-0">
                Create
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Find organization</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by company name" className="bg-muted/30 border-border/50 pl-9" />
            </div>
            <Input value={joinMessage} onChange={(event) => setJoinMessage(event.target.value)} placeholder="Optional message to the admin" className="bg-muted/30 border-border/50" />
            <div className="space-y-2">
              {(organizationSearch.data || []).map((org) => (
                <div key={org.tenant_id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.member_count} member{org.member_count === 1 ? "" : "s"}</p>
                  </div>
                  {org.tenant_id === tenant?.tenantId ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : org.has_pending_request ? (
                    <Badge variant="outline">Pending</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleRequestJoin(org.tenant_id, org.name)} disabled={requestJoin.isPending} className="shrink-0">
                      <UserPlus className="mr-2 h-4 w-4" /> Request
                    </Button>
                  )}
                </div>
              ))}
              {searchText.trim().length >= 2 && !organizationSearch.isLoading && organizationSearch.data?.length === 0 ? (
                <p className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">No organizations found.</p>
              ) : null}
            </div>
          </div>

          {canManageOrganization ? (
            <div className="space-y-3">
              <Separator className="bg-border/30" />
              <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Pending access requests</Label>
              <div className="space-y-2">
                {(joinRequests.data || []).map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{request.requester_email}</p>
                      {request.message ? <p className="text-xs text-muted-foreground">{request.message}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="icon" variant="outline" onClick={() => handleReviewRequest(request.id, false)} disabled={rejectJoinRequest.isPending}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={() => handleReviewRequest(request.id, true)} disabled={approveJoinRequest.isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!joinRequests.isLoading && joinRequests.data?.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* API Key Section */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            Organization API Configuration
          </CardTitle>
          <CardDescription>Owners and admins can copy the shared organization API key for Go VPS agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-10 rounded-lg bg-muted/30 shimmer" />
              <div className="h-10 rounded-lg bg-muted/30 shimmer" />
            </div>
          ) : tenant ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Organization API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={tenant.apiKey ? (showKey ? tenant.apiKey : "••••••••••••••••••••••••••••••••") : "Managed by your organization admin"}
                    readOnly
                    className="font-mono bg-muted/30 border-border/50 text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} disabled={!tenant.apiKey} className="border-border/50 hover:border-primary/50 transition-colors shrink-0">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={copyApiKey} disabled={!tenant.apiKey} className="border-border/50 hover:border-primary/50 hover:text-primary transition-colors shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p><strong className="text-foreground">Usage:</strong> Set the <code className="bg-background/80 px-1.5 py-0.5 rounded text-primary font-mono">x-api-key</code> header in your Go VPS requests to authenticate with the edge functions.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in and join a tenant to view your API key.</p>
          )}
        </CardContent>
      </Card>

      <AnnouncementManager />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </div>
            General
          </CardTitle>
          <CardDescription>Portal and organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Organization Name</Label>
            <Input defaultValue={tenant?.tenantName || "Acme Corporation"} className="bg-muted/30 border-border/50 focus:border-primary transition-colors" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Default Check-in Interval</Label>
            <Select defaultValue="5">
              <SelectTrigger className="bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
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

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            Notifications
          </CardTitle>
          <CardDescription>Configure alert preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <Label className="font-normal text-sm">Device offline alerts</Label>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-border/30" />
          <div className="flex items-center justify-between py-1">
            <Label className="font-normal text-sm">Failed update notifications</Label>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-border/30" />
          <div className="flex items-center justify-between py-1">
            <Label className="font-normal text-sm">Remote session audit emails</Label>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Button className="bg-primary hover:bg-primary/90 transition-colors">
        Save Settings
      </Button>
    </div>
  );
}
