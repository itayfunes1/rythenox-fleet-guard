import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/components/AuthProvider";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 bg-card/50 backdrop-blur-xl px-4 gap-4 sticky top-0 z-30">
            <SidebarTrigger className="hover:bg-muted transition-colors rounded-lg" />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md shadow-primary/20">
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
