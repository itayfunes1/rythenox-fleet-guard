

## Plan: Enhanced Network Page, Email-Based Access Control, Admin Tools, and Dashboard Design Overhaul

This is a large scope request covering four areas. Here's the plan:

---

### 1. Network Infrastructure Page - Enhanced Relay Data

**Current state**: Shows 3 stat cards and a basic table with 6 columns.

**Changes**:
- Add more stat cards: Total Throughput (aggregated), Average Uptime, Peak Client Count
- Add a relay detail expandable row or click-to-expand panel showing per-relay metrics
- Add a "time since last seen" relative timestamp (e.g., "12s ago")
- Add a latency/health indicator with color-coded progress bars for uptime percentage
- Add a "Network Map" summary section with online/offline ratio visualization using a progress bar
- Add auto-refresh indicator showing real-time status
- Show relay geographic grouping by IP prefix if available
- Add throughput sparkline or bar representation per relay

---

### 2. Email Domain Access Control for Network Page

**Approach**: Client-side guard using the authenticated user's email from `useAuth()`. Only users with emails ending in `@rythenox.com` can view the Network page. Others see an "Access Denied" message.

- Create a reusable `useRythenoxGuard()` hook that checks `user.email?.endsWith("@rythenox.com")`
- Wrap the Network page with this guard, showing an access denied card for unauthorized users
- This is a UI-level restriction; the existing RLS policies already protect the data at the database level

---

### 3. Admin Tools

Add an admin tools section to the Network page (visible only to `@rythenox.com` users):
- **Force Relay Offline**: Button to mark a relay as offline (via edge function or direct update)
- **Purge Stale Relays**: Button to remove relays that haven't been seen in 24+ hours
- **Broadcast Command**: Send a task to all online relay addresses
- Create a new edge function `relay-admin` that handles these operations with API key auth
- Add a migration to allow authenticated users with the correct tenant to UPDATE/DELETE relay_nodes

---

### 4. Login Page Design Overhaul

**Current state**: Basic card with tabs, floating orbs background.

**Changes**:
- Split-screen layout: left side with branding/hero illustration, right side with auth form
- Add animated grid/mesh background instead of simple orbs
- Improve typography hierarchy and spacing
- Add subtle feature highlights on the left panel (e.g., "Fleet Management", "Real-time Monitoring", "Secure Access")
- Better input styling with icons (mail icon, lock icon)
- Smoother transitions between login/signup tabs

---

### 5. Dashboard Design Improvements

**Changes to DashboardLayout**:
- Add breadcrumb navigation in the header
- Add a notification bell icon placeholder
- Improve header with search bar placeholder
- Better spacing and micro-interactions

**Changes to Dashboard page**:
- Add a gradient mesh hero section at the top with a welcome message
- Improve stat card design with animated number counters
- Add a secondary row of cards showing quick-access actions
- Better activity feed with icons per action type

**Changes to AppSidebar**:
- Add hover tooltips when collapsed
- Add a badge for notification counts
- Improve the footer user card design

**Global CSS**:
- Add dark mode as default (the app already has dark mode vars)
- Add subtle grain texture overlay
- Improve card border treatments

---

### Technical Details

**Files to create/modify**:
- `src/pages/NetworkInfrastructure.tsx` - Major rewrite with expanded metrics, admin tools, access guard
- `src/pages/Auth.tsx` - Complete redesign with split-screen layout
- `src/pages/Dashboard.tsx` - Enhanced design with welcome section
- `src/components/DashboardLayout.tsx` - Improved header
- `src/components/AppSidebar.tsx` - Design polish
- `src/index.css` - New utility classes, dark mode default
- `supabase/functions/relay-admin/index.ts` - New edge function for admin operations
- **DB Migration**: Add UPDATE/DELETE policies on `relay_nodes` for tenant members, add a `relay-admin` edge function

**Database migration needed**:
```sql
-- Allow tenant members to update/delete their relay nodes
CREATE POLICY "Members can update tenant relays"
  ON public.relay_nodes FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Members can delete tenant relays"
  ON public.relay_nodes FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()));
```

**No new tables required** -- admin operations use existing relay_nodes table with new RLS policies.

