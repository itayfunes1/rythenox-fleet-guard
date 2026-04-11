import { LayoutDashboard, Monitor, Rocket, FolderArchive, Network, Settings, Shield, LogOut, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
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

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Devices", url: "/devices", icon: Monitor },
  { title: "Deployment Center", url: "/deployment", icon: Rocket },
  { title: "Diagnostic Vault", url: "/diagnostics", icon: FolderArchive },
  { title: "Network", url: "/network", icon: Network },
];

const systemItems = [
  { title: "Compliance", url: "/compliance", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="sidebar-glow">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] shadow-lg shadow-primary/25">
            <Zap className="h-4 w-4 text-primary-foreground" />
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-primary/50 to-[hsl(260,67%,60%,0.5)] blur-sm -z-10 animate-glow-pulse" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">Rythenox</h1>
              <p className="text-[10px] text-sidebar-foreground/50 tracking-wide uppercase">Fleet Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-1">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="transition-all duration-200 rounded-lg data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:translate-x-0.5"
                  >
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="font-medium text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-1">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="transition-all duration-200 rounded-lg data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:translate-x-0.5"
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="font-medium text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="glass-card rounded-xl p-3 space-y-2 border-sidebar-border bg-sidebar-accent/50">
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Logged in as</p>
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email || "Unknown"}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={signOut}
            >
              <LogOut className="h-3 w-3 mr-2" /> Sign Out
            </Button>
          </div>
        )}
        {collapsed && (
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out" className="hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
