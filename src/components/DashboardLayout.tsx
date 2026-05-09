import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/components/AuthProvider";
import { Search } from "lucide-react";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { TerminalProvider } from "@/components/TerminalContext";
import { TerminalTaskbar } from "@/components/TerminalTaskbar";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??";

  return (
    <TerminalProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-[68px] flex items-center app-header px-6 gap-4 sticky top-0 z-30">
              <SidebarTrigger className="hover:bg-muted transition-colors rounded-lg h-9 w-9" />

              <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="group flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl bg-card border-2 border-border text-muted-foreground text-sm hover:border-primary/40 hover:shadow-sm transition-all text-left"
                >
                  <Search className="h-4 w-4 group-hover:text-accent transition-colors" />
                  <span className="text-xs font-semibold tracking-tight">Search devices, builds, logs…</span>
                  <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border font-mono text-foreground/70 font-bold">⌘K</kbd>
                </button>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-xs font-extrabold text-primary-foreground cursor-default shadow-md ring-2 ring-accent/30">
                  {initials}
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto px-6 py-7 pb-14">
              <div className="page-enter mx-auto max-w-[1400px]">
                <AnnouncementBanner />
                {children}
              </div>
            </main>
          </div>
        </div>
        <TerminalTaskbar />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </SidebarProvider>
    </TerminalProvider>
  );
}
