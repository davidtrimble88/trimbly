import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, DollarSign, MessageSquare, Phone, PhoneOff, Eye } from "lucide-react";
import { bidStatusClasses, bidStatusLabel } from "@/components/dashboard/status";
import type { BidWithJob } from "./types";

interface ProBidsTabProps {
  bids: BidWithJob[];
  bidUnreadCounts: Record<string, number>;
}

const ProBidsTab = ({ bids, bidUnreadCounts }: ProBidsTabProps) => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">My Bids</h2>
        <Button size="sm" onClick={() => navigate("/job-board")} className="gap-1.5">
          <Eye size={14} /> Browse Jobs
        </Button>
      </div>
      {bids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1">No bids yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Browse the job board to find work and send bids to homeowners.</p>
            <Button onClick={() => navigate("/job-board")}>Browse Job Board</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <Card key={bid.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{bid.job?.title || "Job"}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1 mb-2">
                      <span className="flex items-center gap-1"><Briefcase size={12} /> {bid.job?.category}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {bid.job?.city}, {bid.job?.state}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(bid.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5 mb-2">
                      <p className="text-sm text-muted-foreground">{bid.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {bid.bid_amount && (
                        <span className="flex items-center gap-1 text-foreground">
                          <DollarSign size={14} className="text-primary" /> ${Number(bid.bid_amount).toLocaleString()}
                        </span>
                      )}
                      {bid.estimated_hours && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock size={14} /> Est. {bid.estimated_hours} hr{bid.estimated_hours !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {bid.job?.homeowner_id && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant={bidUnreadCounts[bid.job!.homeowner_id!] > 0 ? "default" : "outline"}
                          className="gap-1"
                          onClick={() => navigate(`/messages?partner=${bid.job!.homeowner_id}`)}
                        >
                          <MessageSquare size={14} />
                          {bidUnreadCounts[bid.job!.homeowner_id!] > 0
                            ? `${bidUnreadCounts[bid.job!.homeowner_id!]} new`
                            : "Message"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 text-center shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Badge className={`text-xs ${bidStatusClasses[bid.status] || bidStatusClasses.pending}`}>
                        {bidStatusLabel[bid.status] || bid.status}
                      </Badge>
                      {bid.job?.homeowner_id && bidUnreadCounts[bid.job.homeowner_id] > 0 && (
                        <Badge className="text-xs bg-primary text-primary-foreground gap-1">
                          <MessageSquare size={10} /> {bidUnreadCounts[bid.job.homeowner_id]} new
                        </Badge>
                      )}
                    </div>
                    {bid.call_approved && (
                      <div className="mt-2 text-xs text-primary">
                        <div className="flex items-center gap-1 justify-center">
                          <Phone size={12} /> Call OK
                        </div>
                        {bid.phone_number ? (
                          <a href={`tel:${bid.phone_number}`} className="block mt-1 font-medium hover:underline">
                            {bid.phone_number}
                          </a>
                        ) : (
                          <div className="mt-1 text-muted-foreground">No number shared</div>
                        )}
                      </div>
                    )}
                    {bid.status === "accepted" && !bid.call_approved && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <PhoneOff size={12} /> Msg only
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProBidsTab;
