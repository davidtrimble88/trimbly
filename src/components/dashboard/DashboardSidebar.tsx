import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
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
            className="h-9 rounded-xl px-3 font-body text-[0.8125rem] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/70 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-primary"
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-2 py-3">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-1.5">
          <BrandMark className="w-8 h-8 shrink-0" />
          <span className="font-display text-[0.95rem] font-bold text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            {brandLabel}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {groups ? (
          groups.map((groupName) => (
            <SidebarGroup key={groupName}>
              <SidebarGroupLabel className="px-3 font-body text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {groupName}
              </SidebarGroupLabel>
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
