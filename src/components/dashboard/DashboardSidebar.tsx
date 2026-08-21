import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DashboardNavItem } from "./types";
import FeatureAnnouncementDot from "./FeatureAnnouncementDot";

interface DashboardSidebarProps {
  brandLabel: string;
  navItems: DashboardNavItem[];
  groups?: string[];
  activeItemId: string;
  onNavigate: (item: DashboardNavItem) => void;
  footer?: React.ReactNode;
}

const DashboardSidebar = ({ brandLabel, navItems, groups, activeItemId, onNavigate, footer }: DashboardSidebarProps) => {
  const renderMenu = (items: DashboardNavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
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
                {item.featureKey && <FeatureAnnouncementDot featureKey={item.featureKey} />}
              </Link>
            ) : (
              <>
                <item.icon />
                <span>{item.label}</span>
                {item.featureKey && <FeatureAnnouncementDot featureKey={item.featureKey} />}
              </>
            )}
          </SidebarMenuButton>
        );
        return (
          <SidebarMenuItem key={item.id} data-tour={item.id}>
            {button}
            {!!item.badge && item.badge > 0 && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

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
        {groups ? (
          groups.map((groupName) => (
            <SidebarGroup key={groupName}>
              <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenu(navItems.filter((item) => item.group === groupName))}
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>{renderMenu(navItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </Sidebar>
  );
};

export default DashboardSidebar;
