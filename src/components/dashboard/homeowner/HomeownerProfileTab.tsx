import ProfileEditor from "@/components/profile/ProfileEditor";
import ProfileCompletenessCard from "@/components/ProfileCompletenessCard";
import SavedProvidersCard from "@/components/SavedProvidersCard";
import { ShareTrimblyCard } from "@/components/ShareTrimblyCard";

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
    <ShareTrimblyCard />
  </div>
);

export default HomeownerProfileTab;
