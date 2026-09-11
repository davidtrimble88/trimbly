import { LucideIcon } from "lucide-react";

interface ToolSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const ToolSectionHeader = ({ icon: Icon, title, description }: ToolSectionHeaderProps) => (
  <div className="flex items-center gap-2 mb-1">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon size={16} className="text-primary" />
    </div>
    <div>
      <h2 className="font-display text-lg font-semibold text-foreground leading-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);
