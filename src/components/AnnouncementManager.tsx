import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Trash2, CheckCircle2, Rocket } from "lucide-react";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useToast } from "@/hooks/use-toast";

const TYPE_OPTIONS = [
  { value: "agent_update", label: "Agent update" },
  { value: "maintenance",  label: "Maintenance" },
  { value: "incident",     label: "Incident" },
  { value: "info",         label: "General notice" },
];

export function AnnouncementManager() {
  const { data, isPrivileged, create, resolve, remove } = useAnnouncements();
  const { toast } = useToast();

  const [type, setType] = useState("agent_update");
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  if (!isPrivileged) return null;

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required.", variant: "destructive" });
      return;
    }
    if (type === "agent_update" && !version.trim()) {
      toast({ title: "Version required", description: "Please provide a version number for agent updates.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ title: title.trim(), message: message.trim(), type, version: version.trim() || null });
      toast({ title: "Published", description: "Customers have been notified." });
      setTitle(""); setMessage(""); setVersion("");
    } catch (e: any) {
      toast({ title: "Failed to publish", description: e.message, variant: "destructive" });
    }
  };

  const active = (data || []).filter((a) => a.status === "active");
  const past   = (data || []).filter((a) => a.status !== "active").slice(0, 5);

  return (
    <Card className="glass-card glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          Customer Announcements
        </CardTitle>
        <CardDescription>Publish agent updates and broadcast notices to everyone in your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Version {type === "agent_update" && <span className="text-destructive">*</span>}
            </Label>
            <Input
              placeholder="e.g. v2.4.1"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="font-mono bg-muted/30 border-border/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Title</Label>
          <Input
            placeholder="Agent update available"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-muted/30 border-border/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Release notes / details</Label>
          <Textarea
            placeholder={"What's new in this release:\n• Improved heartbeat reliability\n• Reduced memory footprint\n• Bug fixes"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="bg-muted/30 border-border/50 font-mono text-xs"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={create.isPending} className="bg-primary hover:bg-primary/90">
            <Rocket className="h-3.5 w-3.5 mr-2" />
            {create.isPending ? "Publishing…" : "Publish & Notify Customers"}
          </Button>
        </div>

        {(active.length > 0 || past.length > 0) && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Active announcements</p>
            {active.length === 0 && <p className="text-xs text-muted-foreground">None active.</p>}
            {active.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{a.type.replace("_", " ")}</Badge>
                    {a.version && <Badge variant="outline" className="text-[10px] font-mono">{a.version}</Badge>}
                    <span className="text-sm font-semibold truncate">{a.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{a.message}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Mark resolved" onClick={() => resolve.mutate(a.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => remove.mutate(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {past.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold pt-2">Recent history</p>
                {past.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
                    {a.version && <Badge variant="outline" className="text-[10px] font-mono">{a.version}</Badge>}
                    <span className="truncate">{a.title}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto text-destructive hover:text-destructive" onClick={() => remove.mutate(a.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
