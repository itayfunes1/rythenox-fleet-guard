import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, X, Trash2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const SERVICE_TOKENS = [
  { token: "platform", label: "Platform (Web App & API)" },
  { token: "database", label: "Database" },
  { token: "relay", label: "Relay Network" },
  { token: "command_center", label: "Command Center" },
  { token: "realtime", label: "Real-time Events" },
  { token: "build", label: "Build Pipeline" },
];

interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  impact: string;
  affected_services: string[];
  started_at: string;
  resolved_at: string | null;
  created_by: string | null;
}

export default function AdminStatus() {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // New incident form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("minor");
  const [statusVal, setStatusVal] = useState("investigating");
  const [service, setService] = useState("platform");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = "Status Admin — Rythenox";
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const ok = !!data;
      setAuthorized(ok);
      if (ok) await loadAll();
      setLoading(false);
    })();
  }, [user]);

  const loadAll = async () => {
    const [{ data: settings }, { data: inc }] = await Promise.all([
      supabase.from("status_settings").select("notify_emails, email_enabled").eq("id", true).maybeSingle(),
      supabase.from("status_incidents").select("*").order("started_at", { ascending: false }).limit(50),
    ]);
    setEmails(settings?.notify_emails ?? []);
    setEmailEnabled(settings?.email_enabled ?? true);
    setIncidents((inc ?? []) as Incident[]);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("status_settings")
      .update({ notify_emails: emails, email_enabled: emailEnabled, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq("id", true);
    setSavingSettings(false);
    if (error) toast.error(error.message);
    else toast.success("Notification settings saved");
  };

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Enter a valid email");
      return;
    }
    if (emails.includes(e)) return;
    setEmails([...emails, e]);
    setNewEmail("");
  };

  const removeEmail = (e: string) => setEmails(emails.filter((x) => x !== e));

  const createIncident = async () => {
    if (!title.trim()) return toast.error("Title required");
    setCreating(true);
    const { error } = await supabase.from("status_incidents").insert({
      title: title.trim(),
      description: description.trim() || null,
      status: statusVal,
      impact,
      affected_services: [service],
      started_at: new Date().toISOString(),
      created_by: user!.id,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    setTitle(""); setDescription(""); setImpact("minor"); setStatusVal("investigating");
    toast.success("Incident created");
    await loadAll();
  };

  const updateIncident = async (id: string, patch: Partial<Incident>) => {
    const { error } = await supabase.from("status_incidents").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await loadAll();
  };

  const resolveIncident = (id: string) =>
    updateIncident(id, { status: "resolved", resolved_at: new Date().toISOString() });

  const deleteIncident = async (id: string) => {
    const { error } = await supabase.from("status_incidents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Incident deleted");
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Access denied
          </CardTitle>
          <CardDescription>This page is restricted to platform admins.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        eyebrow="Admin"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Status Admin"
        description="Manage incidents and incident email notifications."
      />

      <Card>
        <CardHeader>
          <CardTitle>Notification settings</CardTitle>
          <CardDescription>Recipients receive an email when auto-incidents open, escalate, or resolve.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-enabled">Email alerts enabled</Label>
            <Switch id="email-enabled" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <div>
            <Label className="mb-2 block">Recipients</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {emails.length === 0 && <span className="text-sm text-muted-foreground">No recipients configured.</span>}
              {emails.map((e) => (
                <Badge key={e} variant="secondary" className="gap-1">
                  {e}
                  <button onClick={() => removeEmail(e)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="monitor@rythenox.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
              />
              <Button type="button" variant="outline" onClick={addEmail}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create incident</CardTitle>
          <CardDescription>Manually post an incident to the public status page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief headline" />
            </div>
            <div>
              <Label>Affected service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TOKENS.map((s) => (
                    <SelectItem key={s.token} value={s.token}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact</Label>
              <Select value={impact} onValueChange={setImpact}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor (degraded)</SelectItem>
                  <SelectItem value="major">Major (down)</SelectItem>
                  <SelectItem value="critical">Critical (down)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's happening, what's the impact, what are we doing." rows={3} />
          </div>
          <Button onClick={createIncident} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create incident
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent incidents</CardTitle>
          <CardDescription>Latest 50 incidents.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No incidents yet.</TableCell></TableRow>
              )}
              {incidents.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="max-w-xs">
                    <div className="font-medium truncate">{i.title}</div>
                    {i.created_by === null && <Badge variant="outline" className="mt-1 text-[10px]">Auto</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{(i.affected_services ?? []).join(", ")}</TableCell>
                  <TableCell>
                    <Badge variant={i.impact === "major" || i.impact === "critical" ? "destructive" : "secondary"}>
                      {i.impact}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={i.status}
                      onValueChange={(v) =>
                        updateIncident(i.id, {
                          status: v,
                          resolved_at: v === "resolved" ? new Date().toISOString() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(i.started_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {!i.resolved_at && (
                      <Button size="sm" variant="outline" onClick={() => resolveIncident(i.id)}>Resolve</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteIncident(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
