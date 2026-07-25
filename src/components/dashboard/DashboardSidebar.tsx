import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DashboardNavItem } from "./types";

interface DashboardSidebarProps {
  brandLabel: string;
  navItems: DashboardNavItem[];
  activeItemId: string;
  onNavigate: (item: DashboardNavItem) => void;
  footer?: React.ReactNode;
}

const DashboardSidebar = ({ brandLabel, navItems, activeItemId, onNavigate, footer }: DashboardSidebarProps) => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Shield size={15} className="text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sm text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            {brandLabel}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.id === activeItemId;
                const button = (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    asChild={!!item.href}
                    onClick={item.href ? undefined : () => onNavigate(item)}
                  >
                    {item.href ? (
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <>
                        <item.icon />
                        <span>{item.label}</span>
                      </>
                    )}
                  </SidebarMenuButton>
                );
                return (
                  <SidebarMenuItem key={item.id}>
                    {button}
                    {!!item.badge && item.badge > 0 && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </Sidebar>
  );
};

export default DashboardSidebar;
