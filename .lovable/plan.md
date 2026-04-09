

## Rythenox — IT Fleet Management & Helpdesk Portal

### Overview
A corporate IT dashboard for managing company-owned devices, deploying management agents, viewing diagnostics, and monitoring network infrastructure — all with built-in compliance and consent features.

### Design System
- **Colors**: Corporate Navy (#0f1b3d), Slate Gray (#4a5568), Professional White (#f8fafc), with accent blue (#3b82f6) for actions
- **Typography**: Inter / System UI — clean, professional, highly readable at small sizes
- **Layout**: Sidebar dashboard with collapsible navigation + main content area
- **Style**: Minimal borders, subtle shadows, data-dense tables with good spacing, status badges with color coding

### Pages & Features

#### 1. Dashboard Home
- Summary cards: Total Devices, Online/Offline count, Pending Updates, Active Support Sessions
- Recent activity feed showing latest remote sessions and deployments

#### 2. Device Management (Inventory)
- Sortable/filterable data table with columns: Asset Tag, Assigned User, OS Version, Last Check-in, Connectivity Status (green/amber/red badge)
- Row actions: "Initiate Remote Support", "View System Health Logs", "Update Software"
- Remote Support action triggers a confirmation dialog showing the compliance notification text
- Device detail drawer/modal with full system info and health history

#### 3. Deployment Center (Policy Manager)
- Form with agent type selection: Standard User Agent vs Privileged Administrator Agent
- Privileged option shows OAuth 2.0 authentication requirement notice
- Toggle switches: Enable Remote Assistance, Automatic System Updates, Diagnostic Logging
- Platform/OS selector
- "Generate Configuration" button produces a deployment script displayed in a code block with copy-to-clipboard
- Script output formatted for MDM/GPO deployment

#### 4. Diagnostic Vault
- Tabbed interface: System Reports | Event Logs | Screen-Share Recordings
- Each tab shows a searchable list with timestamps, device info, and download/view actions
- File type badges (PDF, LOG, MP4)

#### 5. Network Infrastructure
- Cards/table showing VPN Concentrators and Management Gateways
- Status indicators, connection counts, uptime metrics
- Simple network topology visualization

#### 6. Compliance & Consent
- All remote action buttons show a consent confirmation dialog: "This will display a visible notification on the target device: 'Your IT Administrator has initiated a support session.'"
- Data scope disclaimer shown in diagnostics: limited to CPU, RAM, disk health
- Audit log of all remote actions with timestamps

### Navigation (Sidebar)
- Dashboard
- Devices
- Deployment Center
- Diagnostic Vault
- Network
- Settings

All pages use mock/demo data to showcase the UI. No backend integration initially — purely frontend with realistic sample data.

