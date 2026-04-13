import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/components/AuthProvider";
import { Search } from "lucide-react";
import { NotificationDropdown } from "@/components/NotificationDropdown";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-card px-4 gap-3 sticky top-0 z-30">
            <SidebarTrigger className="hover:bg-muted transition-colors rounded-lg" />

            <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm ml-2">
              <div className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground text-sm cursor-default">
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Search...</span>
                <kbd className="ml-auto text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <NotificationDropdown />
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground cursor-default">
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <div className="page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
