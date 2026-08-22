import ProfileEditor from "@/components/profile/ProfileEditor";
import ProfileCompletenessCard from "@/components/ProfileCompletenessCard";
import SavedProvidersCard from "@/components/SavedProvidersCard";
import { ShareTrimblyCard } from "@/components/ShareTrimblyCard";
import NotificationPreferencesDialog from "@/components/NotificationPreferencesDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface HomeownerProfileTabProps {
  userId: string;
  displayName: string;
}

const HomeownerProfileTab = ({ userId, displayName }: HomeownerProfileTabProps) => (
  <div className="space-y-6">
    <ProfileEditor userId={userId} displayName={displayName} />
    <div className="grid md:grid-cols-2 gap-4">
      <ProfileCompletenessCard />
      <SavedProvidersCard />
    </div>
    <Card>
      <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Notification preferences</p>
            <p className="text-xs text-muted-foreground">Choose what you'd like to be notified about</p>
          </div>
        </div>
        <NotificationPreferencesDialog trigger={<Button variant="outline" size="sm">Manage</Button>} />
      </CardContent>
    </Card>
    <ShareTrimblyCard />
  </div>
);

export default HomeownerProfileTab;
