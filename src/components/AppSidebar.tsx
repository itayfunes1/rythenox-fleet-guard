import { LayoutDashboard, Monitor, Rocket, FolderArchive, Network, Settings, LogOut, Zap, Bell, BookOpen, Clock, ScrollText, LifeBuoy, MessagesSquare, Activity, ShieldAlert } from "lucide-react";
import rythenoxLogo from "@/assets/rythenox-logo.svg";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems: Array<{ title: string; url: string; icon: typeof LayoutDashboard; restrictedTo?: string }> = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Devices", url: "/devices", icon: Monitor },
  { title: "Deployment Center", url: "/deployment", icon: Rocket },
  { title: "File Explorer", url: "/diagnostics", icon: FolderArchive },
  { title: "Network", url: "/network", icon: Network, restrictedTo: "monitor@rythenox.com" },
];

const automationItems = [
  
  { title: "Playbooks", url: "/playbooks", icon: BookOpen },
  { title: "Schedules", url: "/schedules", icon: Clock },
  { title: "Audit Log", url: "/audit", icon: ScrollText },
];

const systemItems: Array<{ title: string; url: string; icon: typeof LayoutDashboard; restrictedTo?: string }> = [
  { title: "Messages", url: "/messages", icon: MessagesSquare },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "System Status", url: "/status", icon: Activity },
  { title: "Status Admin", url: "/admin/status", icon: ShieldAlert, restrictedTo: "monitor@rythenox.com" },
  { title: "Documentation", url: "/docs", icon: LifeBuoy },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  const renderMenuItem = (item: typeof mainItems[0]) => {
    const button = (
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url)}
        className="group/nav transition-all duration-200 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold data-[active=true]:shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.6)]"
      >
        <NavLink to={item.url} end={item.url === "/"}>
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-[13px] tracking-tight">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <Sidebar collapsible="icon" className="sidebar-glow">
      <SidebarHeader className="p-4 pb-4 border-b border-sidebar-border">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.6)] shrink-0">
              <Zap className="h-4 w-4 text-accent-foreground" strokeWidth={2.5} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.6)] shrink-0">
              <Zap className="h-4 w-4 text-accent-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-[18px] font-extrabold tracking-tight text-sidebar-primary-foreground">Rythenox</span>
              <span className="text-[10px] text-accent font-bold tracking-[0.22em] uppercase mt-1">Wraith OS</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/40 font-bold mb-2 px-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems
                .filter((item) => !item.restrictedTo || user?.email === item.restrictedTo)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderMenuItem(item)}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/40 font-bold mb-2 px-2 mt-4">
            Automation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {automationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderMenuItem(item)}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/40 font-bold mb-2 px-2 mt-4">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {systemItems
                .filter((item) => !item.restrictedTo || user?.email === item.restrictedTo)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderMenuItem(item)}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="rounded-xl p-3 space-y-2.5 bg-sidebar-accent/60 border border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-[10px] font-extrabold text-accent-foreground shrink-0">
                {user?.email?.substring(0, 2).toUpperCase() || "??"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-primary-foreground truncate">{user?.email || "Unknown"}</p>
                <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Operator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-8"
              onClick={signOut}
            >
              <LogOut className="h-3 w-3 mr-2" /> Sign Out
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Sign Out</TooltipContent>
          </Tooltip>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
