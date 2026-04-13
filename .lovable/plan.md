

## Redesign: Light Theme Only

This plan covers a complete visual overhaul of the Rythenox Fleet Management app, switching from the current dark glassmorphism theme to a clean, modern light-only design.

### What changes

**1. Remove dark mode entirely**
- `index.html`: Remove `class="dark"` from `<html>`
- `src/index.css`: Remove the entire `.dark { }` block and dark-specific glass/glow styles
- `tailwind.config.ts`: Remove `darkMode: ["class"]`

**2. New light color palette**
- Background: clean white/light gray (`#fafbfc`, `#f1f5f9`)
- Cards: pure white with subtle borders
- Primary: keep the indigo-blue (`225 73% 57%`) but soften shadows
- Sidebar: light gray instead of dark navy
- Remove all glassmorphism effects (backdrop-blur, glass-card, glow-card)
- Replace gradient overlays with clean, flat surfaces

**3. Redesign global styles (`src/index.css`)**
- Update `:root` CSS variables for a bright, airy palette
- Replace `glass-card` with a simple elevated card style (white bg, light border, subtle shadow)
- Replace `glow-card` hover with a clean lift/shadow effect
- Simplify `gradient-text` to a solid primary color or subtle gradient
- Update sidebar styles to light theme (white/gray sidebar with colored accents)
- Keep animations but tone down glow effects
- Update scrollbar to match light theme
- Update terminal styling to a softer dark-on-light look

**4. Redesign Sidebar (`AppSidebar.tsx`)**
- White/light gray background instead of dark navy
- Dark text on light background
- Active item: primary-colored left border with light primary tint
- Logo area: keep gradient icon, update text to dark
- Footer user card: light background

**5. Redesign Header (`DashboardLayout.tsx`)**
- Clean white header with bottom border
- Search bar with light gray background

**6. Redesign Auth page (`Auth.tsx`)**
- Clean split layout with white card on light background
- Remove animated blur orbs, replace with subtle geometric accents
- Softer button styling (solid primary, no gradient)

**7. Redesign Dashboard (`Dashboard.tsx`)**
- Clean stat cards with white bg, colored icon accents
- Welcome banner with light gradient
- Activity list with clean row styling

**8. Update all other pages**
- Devices, Settings, TeamChat, DeploymentCenter, DiagnosticVault, NetworkInfrastructure
- Replace `glass-card` with clean card styling
- Replace gradient buttons with solid primary buttons
- Update terminal view to light-friendly dark terminal or light terminal

### Files to modify
- `index.html` — remove `dark` class
- `src/index.css` — new light-only variables and utility classes
- `tailwind.config.ts` — remove darkMode config
- `src/components/AppSidebar.tsx` — light sidebar styling
- `src/components/DashboardLayout.tsx` — light header
- `src/pages/Auth.tsx` — clean light auth
- `src/pages/Dashboard.tsx` — light dashboard
- `src/pages/Devices.tsx` — light device list/terminal
- `src/pages/Settings.tsx` — light settings
- `src/pages/TeamChat.tsx` — light chat
- `src/pages/DeploymentCenter.tsx` — light deployment
- `src/pages/DiagnosticVault.tsx` — light vault
- `src/pages/NetworkInfrastructure.tsx` — light network
- `src/components/NotificationDropdown.tsx` — if it uses glass-card

### Technical details
- All `glass-card` references across pages will be replaced with a simpler card class
- The `terminal-bg` variable will be updated to work visually in light mode
- Sidebar CSS variables (`--sidebar-*`) will be remapped to light values
- No dark mode toggle needed; only light theme CSS variables remain

