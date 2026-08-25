import { useState } from "react";
import { LucideIcon, MoreVertical, Pencil, ExternalLink, Zap, LogOut, Smartphone } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import InstallAppDialog from "@/components/InstallAppDialog";

interface DashboardHeaderProps {
  avatarIcon: LucideIcon;
  displayName: string;
  subtitle: React.ReactNode;
  available?: boolean;
  onToggleAvailable?: () => void;
  onEditProfile: () => void;
  onViewPublicProfile?: () => void;
  extraMenuItems?: React.ReactNode;
  search?: React.ReactNode;
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
  search,
}: DashboardHeaderProps) => {
  const { signOut, avatarUrl } = useAuth();
  const navigate = useNavigate();
  const [installOpen, setInstallOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 py-3 md:px-6">
      <SidebarTrigger />
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/10">
            <AvatarIcon className="h-5 w-5 text-primary" />
          </AvatarFallback>
        </Avatar>
        {onToggleAvailable && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card ${available ? "bg-primary" : "bg-muted-foreground"}`}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-foreground truncate">{displayName}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5" data-tour="header-tier">{subtitle}</div>
      </div>
      {search && <div className="hidden lg:block shrink-0">{search}</div>}
      <div className="flex items-center gap-2 shrink-0">
        {onToggleAvailable && (
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <span className="text-xs text-muted-foreground">Available</span>
            <Switch checked={available} onCheckedChange={onToggleAvailable} />
          </div>
        )}
        {onViewPublicProfile && (
          <Button variant="outline" size="sm" className="hidden md:inline-flex rounded-lg" onClick={onViewPublicProfile}>
            <ExternalLink size={14} className="mr-1.5" /> View Public Profile
          </Button>
        )}
        <Button variant="outline" size="sm" className="hidden md:inline-flex rounded-lg gap-1.5" onClick={() => setInstallOpen(true)}>
          <Smartphone size={14} /> Download App
        </Button>
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-lg" aria-label="More options">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onToggleAvailable && (
              <DropdownMenuItem onClick={onToggleAvailable} className="sm:hidden">
                <Zap size={14} className="mr-2" />
                {available ? "Set Unavailable" : "Set Available"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEditProfile}>
              <Pencil size={14} className="mr-2" /> Edit Profile
            </DropdownMenuItem>
            {onViewPublicProfile && (
              <DropdownMenuItem onClick={onViewPublicProfile} className="md:hidden">
                <ExternalLink size={14} className="mr-2" /> View Public Profile
              </DropdownMenuItem>
            )}
            {extraMenuItems}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setInstallOpen(true)}>
              <Smartphone size={14} className="mr-2" /> Download App
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut size={14} className="mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <InstallAppDialog open={installOpen} onOpenChange={setInstallOpen} />
    </header>
  );
};

export default DashboardHeader;
