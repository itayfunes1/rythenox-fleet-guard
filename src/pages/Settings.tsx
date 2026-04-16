import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, Key, Settings2, Bell, Building2, UserPlus, Check, X, Loader2, Search, Plus } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  useFindTenant, useRequestJoinOrg, usePendingJoinRequests,
  useApproveJoinRequest, useRejectJoinRequest, useMyJoinRequests,
  useCreateOrganization,
} from "@/hooks/use-org-join";
import MembersCard from "@/components/settings/MembersCard";

export default function SettingsPage() {
  const { data: tenant, isLoading } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [orgSearchName, setOrgSearchName] = useState("");
  const [newOrgName, setNewOrgName] = useState("");

  const findTenant = useFindTenant();
  const requestJoin = useRequestJoinOrg();
  const { data: pendingRequests } = usePendingJoinRequests(tenant?.tenantId);
  const { data: myRequests } = useMyJoinRequests();
  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();
  const createOrg = useCreateOrganization();

  const isOwnerOrAdmin = tenant?.role === "owner" || tenant?.role === "admin";

  const copyApiKey = () => {
    if (tenant?.apiKey) {
      navigator.clipboard.writeText(tenant.apiKey);
      toast({ title: "Copied", description: "API key copied to clipboard" });
    }
  };

  const handleSearchOrg = () => {
    const name = orgSearchName.trim();
    if (!name) return;
    findTenant.mutate(name);
  };

  const handleRequestJoin = (targetTenantId: string) => {
    if (!user) return;
    requestJoin.mutate(
      { requester_id: user.id, requester_email: user.email || "unknown", target_tenant_id: targetTenantId },
      {
        onSuccess: () => {
          toast({ title: "Request sent", description: "The organization owner will review your request." });
          setOrgSearchName("");
          findTenant.reset();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleApprove = (requestId: string) => {
    approveRequest.mutate(requestId, {
      onSuccess: () => toast({ title: "Approved", description: "Member has been added to your organization." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleReject = (requestId: string) => {
    rejectRequest.mutate(requestId, {
      onSuccess: () => toast({ title: "Rejected", description: "Join request has been rejected." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const foundTenants = findTenant.data || [];
  const pendingMyRequests = (myRequests || []).filter((r) => r.status === "pending");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage portal preferences and notifications</p>
      </div>

      {/* API Key Section */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            VPS API Configuration
          </CardTitle>
          <CardDescription>Use this API key to authenticate your Go VPS agents</CardDescription>
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
                <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={showKey ? (tenant.apiKey || "") : "••••••••••••••••••••••••••••••••"}
                    readOnly
                    className="font-mono bg-muted/30 border-border/50 text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} className="border-border/50 hover:border-primary/50 transition-colors shrink-0">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={copyApiKey} className="border-border/50 hover:border-primary/50 hover:text-primary transition-colors shrink-0">
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

      {/* Members Management (Owner/Admin only) */}
      {isOwnerOrAdmin && tenant && (
        <MembersCard tenantId={tenant.tenantId} currentUserId={user?.id} />
      )}

      {/* Create Organization Section */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            Create Organization
          </CardTitle>
          <CardDescription>Create a new organization. You will become the owner and leave your current organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New organization name..."
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newOrgName.trim() && createOrg.mutate(newOrgName.trim(), {
                onSuccess: () => {
                  toast({ title: "Created", description: "Your new organization has been created." });
                  setNewOrgName("");
                },
                onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
              })}
              className="bg-muted/30 border-border/50 focus:border-primary"
            />
            <Button
              onClick={() => createOrg.mutate(newOrgName.trim(), {
                onSuccess: () => {
                  toast({ title: "Created", description: "Your new organization has been created." });
                  setNewOrgName("");
                },
                onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
              })}
              disabled={createOrg.isPending || !newOrgName.trim()}
              className="shrink-0"
            >
              {createOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Create
            </Button>
          </div>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Note:</strong> Creating a new organization will remove you from your current one. All your devices and data will remain with your previous organization.</p>
          </div>
        </CardContent>
      </Card>

      {/* Join Organization Section */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Join Organization
          </CardTitle>
          <CardDescription>Search for an organization by name and request to join. The owner must approve your request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter organization name..."
              value={orgSearchName}
              onChange={(e) => setOrgSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchOrg()}
              className="bg-muted/30 border-border/50 focus:border-primary"
            />
            <Button
              variant="outline"
              onClick={handleSearchOrg}
              disabled={findTenant.isPending || !orgSearchName.trim()}
              className="shrink-0"
            >
              {findTenant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Search results */}
          {foundTenants.length > 0 && (
            <div className="space-y-2">
              {foundTenants
                .filter((t) => t.id !== tenant?.tenantId)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.id.slice(0, 8)}...</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRequestJoin(t.id)}
                      disabled={requestJoin.isPending}
                    >
                      {requestJoin.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3 mr-1" />}
                      Request
                    </Button>
                  </div>
                ))}
              {foundTenants.filter((t) => t.id !== tenant?.tenantId).length === 0 && (
                <p className="text-sm text-muted-foreground">No other organizations found with that name.</p>
              )}
            </div>
          )}

          {findTenant.isSuccess && foundTenants.length === 0 && (
            <p className="text-sm text-muted-foreground">No organization found with that name.</p>
          )}

          {/* My pending requests */}
          {pendingMyRequests.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Your Pending Requests</p>
              {pendingMyRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border border-border/30 bg-muted/10">
                  <span className="text-sm text-muted-foreground">{r.target_tenant_id.slice(0, 12)}...</span>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Join Requests (Owner/Admin only) */}
      {isOwnerOrAdmin && pendingRequests && pendingRequests.length > 0 && (
        <Card className="glass-card glow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-warning" />
              </div>
              Pending Join Requests
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 ml-auto">{pendingRequests.length}</Badge>
            </CardTitle>
            <CardDescription>Members requesting to join your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20">
                <div>
                  <p className="text-sm font-medium text-foreground">{req.requester_email}</p>
                  <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-success/30 text-success hover:bg-success/10"
                    onClick={() => handleApprove(req.id)}
                    disabled={approveRequest.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(req.id)}
                    disabled={rejectRequest.isPending}
                  >
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
