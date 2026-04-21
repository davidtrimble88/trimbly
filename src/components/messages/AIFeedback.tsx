import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, ThumbsUp, ThumbsDown, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  messageId: string;
  contactMessageId: string;
  attempt: number;
  maxAttempts: number;
  onResolved: () => void;
}

export const AIFeedback = ({ messageId, contactMessageId, attempt, maxAttempts, onResolved }: Props) => {
  const { toast } = useToast();
  const [stage, setStage] = useState<"ask" | "details" | "submitting" | "done-yes" | "done-escalated">("ask");
  const [details, setDetails] = useState("");

  const markAIMetaResolved = async (resolved: boolean) => {
    // Clear awaiting_feedback so we don't show buttons again
    const { data: msg } = await supabase.from("messages").select("ai_meta").eq("id", messageId).maybeSingle();
    const newMeta = { ...(msg?.ai_meta as any), awaiting_feedback: false, user_marked_helpful: resolved };
    await supabase.from("messages").update({ ai_meta: newMeta }).eq("id", messageId);
  };

  const handleYes = async () => {
    setStage("submitting");
    await markAIMetaResolved(true);
    await supabase.from("contact_messages").update({ status: "resolved" }).eq("id", contactMessageId);
    setStage("done-yes");
    toast({ title: "Glad we could help!", description: "Marked as resolved." });
    setTimeout(onResolved, 1200);
  };

  const handleNo = () => setStage("details");

  const submitFollowUp = async () => {
    if (!details.trim()) {
      toast({ title: "Please add a bit of detail", variant: "destructive" });
      return;
    }
    setStage("submitting");
    await markAIMetaResolved(false);

    try {
      const { data, error } = await supabase.functions.invoke("contact-auto-reply", {
        body: { messageId: contactMessageId, followUpDetails: details.trim() },
      });
      if (error) throw error;
      if (data?.escalated) {
        setStage("done-escalated");
        toast({ title: "Sent to our team", description: "A human will reply within 48 hours." });
      } else if (data?.should_reply) {
        toast({ title: "New AI reply on the way!" });
        onResolved();
      } else {
        // AI couldn't help but more attempts remain
        setStage("done-escalated");
        toast({ title: "Sent to our team", description: "We'll get back to you soon." });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Something went wrong", variant: "destructive" });
      setStage("ask");
    }
  };

  if (stage === "submitting") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" /> Thinking...
      </div>
    );
  }

  if (stage === "done-yes") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-primary">
        <CheckCircle2 size={12} /> Marked as resolved
      </div>
    );
  }

  if (stage === "done-escalated") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 size={12} /> Forwarded to our human team
      </div>
    );
  }

  if (stage === "details") {
    const remaining = maxAttempts - attempt;
    return (
      <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Bot size={12} />
          {remaining > 0
            ? `Tell me what was missing — I'll try again. (${remaining} ${remaining === 1 ? "try" : "tries"} left before a human takes over)`
            : "I'll forward this to our team."}
        </p>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What were you actually looking for?"
          className="min-h-[60px] text-xs"
          maxLength={1000}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={submitFollowUp} className="h-7 text-xs">Send</Button>
          <Button size="sm" variant="ghost" onClick={() => setStage("ask")} className="h-7 text-xs">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Bot size={12} /> Was this helpful?
      </span>
      <Button size="sm" variant="outline" onClick={handleYes} className="h-7 text-xs gap-1">
        <ThumbsUp size={12} /> Yes
      </Button>
      <Button size="sm" variant="outline" onClick={handleNo} className="h-7 text-xs gap-1">
        <ThumbsDown size={12} /> No
      </Button>
    </div>
  );
};
