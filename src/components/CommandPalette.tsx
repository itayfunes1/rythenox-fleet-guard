import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Monitor,
  Rocket,
  FolderArchive,
  Network,
  Bell,
  Settings,
  Terminal,
  BookOpen,
  Clock,
  ScrollText,
  Zap,
} from "lucide-react";
import { useDevices } from "@/hooks/use-devices";
import { useTenant } from "@/hooks/use-tenant";
import { useSavedCommands } from "@/hooks/use-saved-commands";
import { usePlaybooks } from "@/hooks/use-playbooks";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Devices", path: "/devices", icon: Monitor },
  { label: "Deployment Center", path: "/deployment", icon: Rocket },
  { label: "Diagnostic Vault", path: "/diagnostics", icon: FolderArchive },
  { label: "Network", path: "/network", icon: Network },
  { label: "Playbooks", path: "/playbooks", icon: BookOpen },
  { label: "Schedules", path: "/schedules", icon: Clock },
  { label: "Audit Log", path: "/audit", icon: ScrollText },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { data: tenant } = useTenant();
  const { data: devices = [] } = useDevices(tenant?.tenantId);
  const { data: savedCommands = [] } = useSavedCommands();
  const { data: playbooks = [] } = usePlaybooks();
  const [, setSearch] = useState("");

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search devices, run commands, jump to pages…" onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.path} onSelect={() => go(item.path)} value={`nav ${item.label}`}>
              <item.icon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {devices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Devices">
              {devices.slice(0, 25).map((d) => (
                <CommandItem
                  key={d.id}
                  value={`device ${d.nickname ?? ""} ${d.target_id} ${d.os_info ?? ""}`}
                  onSelect={() => go(`/devices?target=${encodeURIComponent(d.target_id)}`)}
                >
                  <Terminal className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.nickname ?? d.target_id}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {d.target_id} · {d.status}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {savedCommands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Saved Commands">
              {savedCommands.slice(0, 15).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`cmd ${c.name} ${c.command} ${c.category}`}
                  onSelect={() => go(`/playbooks?run=${c.id}`)}
                >
                  <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{c.command}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {playbooks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Playbooks">
              {playbooks.slice(0, 10).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`playbook ${p.name} ${p.description ?? ""}`}
                  onSelect={() => go(`/playbooks?playbook=${p.id}`)}
                >
                  <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.steps.length} step(s)</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
