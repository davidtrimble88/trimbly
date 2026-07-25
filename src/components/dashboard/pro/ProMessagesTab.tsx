import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import type { MessageRow } from "./types";

interface ProMessagesTabProps {
  messages: MessageRow[];
}

const ProMessagesTab = ({ messages }: ProMessagesTabProps) => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Messages</h2>
        <Button size="sm" variant="outline" onClick={() => navigate("/messages")} className="gap-1.5">
          <MessageSquare size={14} /> Open Inbox
        </Button>
      </div>
      {messages.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1">No messages yet</h3>
            <p className="text-sm text-muted-foreground">Homeowners will message you when they're interested in your services.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.slice(0, 10).map((msg) => (
            <Card
              key={msg.id}
              className={`cursor-pointer hover:border-primary/20 transition-colors ${!msg.read ? "border-primary/30 bg-primary/5" : ""}`}
              onClick={() => navigate("/messages")}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm ${!msg.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {msg.subject || "No subject"}
                      </h3>
                      {!msg.read && <Badge className="text-xs bg-primary text-primary-foreground">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{msg.body}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {messages.length > 10 && (
            <Button variant="ghost" className="w-full" onClick={() => navigate("/messages")}>
              View all messages →
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProMessagesTab;
