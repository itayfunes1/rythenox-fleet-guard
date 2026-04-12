

## Plan: Restructure DiagnosticVault as Hierarchical File Explorer

### Overview
Rewrite `DiagnosticVault.tsx` from a flat asset gallery into a two-panel file explorer with device sidebar navigation, breadcrumbs, and type-grouped file views. No database changes needed.

### Changes

**File: `src/pages/DiagnosticVault.tsx`** (full rewrite)

1. **Layout**: Replace the single-column layout with a two-panel flex layout:
   - Left: glass-card sidebar (~250px wide, scrollable) listing devices
   - Right: main content area with breadcrumb header, toolbar, and file display

2. **Sidebar Device Navigation**:
   - Derive unique `target_id` values from loaded data with file counts
   - "All Devices" entry at top (selected by default)
   - Each device entry shows a Monitor icon, truncated device ID, and a Badge with count
   - Active item highlighted with `bg-primary/10 border-primary/30`

3. **Breadcrumb Header**:
   - Uses shadcn `Breadcrumb` component
   - Pattern: `Explorer` > `[Device ID]` (or just `Explorer` > `All Devices`)
   - Clicking "Explorer" resets to All Devices

4. **File Categorization**:
   - When a device is selected, group filtered files by type into collapsible sections: "Screenshots" (image), "Audio Recordings" (audio), "Text Logs" (text)
   - Each section header has a Folder icon, category name, and file count
   - Sections are collapsible using shadcn Collapsible

5. **View Toggle & Toolbar**:
   - Keep existing Grid/List toggle and search bar
   - Move type filter toggles into the toolbar alongside view mode
   - Search filters within the selected device scope

6. **Empty State**:
   - FolderArchive icon centered with contextual message when selected device has no files

7. **Preserve existing sub-components**: `AssetGridCard`, `AssetActions`, `ImagePreviewDialog`, `TextPreviewSheet`, `AudioPreviewDialog` remain largely unchanged

### Technical Details
- All filtering is client-side from the already-fetched `useDiagnosticFiles` data
- New state: `selectedDevice: string | null` (null = all devices)
- Derived: `devices` array via `useMemo` extracting unique target_ids with counts
- Derived: `groupedFiles` via `useMemo` grouping filtered results by type
- Remove the stats bar and data scope notice to declutter the explorer layout
- Responsive: sidebar collapses to a horizontal device selector on mobile (`md:` breakpoint)

