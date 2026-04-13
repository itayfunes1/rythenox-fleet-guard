

## Plan: Enhanced Team Chat with Channels, DMs, and Group Chats

### Overview
Upgrade the current single-channel team chat into a full messaging system with channels (organization-wide), group chats, and direct messages between tenant members.

### 1. Database Migration

**New table: `chat_channels`** — Represents channels, group chats, and DMs within a tenant.

```sql
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text,                    -- null for DMs
  type text NOT NULL DEFAULT 'channel',  -- 'channel', 'group', 'dm'
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**New table: `chat_channel_members`** — Tracks who belongs to each channel/group/DM.

```sql
CREATE TABLE public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
```

**Modify `team_chat_messages`** — Add `channel_id` column to route messages to a specific channel.

```sql
ALTER TABLE public.team_chat_messages
  ADD COLUMN channel_id uuid REFERENCES chat_channels(id) ON DELETE CASCADE;
```

**RLS policies** for all new tables scoped to tenant via `get_user_tenant_id()`. Channel members can read/write messages in their channels. Tenant members can create channels and groups.

**Seed a default "General" channel** per tenant via a DB function triggered on tenant creation (or create on first chat page load in the frontend).

### 2. New Hooks

**`src/hooks/use-chat-channels.ts`**
- `useChatChannels(tenantId)` — fetches all channels the current user is a member of
- `useCreateChannel()` — mutation to create a channel/group/DM
- `useChannelMembers(channelId)` — fetches members of a channel
- `useAddChannelMember()` / `useRemoveChannelMember()` — mutations

**Update `src/hooks/use-team-chat.ts`**
- `useTeamChat(channelId)` — query messages filtered by `channel_id` instead of `tenant_id`
- Realtime subscription filtered by `channel_id`
- `useSendMessage()` — include `channel_id` in the insert

### 3. New Hook: Tenant Members

**`src/hooks/use-tenant-members.ts`**
- `useTenantMembers(tenantId)` — fetches all members of the tenant (requires new RLS policy on `tenant_members` allowing members to see other members in the same tenant)
- Needed for the "new DM" and "add to group" member pickers

**Migration**: Add SELECT policy on `tenant_members` allowing members of the same tenant to view each other:
```sql
CREATE POLICY "Members can view tenant members"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
```

### 4. UI Refactor: `src/pages/TeamChat.tsx`

**Layout**: Split into sidebar + chat area.

- **Left panel** (~250px): Lists channels, groups, and DMs. Grouped into sections with headers. "New Channel", "New Group", "New DM" buttons. Each item shows name (or member names for DMs), unread indicator optional later.
- **Right panel**: Current chat view, now scoped to the selected `channel_id`.
- **Create Channel dialog**: Name input, type selector (channel/group), member picker for groups.
- **New DM dialog**: Member picker from tenant members list.

### 5. Dashboard Changes

**File: `src/pages/Dashboard.tsx`**
- Remove "Active Sessions" from `stats` array (remove `Headset` import and `activeSessionCount`)
- Remove "Compliance" from `quickActions` array (remove `Shield` import)
- Rename "Diagnostics" quick action label to "File Explorer"
- Remove `useActiveSessions` import since it's no longer used

### Summary

| Change | Files |
|--------|-------|
| New tables + RLS | Migration SQL |
| Tenant members visibility | Migration SQL (new RLS policy) |
| Chat channels hook | `use-chat-channels.ts` (new) |
| Tenant members hook | `use-tenant-members.ts` (new) |
| Update chat hook | `use-team-chat.ts` (modify) |
| Chat UI with sidebar | `TeamChat.tsx` (rewrite) |
| Dashboard cleanup | `Dashboard.tsx` (modify) |

