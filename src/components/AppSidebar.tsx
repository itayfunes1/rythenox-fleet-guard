import { LayoutDashboard, Monitor, Rocket, FolderArchive, Network, Settings, LogOut, Zap, Bell } from "lucide-react";
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
  { title: "Diagnostic Vault", url: "/diagnostics", icon: FolderArchive },
  { title: "Network", url: "/network", icon: Network, restrictedTo: "monitor@rythenox.com" },
];

const systemItems = [
  { title: "Notifications", url: "/notifications", icon: Bell },
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
        className="transition-all duration-150 rounded-lg data-[active=true]:bg-primary/8 data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-muted"
      >
        <NavLink to={item.url} end={item.url === "/"}>
          <item.icon className="h-4 w-4" />
          {!collapsed && <span className="text-[13px]">{item.title}</span>}
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
      <SidebarHeader className="p-4">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm shrink-0 ring-1 ring-primary/20">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm shrink-0 ring-1 ring-primary/20">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">Rythenox</span>
              <span className="text-[10px] text-muted-foreground tracking-wide uppercase">Marengo</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
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
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderMenuItem(item)}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-xl p-3 space-y-2.5 border border-border bg-muted/50">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                {user?.email?.substring(0, 2).toUpperCase() || "??"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user?.email || "Unknown"}</p>
                <p className="text-[10px] text-muted-foreground">Member</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-8"
              onClick={signOut}
            >
              <LogOut className="h-3 w-3 mr-2" /> Sign Out
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={signOut} className="hover:text-destructive hover:bg-destructive/10 h-8 w-8">
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
