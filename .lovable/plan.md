## Goal

Build out the existing notification bell into a complete system:
1. **Auto-triggers** for device offline / new device / task completed / task failed / build finished / org request lifecycle.
2. **Dedicated `/notifications` page** with filters, search, and bulk actions.
3. **User preferences** to enable/disable each category and toggle in-app toasts.

## What's already there (kept as-is)

- `notifications` table + RLS, `useNotifications` hook with realtime, bell dropdown, join-request notification, announcement fan-out trigger.

## 1. Database changes

**New table `notification_preferences`** (one row per user):
- `user_id` (PK, uuid), `device_offline`, `device_enrolled`, `task_completed`, `task_failed`, `build_finished`, `org_requests`, `announcements` — all `boolean default true`
- `toast_enabled boolean default true`
- RLS: user can select/insert/update/delete their own row.
- Trigger on `auth.users` insert → seed default row (extend `handle_new_user`).

**Helper RPC `create_notification_for_tenant_admins(_tenant_id, _category, _title, _message, _type)`** — security definer, fans out to all `owner`/`admin` of the tenant, respecting their `notification_preferences.<category>` toggle.

**DB triggers (replace edge-function-based pushes where possible):**
- `remote_tasks` AFTER UPDATE of status → if `Completed`/`Failed`, call helper with `task_completed`/`task_failed`.
- `managed_devices` AFTER UPDATE → if `last_seen` jumps forward and previous `status='Offline'`, that's reconnect (skip). If `last_seen` is older than 90s and status flips → handled below.
- `managed_devices` AFTER INSERT → `device_enrolled` notification.
- `build_history` AFTER UPDATE of status → `build_finished` notification to the build's `user_id`.
- `org_join_requests` AFTER UPDATE of status → notify requester (approved/rejected already partially handled in RPCs; consolidate).

**Device-offline detection** (no incoming event when a device goes silent): add a SQL function `detect_offline_devices()` that flips `managed_devices.status` to `Offline` for rows where `last_seen < now() - interval '90 seconds'` AND `status='Online'`, then a trigger on that UPDATE creates the offline notification. Schedule via pg_cron every minute.

## 2. Frontend — Notifications page

New route `/notifications` (`src/pages/Notifications.tsx`) reachable from:
- Sidebar item (Bell icon) under main nav.
- "View all" link at the bottom of the bell dropdown.

Layout:
```text
┌──────────────────────────────────────────────────┐
│ Notifications                  [Mark all] [Clear]│
│ ┌─Filters──────────────────────────────────────┐ │
│ │ [All|Unread|Read]  [Type ▾]  [Search...]    │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ ● Icon  Title              type · 5m ago  ⋯ │ │
│ │   Message line clamped to 2 lines           │ │
│ ├──────────────────────────────────────────────┤ │
│ │ ...                                          │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

Features:
- Type filter (info/success/warning/error), read-state filter, free-text search on title+message.
- Multi-select with bulk mark-read and bulk delete.
- Pagination (25/page, infinite scroll via `useInfiniteQuery`).
- Reuses `useNotifications` data shape; new hook `useNotificationsPaged` for page-level data.

## 3. User preferences UI

Add a **Notifications** card to `Settings` page:
- Toggle list for each category (Device offline, New device enrolled, Task completed, Task failed, Build finished, Org requests, Announcements).
- "Show in-app toast for new notifications" master toggle.
- New hook `useNotificationPreferences` (read/update via supabase).

## 4. In-app toast for new notifications

In `useNotifications`, when realtime delivers a new INSERT event AND `toast_enabled` pref is true AND the category pref is true → show `sonner` toast with title+message and click-to-mark-read.

## 5. Files to add / change

**Add:**
- `supabase/migrations/<timestamp>_notification_system.sql` — new table, RPC, triggers, pg_cron schedule.
- `src/pages/Notifications.tsx`
- `src/hooks/use-notification-preferences.ts`
- `src/components/settings/NotificationPreferencesCard.tsx`

**Modify:**
- `src/App.tsx` — register `/notifications` route.
- `src/components/AppSidebar.tsx` — add Notifications nav item (with unread badge).
- `src/components/NotificationDropdown.tsx` — add "View all" footer link.
- `src/hooks/use-notifications.ts` — add toast-on-new logic guarded by preferences.
- `src/pages/Settings.tsx` — mount `NotificationPreferencesCard`.

## Out of scope

- Browser push (Web Push API) and email delivery — can be added later.
- Per-device notification rules (only global category toggles for now).
