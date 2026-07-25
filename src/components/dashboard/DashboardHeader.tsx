import { LucideIcon, MoreVertical, Pencil, ExternalLink, Zap, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  avatarIcon: LucideIcon;
  displayName: string;
  subtitle: React.ReactNode;
  available: boolean;
  onToggleAvailable: () => void;
  onEditProfile: () => void;
  onViewPublicProfile: () => void;
  extraMenuItems?: React.ReactNode;
}

const DashboardHeader = ({
  avatarIcon: AvatarIcon,
  displayName,
  subtitle,
  available,
  onToggleAvailable,
  onEditProfile,
  onViewPublicProfile,
  extraMenuItems,
}: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 py-3 md:px-6">
      <SidebarTrigger />
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <AvatarIcon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-foreground truncate">{displayName}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 mr-1">
          <span className="text-xs text-muted-foreground">Available</span>
          <Switch checked={available} onCheckedChange={onToggleAvailable} />
        </div>
        <Button variant="outline" size="sm" className="hidden md:inline-flex rounded-lg" onClick={onViewPublicProfile}>
          <ExternalLink size={14} className="mr-1.5" /> View Public Profile
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-lg">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleAvailable} className="sm:hidden">
              <Zap size={14} className="mr-2" />
              {available ? "Set Unavailable" : "Set Available"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEditProfile}>
              <Pencil size={14} className="mr-2" /> Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewPublicProfile} className="md:hidden">
              <ExternalLink size={14} className="mr-2" /> View Public Profile
            </DropdownMenuItem>
            {extraMenuItems}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut size={14} className="mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
