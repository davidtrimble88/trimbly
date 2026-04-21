import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(10, "Please share a bit more detail (min 10 characters)").max(2000),
});

const Contact = () => {
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    body: "",
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || profileName || "",
        email: f.email || user.email || "",
      }));
    }
  }, [user, profileName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to contact us");
      navigate("/auth");
      return;
    }

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("contact_messages")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        body: parsed.data.body,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      setSubmitting(false);
      toast.error("Failed to send message: " + error.message);
      return;
    }

    // Fire AI auto-reply attempt (non-blocking for UX, but we await briefly to show feedback)
    let autoReplied = false;
    try {
      const { data: autoData } = await supabase.functions.invoke("contact-auto-reply", {
        body: { messageId: inserted?.id },
      });
      autoReplied = !!autoData?.should_reply;
    } catch (err) {
      console.error("Auto-reply attempt failed:", err);
    }

    setSubmitting(false);
    setSubmitted(true);
    setForm((f) => ({ ...f, subject: "", body: "" }));
    if (autoReplied) {
      toast.success("Instant AI reply sent! Check your Messages inbox.");
    } else {
      toast.success("Message sent! We'll reply within 48 hours.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-3">Contact Us</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have a question, feedback, or need help? Send us a message and our team will get back to you.
            </p>
          </div>

          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-foreground">Instant AI replies, plus humans within 48 hours</p>
                <p className="text-sm text-muted-foreground">
                  Our AI assistant may answer common questions about HomeHero immediately. Anything else gets a human reply in your{" "}
                  <a href="/messages" className="underline text-primary">Messages</a> inbox within 48 hours.
                </p>
              </div>
            </CardContent>
          </Card>

          {submitted && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="pt-6 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-foreground">Message sent successfully</p>
                  <p className="text-sm text-muted-foreground">
                    Thanks for reaching out! We'll reply within 48 hours. Check your{" "}
                    <a href="/messages" className="underline text-primary">Messages</a> for our response.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" /> Send us a message
              </CardTitle>
              <CardDescription>
                {user ? "We'll reply to you in your in-app Messages inbox." : "Please sign in to send a message."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      maxLength={255}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="What's this about?"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Tell us what's on your mind..."
                    rows={6}
                    maxLength={2000}
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">{form.body.length}/2000</p>
                </div>
                {!user ? (
                  <Button type="button" className="w-full" onClick={() => navigate("/auth")}>
                    Sign in to send message
                  </Button>
                ) : (
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
