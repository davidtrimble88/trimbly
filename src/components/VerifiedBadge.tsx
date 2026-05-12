import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function VerifiedBadge({ size = 12 }: { size?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="bg-primary/15 text-primary hover:bg-primary/20 gap-1 cursor-help">
          <ShieldCheck size={size} /> Verified
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-xs">License and insurance documents reviewed by HomeHero.</p>
      </TooltipContent>
    </Tooltip>
  );
}
