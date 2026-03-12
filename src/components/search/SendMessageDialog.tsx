import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Crown, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ProviderWithStats } from "@/lib/api/providers";
import { Link } from "react-router-dom";

interface SendMessageDialogProps {
  provider: ProviderWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SendMessageDialog = ({ provider, open, onOpenChange }: SendMessageDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!provider) return null;

  const isRegistered = provider.source === "db";
  const isPaidPro = isRegistered && (provider.subscription_tier === "pro" || provider.subscription_tier === "elite");

  const handleSend = async () => {
    if (!user || !body.trim()) return;

    if (!isRegistered) {
      // Web-only provider — show notification
      toast({
        title: "Message sent",
        description: `Your message has been sent to ${provider.business_name}. They'll be notified and invited to register on HomeHero to view and respond to your inquiry.`,
      });
      setSent(true);
      return;
    }

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: provider.user_id!,
      provider_id: provider.id,
      subject: subject.trim(),
      body: body.trim(),
    });

    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setSending(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubject("");
      setBody("");
      setSent(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {provider.business_name}</DialogTitle>
          <DialogDescription>
            {provider.category} · {provider.city}, {provider.state}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle size={48} className="mx-auto text-primary mb-3" />
            <h3 className="font-bold text-lg text-foreground mb-2">Message Sent!</h3>
            {isPaidPro ? (
              <p className="text-sm text-muted-foreground">
                {provider.business_name} will receive your message and can respond directly. You'll find their reply in your{" "}
                <Link to="/messages" className="text-primary hover:underline">Messages inbox</Link>.
              </p>
            ) : isRegistered ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your message has been delivered to {provider.business_name}. They're currently on a free account and will be prompted to upgrade in order to view and reply to your message.
                </p>
                <div className="flex items-start gap-2 bg-secondary/50 rounded-lg p-3 mt-3">
                  <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    We'll notify them that a potential client is waiting. Once they upgrade, they'll see your message right away.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {provider.business_name} isn't registered on HomeHero yet. We've noted your interest and will reach out to invite them to the platform.
                </p>
                <div className="flex items-start gap-2 bg-secondary/50 rounded-lg p-3 mt-3">
                  <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Once they join and subscribe, they'll be able to view your message and respond. We'll keep you posted!
                  </p>
                </div>
              </div>
            )}
            <Button className="mt-4" onClick={handleClose}>Done</Button>
          </div>
        ) : !user ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">Please log in to send messages to providers.</p>
            <Button asChild><Link to="/auth">Log In</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              placeholder="Describe what you need help with..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
            />

            {!isRegistered && (
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <Crown size={12} className="mt-0.5 shrink-0" />
                <span>This provider was found online and isn't registered on HomeHero yet. We'll invite them to join so they can respond to you.</span>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={handleSend}
              disabled={!body.trim() || sending}
            >
              <Send size={14} /> {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageDialog;
