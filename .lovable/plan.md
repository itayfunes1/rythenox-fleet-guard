

## Plan: Simplify Auth + Team Chat + Multi-Terminal

### 1. Simplify Auth Page (Remove Signup)

**File: `src/pages/Auth.tsx`**
- Remove `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports and usage
- Remove `fullName` state and `handleSignup` function
- Remove `User` icon import
- Render login form directly (no tabs) — email, password, sign in button, forgot password link
- Keep password reset flow and left branding panel unchanged

### 2. Database Migration: Team Chat Table

```sql
CREATE TABLE public.team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant chat"
  ON public.team_chat_messages FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Members can send chat messages"
  ON public.team_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND user_id = auth.uid()
  );
```

### 3. Team Chat Feature

**New file: `src/hooks/use-team-chat.ts`**
- `useTeamChat(tenantId)` — fetches last 100 messages via `useQuery`
- Supabase Realtime subscription on INSERT events, appends to query cache
- `useSendMessage()` mutation — inserts into `team_chat_messages`

**New file: `src/pages/TeamChat.tsx`**
- Full-height chat layout with glass-card styling
- ScrollArea message list with user avatars (initials), email, timestamp
- Input bar at bottom with send button
- Auto-scroll on new messages

### 4. Multi-Terminal Feature

**Refactor: `src/pages/Devices.tsx`**
- Replace single `selectedDevice` state with `openTerminals: ManagedDevice[]` array and `activeTerminalId: string | null`
- Tab bar at top of terminal view showing all open terminals (device ID tabs + close button per tab)
- Clicking a device opens a new tab (or focuses existing one)
- Each tab maintains its own task history via `useDeviceTasks`
- Active tab is highlighted; inactive tabs show device name
- Close button on each tab ends that session
- Command input shared, sends to the currently active terminal's device
- Extract terminal panel into a `<TerminalPanel>` sub-component for clarity

**New file: `src/components/TerminalPanel.tsx`**
- Receives `device`, `tenantId`, `isActive` props
- Contains the ScrollArea with task history, command input bar
- Only renders content when `isActive` (or always renders but hides via CSS for preserving scroll position)

### 5. Router & Sidebar Updates

**File: `src/App.tsx`** — Add `/chat` route in `ProtectedRoutes`

**File: `src/components/AppSidebar.tsx`** — Add "Team Chat" entry with `MessageSquare` icon to `mainItems` array

### Summary

| Change | Files |
|--------|-------|
| Remove signup from auth | `Auth.tsx` |
| Chat database table | Migration SQL |
| Team chat hook | `use-team-chat.ts` (new) |
| Team chat page | `TeamChat.tsx` (new) |
| Multi-terminal tabs | `Devices.tsx` refactor + `TerminalPanel.tsx` (new) |
| Routing & nav | `App.tsx`, `AppSidebar.tsx` |

