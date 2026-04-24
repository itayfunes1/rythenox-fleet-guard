## Goal

Add organization management so a company like Rythenox can have multiple approved members sharing one organization workspace. Devices authenticated with the organization API key will appear on the same dashboards for all approved members, and all approved members can send commands to the same clients according to their role.

## User-facing behavior

1. **Settings gets an Organization section**
   - Show current organization name, current user role, member count, and API key access status.
   - Owners/admins can see/copy the organization API key.
   - Members can see that the API key is managed by the organization admin, without exposing it unless we intentionally allow member visibility.

2. **Create or join organization**
   - A user can create a new organization from Settings.
   - A user can search for an existing organization by name.
   - Search results show matching organizations without exposing their API keys.
   - A user can request to join an organization.

3. **Approval workflow**
   - Owners/admins see pending join requests in Settings.
   - Owners/admins can approve or reject requests.
   - Once approved, the requester becomes a member of the organization.
   - The approved user’s dashboard switches to that organization context, so the same devices, tasks, diagnostics, relays, notifications, and announcements are visible through existing tenant-based queries.

4. **Shared device/client model**
   - The organization owns the API key, not an individual member.
   - Agents using that API key continue writing heartbeats into the organization tenant.
   - Because dashboards already query by `tenant_id`, all approved organization members will see the same client list and can queue commands to those clients.

## Data model changes

Create an `org_join_requests` table:

```text
org_join_requests
- id uuid primary key
- tenant_id uuid not null
- requester_id uuid not null
- requester_email text not null
- status text default 'pending'  -- pending, approved, rejected, cancelled
- message text nullable
- reviewed_by uuid nullable
- reviewed_at timestamptz nullable
- created_at timestamptz default now()
- unique pending request per requester + tenant
```

Add secure database functions/RPCs:

- `search_organizations(search_text)`
  - Returns limited organization search results: tenant id, name, and approximate/member count.
  - Does not return `api_key`.

- `create_organization(org_name)`
  - Creates a tenant and assigns the caller as owner.
  - If the user is currently in a personal tenant, this can either switch them to the new org by creating a new membership or replace their current primary membership depending on current data rules.

- `request_join_organization(tenant_id, message)`
  - Creates a pending join request for the signed-in user.
  - Notifies organization owners/admins through the existing `notifications` table.

- `approve_join_request(request_id)`
  - Owner/admin only.
  - Marks request approved.
  - Adds requester to `tenant_members` as `member`.
  - Ensures membership is tied to the approved organization only if the app continues to support a single active tenant per user.

- `reject_join_request(request_id)`
  - Owner/admin only.
  - Marks request rejected and records reviewer metadata.

## Security and RLS

- Keep tenant isolation based on `tenant_members` and `get_user_tenant_id`.
- Do not store roles on the user/profile table.
- Do not expose tenant API keys through organization search.
- Keep API key access restricted to owners/admins unless you confirm members should be able to copy it too.
- Use security-definer RPCs for approval/search logic to avoid recursive RLS problems.
- Add RLS policies so:
  - Users can see their own join requests.
  - Owners/admins can see pending requests for their tenant.
  - Only secure RPCs perform approval/rejection membership changes.

## Frontend implementation

1. **Update tenant context**
   - Extend `useTenant()` so it reliably returns the active organization, role, member count, and API key only when the user is allowed to view it.
   - Invalidate tenant/device/task queries after organization changes so dashboards refresh automatically.

2. **Add organization hooks**
   - `useOrganizationSearch(query)` for org search.
   - `useJoinRequests(tenantId)` for pending approvals.
   - Mutations for create org, request join, approve, reject.

3. **Add Settings UI components**
   - `OrganizationSettings` card:
     - Current organization summary.
     - Create organization form.
     - Organization search + join request button.
   - `JoinRequestsManager` card:
     - Pending requests for owners/admins.
     - Approve/reject buttons.
   - Update the existing API key section copy to say “Organization API key”.

4. **Notifications**
   - Insert notifications when a join request is submitted.
   - Optionally notify the requester when approved/rejected using the existing notifications table.

## Implementation order

1. Add database migration for `org_join_requests`, helper RPCs, RLS policies, indexes, and notifications.
2. Add frontend organization hooks for search, create, request, approve, and reject.
3. Rework Settings page with an Organization section and approval manager.
4. Update API key wording and visibility logic.
5. Ensure query invalidation refreshes Devices/Dashboard after joining or approval.
6. Test the full flow:
   - Owner creates/owns org.
   - Second user searches Rythenox and requests access.
   - Owner approves request.
   - Approved user sees the same devices/tasks because both users now resolve to the same tenant.

## Important decision before implementation

I will default to this secure behavior unless you say otherwise: **only owners/admins can view/copy the organization API key**, while approved members share the same dashboard and can operate devices through the web UI. This avoids unnecessary API key leakage while still letting all approved team members work on the same clients.