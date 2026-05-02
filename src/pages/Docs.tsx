import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Rocket, Monitor, Terminal, BookMarked, Clock, ScrollText,
  Network, FolderArchive, Bell, Settings, Search, Command, Zap, Shield,
  AlertTriangle, CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";

type Section = {
  id: string;
  title: string;
  icon: typeof BookOpen;
  group: string;
  body: React.ReactNode;
  keywords: string;
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
    {children}
  </kbd>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">{children}</code>
);

const Block = ({ children }: { children: React.ReactNode }) => (
  <pre className="rounded-md border border-border bg-muted/60 p-3 text-[12px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
    {children}
  </pre>
);

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
      {n}
    </div>
    <div className="space-y-1.5 pt-0.5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  </div>
);

const Tip = ({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" | "success" }) => {
  const map = {
    info: { Icon: BookOpen, cls: "border-primary/30 bg-primary/5 text-primary" },
    warn: { Icon: AlertTriangle, cls: "border-amber-500/30 bg-amber-500/5 text-amber-700" },
    success: { Icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" },
  } as const;
  const { Icon, cls } = map[variant];
  return (
    <div className={`flex gap-2.5 rounded-md border p-3 text-[13px] ${cls}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="text-foreground/80 [&_strong]:text-foreground">{children}</div>
    </div>
  );
};

const sections: Section[] = [
  {
    id: "getting-started",
    group: "Start Here",
    title: "Getting Started",
    icon: Rocket,
    keywords: "intro overview welcome onboarding first time",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rythenox Marengo is a multi-tenant fleet management platform. Your account belongs to an
          <strong className="text-foreground"> organization</strong>, and every device, command, build, and
          notification is scoped to it. This guide walks you through everything from enrolling your first
          agent to running automated playbooks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { t: "1. Enroll a device", d: "Use the Deployment Center to provision an agent." },
            { t: "2. Run a command", d: "Open the device terminal and dispatch a task." },
            { t: "3. Automate", d: "Save commands, build playbooks, schedule recurring jobs." },
          ].map((x) => (
            <div key={x.t} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{x.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "navigation",
    group: "Start Here",
    title: "Navigating the Dashboard",
    icon: Command,
    keywords: "sidebar layout menu navigation header search shortcut",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The interface has three regions: the <strong className="text-foreground">left sidebar</strong> (navigation),
          the <strong className="text-foreground">top header</strong> (search, notifications, account), and the
          main content area.
        </p>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Sidebar groups</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li><strong className="text-foreground">Management</strong> — Dashboard, Devices, Deployment Center, Diagnostic Vault. (Network is reserved for Rythenox staff and is hidden for customers.)</li>
            <li><strong className="text-foreground">Automation</strong> — AI Assistant, Playbooks, Schedules, Audit Log.</li>
            <li><strong className="text-foreground">System</strong> — Notifications, Documentation, Settings.</li>
          </ul>
        </div>
        <Tip>
          Press <Kbd>⌘K</Kbd> / <Kbd>Ctrl+K</Kbd> anywhere to open the <strong>Command Palette</strong> —
          jump to any page, search devices, or trigger quick actions without lifting your hands off the keyboard.
        </Tip>
      </div>
    ),
  },
  {
    id: "command-palette",
    group: "Start Here",
    title: "Command Palette (⌘K)",
    icon: Search,
    keywords: "ctrl k cmd k search shortcut quick actions",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The fastest way to move around the app. Open it with <Kbd>⌘K</Kbd> or <Kbd>Ctrl+K</Kbd>.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Type a page name to navigate (<Code>devices</Code>, <Code>schedules</Code>, <Code>audit</Code>).</li>
          <li>Type a device nickname or target ID to jump straight to its terminal.</li>
          <li>Use arrow keys to move, <Kbd>Enter</Kbd> to select, <Kbd>Esc</Kbd> to dismiss.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "deployment",
    group: "Agents",
    title: "Enrolling Devices (Deployment Center)",
    icon: Rocket,
    keywords: "agent install enroll provision binary setup wizard build hardcoded api key",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The <strong className="text-foreground">Deployment Center</strong> builds a custom agent binary
          on demand. Your <strong className="text-foreground">tenant API key is injected into the binary
          at build time</strong> by the GitHub Actions runner — there is no <Code>config.json</Code> and
          no separate credential file to manage.
        </p>
        <Step n={1} title="Open Deployment Center">
          Sidebar → <Code>Deployment Center</Code>. Click <strong>Setup Wizard</strong>.
        </Step>
        <Step n={2} title="Trigger a build">
          The wizard dispatches a GitHub Actions workflow that compiles the agent with your tenant API key
          baked into the binary. Build status streams back into the UI.
        </Step>
        <Step n={3} title="Download the agent binary">
          Once the build completes, download the signed artifact from the wizard. The single executable
          contains everything it needs to authenticate — no config files required.
        </Step>
        <Step n={4} title="Run the agent">
          Launch the binary on the target machine. Within ~90 seconds the device appears under{" "}
          <Code>Devices</Code> with status <Badge variant="default" className="text-[10px]">Online</Badge>.
        </Step>
        <Tip variant="warn">
          <strong>Security:</strong> the compiled binary contains your tenant API key — treat it like a
          credential. Never share builds publicly. If a binary leaks, rotate your tenant API key via
          Settings → Organization and re-build.
        </Tip>
      </div>
    ),
  },
  {
    id: "devices",
    group: "Agents",
    title: "Managing Devices",
    icon: Monitor,
    keywords: "fleet inventory online offline heartbeat nickname target",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The <strong className="text-foreground">Devices</strong> page lists every enrolled agent with live
          status, OS, architecture, public IP, and last heartbeat.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Status auto-flips to <Code>Offline</Code> after 90 seconds without a heartbeat.</li>
          <li>The UI refreshes every 30 seconds; use the <strong>Refresh</strong> button to force-sync.</li>
          <li>Click a device to open its <strong>Terminal</strong> drawer.</li>
          <li>Rename a device by editing its <Code>nickname</Code> — useful for grouping by role.</li>
        </ul>
        <Tip>Devices unresponsive for over 24 hours are automatically hidden from the main inventory.</Tip>
      </div>
    ),
  },
  {
    id: "running-commands",
    group: "Agents",
    title: "Running Commands on an Agent",
    icon: Terminal,
    keywords: "terminal task execute shell command run dispatch result",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Every command goes through a queue: you create a task → the agent polls and claims it → it runs →
          the result streams back into the terminal.
        </p>
        <Step n={1} title="Open the device terminal">
          From <Code>Devices</Code>, click any online agent to open the terminal pane.
        </Step>
        <Step n={2} title="Type a command and hit Enter">
          Anything the agent's shell understands. Examples:
          <Block>{`whoami\nhostname\nls -la /var/log\nsystemctl status nginx`}</Block>
        </Step>
        <Step n={3} title="Watch the result stream in">
          Status moves <Code>Pending → Sent → Completed</Code> (or <Code>Failed</Code>). The output appears
          inline with auto-scroll.
        </Step>
        <Tip variant="warn">
          Live remote file system traversal is not supported. Use the <strong>Diagnostic Vault</strong> for
          files an agent has uploaded.
        </Tip>
      </div>
    ),
  },
  {
    id: "ai-assistant",
    group: "Automation",
    title: "AI Command Assistant",
    icon: Sparkles,
    keywords: "ai assistant natural language gpt gemini suggest command llm",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Describe what you want to do in plain English and the assistant generates a safe shell command,
          recommends which online devices to run it on, and flags the risk level.
        </p>
        <Step n={1} title="Open the assistant">
          Sidebar → <Code>AI Assistant</Code> (under Automation), or jump there from <Kbd>⌘K</Kbd>.
        </Step>
        <Step n={2} title="Ask in plain English">
          e.g. <em>"Show disk usage on all Linux boxes"</em> or <em>"Restart the Windows print spooler"</em>.
          Press <Kbd>⌘/Ctrl + Enter</Kbd> to submit.
        </Step>
        <Step n={3} title="Review, edit, and dispatch">
          The assistant returns a single command, a rationale, a risk badge (LOW / MEDIUM / HIGH), and pre-selects
          the recommended online devices. Edit the command, adjust targets, then click <strong>Run</strong>.
        </Step>
        <Tip variant="warn">
          Only <strong>Online</strong> devices are pre-selected. If you manually pick offline devices, the task
          is queued and runs once they reconnect. <strong>HIGH RISK</strong> commands require an extra confirmation.
        </Tip>
      </div>
    ),
  },
  {
    id: "playbooks",
    group: "Automation",
    title: "Saved Commands & Playbooks",
    icon: BookMarked,
    keywords: "playbook saved commands library bulk multi step sequence",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The <Code>Playbooks</Code> page has two tabs: <strong className="text-foreground">Commands</strong>{" "}
          (a library of reusable one-liners) and <strong className="text-foreground">Playbooks</strong>{" "}
          (ordered sequences you fan out across many devices at once).
        </p>
        <Step n={1} title="Save a command">
          Sidebar → <Code>Playbooks</Code> → <strong>Commands</strong> tab → fill in name, optional category,
          and the shell text, then save.
        </Step>
        <Step n={2} title="Build a playbook">
          Switch to the <strong>Playbooks</strong> tab. Add an ordered list of steps — each step is a shell
          command. Steps run sequentially per device.
        </Step>
        <Step n={3} title="Bulk execute">
          Use <strong>Run</strong> on a playbook, pick target devices, and confirm. Each step is dispatched
          as a regular task to every selected device.
        </Step>
        <Tip variant="success">
          Playbooks are great for hardening checklists, log-collection sweeps, or pushing config updates fleet-wide.
        </Tip>
      </div>
    ),
  },
  {
    id: "schedules",
    group: "Automation",
    title: "Scheduled Tasks (Cron)",
    icon: Clock,
    keywords: "schedule cron recurring automation timer interval",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Schedules fire commands on a <strong className="text-foreground">cron expression</strong>. A background
          worker checks every minute and queues matching jobs into the regular task pipeline.
        </p>
        <Step n={1} title="Create a schedule">
          Sidebar → <Code>Schedules</Code> → <strong>New Schedule</strong>. Provide a name, command, cron and
          target devices.
        </Step>
        <Step n={2} title="Pick a cadence">
          Use a preset (Hourly, Daily 09:00…) or write a 5-field cron:
          <Block>{`# minute hour day-of-month month day-of-week (UTC)\n*/15 * * * *   # every 15 min\n0    9 * * 1-5  # weekdays 09:00\n0    0 1 * *    # 1st of every month`}</Block>
        </Step>
        <Step n={3} title="Toggle to enable">
          Use the switch on each card to pause/resume. <Code>last_run_at</Code> is shown for diagnostics.
        </Step>
        <Tip>
          All cron times are evaluated in <strong>UTC</strong>. Convert from your local zone before saving.
        </Tip>
      </div>
    ),
  },
  {
    id: "audit",
    group: "Automation",
    title: "Audit Log",
    icon: ScrollText,
    keywords: "audit history log who did what compliance security trail",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          An immutable timeline of every important action in your tenant — task created, build generated,
          announcement posted, and more. Use it for compliance reviews and incident forensics.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Filter by action type, actor email, or entity ID.</li>
          <li>Each row shows the actor, timestamp, and a JSON metadata blob with context.</li>
          <li>Entries cannot be edited or deleted — only system triggers append.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "diagnostics",
    group: "Operations",
    title: "Diagnostic Vault (File Explorer)",
    icon: FolderArchive,
    keywords: "files vault diagnostics download upload artifacts",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Files agents upload (logs, dumps, screenshots, captures) appear here in a two-panel explorer:
          categories on the left, file list on the right.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Filter by category or device target ID.</li>
          <li>Click a file to preview or download via signed URL.</li>
          <li>Files are tenant-scoped — other organizations cannot see them.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "network",
    group: "Operations",
    title: "Network Infrastructure",
    icon: Network,
    keywords: "relay nodes infrastructure throughput uptime telemetry",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Real-time telemetry for the relay nodes that bridge the web app and your remote agents. Monitors
          throughput, client count, uptime, and last-seen heartbeats.
        </p>
        <Tip variant="warn">
          This page is restricted to a designated Rythenox monitoring account and is hidden from the sidebar
          for everyone else, including customer organization owners.
        </Tip>
      </div>
    ),
  },
  {
    id: "notifications",
    group: "Operations",
    title: "Notifications & Preferences",
    icon: Bell,
    keywords: "alerts notifications email toast preferences settings",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The bell icon in the header shows real-time alerts: device offline, task failed, build ready,
          new join request, announcements.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Click any notification to mark it read and jump to the related entity.</li>
          <li>Tweak which categories produce alerts under <Code>Settings → Notifications</Code>.</li>
          <li>Disable toast pop-ups while keeping the inbox active.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "organization",
    group: "Account",
    title: "Organization & Members",
    icon: Shield,
    keywords: "organization team members invite role owner admin tenant",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Each user belongs to an organization with one of three roles:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li><strong className="text-foreground">Owner</strong> — full control: members, API key, organization settings.</li>
          <li><strong className="text-foreground">Admin</strong> — manage members, approve join requests, view the API key, post announcements.</li>
          <li><strong className="text-foreground">Member</strong> — operate devices, run commands, build playbooks.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          New accounts start in their own private workspace. From <Code>Settings</Code> you can either create a
          shared organization or search for an existing one and request to join — owners/admins approve the request.
        </p>
      </div>
    ),
  },
  {
    id: "settings",
    group: "Account",
    title: "Settings",
    icon: Settings,
    keywords: "settings account organization api key preferences notifications",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The <Code>Settings</Code> page is a single scrollable view with three sections:
          <strong> Organization</strong> (create / join / manage members),
          <strong> Organization API Configuration</strong> (the shared agent API key — visible to owners and admins),
          and <strong> Notification Preferences</strong>.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Owners and admins can reveal and copy the organization API key — it is baked into agent binaries at build time by the Deployment Center.</li>
          <li>Approve or reject pending join requests from prospective members.</li>
          <li>Toggle which notification categories produce alerts.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    group: "Help",
    title: "Troubleshooting",
    icon: AlertTriangle,
    keywords: "troubleshoot problems issues offline failed help fix",
    body: (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Device shows as Offline</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mt-1">
            <li>Confirm the agent process is running on the host.</li>
            <li>Verify outbound HTTPS to the relay endpoint is allowed by the firewall.</li>
            <li>If the tenant API key was rotated, re-build and redeploy the agent — the key is hardcoded into the binary.</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Task stuck in Pending</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mt-1">
            <li>The agent is offline or hasn't polled yet — wait one polling cycle.</li>
            <li>If status sits at <Code>Sent</Code> indefinitely, the command may be hanging — restart the agent.</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Schedule didn't fire</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mt-1">
            <li>Make sure the toggle is enabled and the cron expression is in UTC.</li>
            <li>At least one selected target device must be online at trigger time.</li>
          </ul>
        </div>
      </div>
    ),
  },
];

const groupOrder = ["Start Here", "Agents", "Automation", "Operations", "Account", "Help"];

export default function Docs() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("getting-started");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const m = new Map<string, Section[]>();
    for (const s of filtered) {
      if (!m.has(s.group)) m.set(s.group, []);
      m.get(s.group)!.push(s);
    }
    return groupOrder.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
  }, [filtered]);

  // Scroll-spy: highlight TOC entry for the section currently nearest the top
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-section-id");
          if (id) setActive(id);
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: [0, 1] },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  const handleJump = (id: string) => {
    setActive(id);
    const el = sectionRefs.current[id];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Documentation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you need to operate Rythenox Marengo — onboarding, agents, automation, and troubleshooting.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Zap className="h-3 w-3" /> v1.0
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-3 pr-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              className="pl-8 h-9 text-sm"
            />
          </div>
          <nav className="space-y-4">
            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">No matches.</p>
            )}
            {grouped.map(([group, items]) => (
              <div key={group}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 px-2">
                  {group}
                </p>
                <ul className="space-y-0.5 border-l border-border/60">
                  {items.map((s) => {
                    const Icon = s.icon;
                    const isActive = s.id === active;
                    return (
                      <li key={s.id} className="relative">
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" aria-hidden />
                        )}
                        <button
                          onClick={() => handleJump(s.id)}
                          className={`w-full flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-r-md text-[13px] text-left transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{s.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content — all sections rendered, scroll-spy highlights TOC */}
        <div className="space-y-4 scroll-smooth">
          {filtered.map((s) => {
            const Icon = s.icon;
            return (
              <section
                key={s.id}
                id={s.id}
                data-section-id={s.id}
                ref={(el) => (sectionRefs.current[s.id] = el)}
                className="scroll-mt-20"
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">{s.title}</CardTitle>
                    </div>
                    <Separator className="mt-3" />
                  </CardHeader>
                  <CardContent>{s.body}</CardContent>
                </Card>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No sections match your search.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Need more help?</p>
              <p className="text-xs text-muted-foreground">
                Reach out to your organization owner, or contact Rythenox support if you're stuck.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5"><ArrowRight className="h-3 w-3" /> support@rythenox.com</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
