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
            <header className="h-16 flex items-center border-b border-border bg-card/80 backdrop-blur-md px-5 gap-3 sticky top-0 z-30 supports-[backdrop-filter]:bg-card/70">
              <SidebarTrigger className="hover:bg-muted transition-colors rounded-lg h-8 w-8" />

              <div className="hidden md:flex items-center gap-2 flex-1 max-w-md ml-3">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 rounded-lg bg-muted/60 border border-border/70 text-muted-foreground text-sm hover:bg-muted transition-colors text-left"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Search devices, builds, logs…</span>
                  <kbd className="ml-auto text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
                </button>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-semibold text-primary-foreground cursor-default shadow-sm ring-1 ring-border">
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
