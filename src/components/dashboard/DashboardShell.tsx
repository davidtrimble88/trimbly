import { LucideIcon } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { DashboardNavItem } from "./types";

interface DashboardShellProps {
  brandLabel: string;
  navItems: DashboardNavItem[];
  groups?: string[];
  activeItemId: string;
  onNavigate: (item: DashboardNavItem) => void;
  sidebarFooter?: React.ReactNode;
  header: {
    avatarIcon: LucideIcon;
    displayName: string;
    subtitle: React.ReactNode;
    available?: boolean;
    onToggleAvailable?: () => void;
    onEditProfile: () => void;
    onViewPublicProfile?: () => void;
    extraMenuItems?: React.ReactNode;
    search?: React.ReactNode;
  };
  children: React.ReactNode;
}

const DashboardShell = ({ brandLabel, navItems, groups, activeItemId, onNavigate, sidebarFooter, header, children }: DashboardShellProps) => {
  return (
    <SidebarProvider>
      <DashboardSidebar
        brandLabel={brandLabel}
        navItems={navItems}
        groups={groups}
        activeItemId={activeItemId}
        onNavigate={onNavigate}
        footer={sidebarFooter}
      />
      <SidebarInset>
        <DashboardHeader {...header} />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardShell;
