import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Monitor, MonitorPlus, CheckCircle2, XCircle, Package, Users, Megaphone } from "lucide-react";
import { useNotificationPreferences, type NotificationCategory } from "@/hooks/use-notification-preferences";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: Array<{
  key: NotificationCategory;
  title: string;
  description: string;
  icon: typeof Bell;
}> = [
  { key: "device_offline", title: "Device went offline", description: "When a managed device stops responding.", icon: Monitor },
  { key: "device_enrolled", title: "New device enrolled", description: "When a new agent connects for the first time.", icon: MonitorPlus },
  { key: "task_completed", title: "Task completed", description: "When a remote task finishes successfully.", icon: CheckCircle2 },
  { key: "task_failed", title: "Task failed", description: "When a remote task fails to execute.", icon: XCircle },
  { key: "build_finished", title: "Build finished", description: "When your agent build is ready or fails.", icon: Package },
  { key: "org_requests", title: "Organization requests", description: "Join requests, approvals, and rejections.", icon: Users },
  { key: "announcements", title: "Announcements", description: "Server announcements and platform updates.", icon: Megaphone },
];

export function NotificationPreferencesCard() {
  const { preferences, update } = useNotificationPreferences();
  const { toast } = useToast();

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    update.mutate({ [key]: value } as Partial<typeof preferences>, {
      onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription className="text-xs">Choose which events alert you and how.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/40">
          <div className="space-y-0.5">
            <Label htmlFor="toast_enabled" className="text-sm font-medium">Show in-app toasts</Label>
            <p className="text-xs text-muted-foreground">Pop up a toast when a new notification arrives.</p>
          </div>
          <Switch
            id="toast_enabled"
            checked={preferences.toast_enabled}
            onCheckedChange={(v) => handleToggle("toast_enabled", v)}
          />
        </div>

        <Separator />

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Categories</p>
          {CATEGORIES.map(({ key, title, description, icon: Icon }) => (
            <div key={key} className="flex items-start justify-between gap-4 py-2.5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{title}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                id={key}
                checked={preferences[key]}
                onCheckedChange={(v) => handleToggle(key, v)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
