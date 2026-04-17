
The user wants to make the Dashboard (`src/pages/Dashboard.tsx`) stand out with smarter features. Looking at the current dashboard, it has solid basics: KPI cards, fleet health, device inventory, quick actions, and task activity. But it lacks intelligence — no trends, no insights, no proactive monitoring, no real-time pulse.

Looking at available data sources:
- `useDevices` — managed_devices (status, os_info, public_ip, last_seen, arch)
- `useTasks` — remote_tasks (status, command, target_id, created_at, completed_at)
- `useRelays` — relay nodes with throughput/uptime
- `useActiveSessions` — terminal sessions
- `useNotifications` — alert stream
- `useDiagnosticFiles` — uploaded artifacts

The dashboard already pulls devices and tasks. I'll layer smart, computed insights on top without new backend work — pure derived intelligence + better real-time signals + a couple of light analytical visuals.

## Plan: Smart Dashboard Upgrade

### 1. Live Pulse Strip (top of page)
Thin horizontal strip above the KPIs showing real-time activity:
- Animated dot + "X commands executed in last hour"
- Active terminal sessions count (live)
- Online relays count (live)
- Last heartbeat timestamp (relative time, ticks every second)

### 2. Smarter KPI Cards
Each KPI gets contextual intelligence:
- **Total Devices**: Add sparkline showing device-count trend (last 7 days based on first-seen)
- **Online**: Add delta vs 24h ago ("+2 since yesterday")
- **Offline**: Show top offender (longest-offline device name)
- **Tasks**: Show success rate % (completed / (completed+failed)) with color coding

### 3. New "Smart Insights" Card (replaces or augments Fleet Health)
AI-style contextual insights computed client-side:
- "3 devices offline for >24h — consider investigating"
- "Task success rate: 94% (above baseline)"
- "Peak activity: 2pm-4pm today"
- "Most active device: WIN-DEV-01 (12 commands today)"
- Each insight has a severity color and action link

### 4. Activity Heatmap (24h)
A compact 24-cell heatmap showing task volume per hour over the last 24 hours. Cells colored by intensity. Helps spot peak usage and quiet hours at a glance.

### 5. Top Devices Leaderboard
Mini leaderboard ranking devices by:
- Most commands executed (today)
- Longest uptime
- Most recent activity

Toggle between metrics with tabs.

### 6. Command Type Breakdown
Donut/bar showing distribution of commands by type (parsed from `command` field — first word like `dir`, `whoami`, `screenshot`, etc.). Reveals usage patterns.

### 7. Real-Time Event Stream
Replace the static Task Activity with a live "Event Stream" that includes:
- Task events (queued/completed/failed)
- Device events (came online / went offline)
- Session events (terminal opened/closed)
All merged chronologically with type icons and live updates via existing Supabase Realtime hooks.

### 8. Geographic / Network Distribution
Small panel grouping devices by:
- OS family (Windows / Linux / macOS) — with counts
- Public IP /24 subnet (rough geo grouping)

Shown as horizontal bar list.

## Layout (revised)

```text
[Greeting Header]                        [System Operational]
[Live Pulse Strip — commands/hr · sessions · relays · last heartbeat]

[KPI: Devices+spark] [Online+Δ] [Offline+top] [Tasks+success%]

┌──────────────────────────────┬──────────────────────┐
│ Smart Insights (4-6 cards)   │ Quick Actions        │
├──────────────────────────────┤                      │
│ Activity Heatmap (24h)       ├──────────────────────┤
├──────────────────────────────┤ Real-Time Event      │
│ Device Inventory (table)     │ Stream               │
├──────────────────────────────┤                      │
│ Top Devices │ Command Types  │                      │
└─────────────┴────────────────┴──────────────────────┘
                                ┌──────────────────────┐
                                │ OS / Network Distrib │
                                └──────────────────────┘
```

## Files to change
- `src/pages/Dashboard.tsx` — main rewrite, all new sections (purely client-derived from existing hooks)
- No new hooks needed — reuses `useDevices`, `useTasks`, `useRelays`, `useActiveSessions`
- No DB migrations, no edge functions

## Technical notes
- All insights computed via `useMemo` from existing query data — zero new network calls
- Heatmap uses CSS grid with opacity-driven intensity
- Sparklines as inline SVG (no chart lib needed for KPI minis)
- Command-type donut uses existing `recharts` (already in project via `chart.tsx`)
- Live "ticking" timestamps use a 1s interval state
- Respects existing light corporate enterprise aesthetic — indigo accents, no glassmorphism

## Out of scope
- No new backend tables or edge functions
- No historical aggregation tables (insights derived from current in-memory data)
- No AI/LLM calls — insights are rule-based and deterministic
