import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Gift as GiftIcon, Loader2, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BETA_FREE_ACCESS } from "@/lib/pricingTiers";
import {
  GIFT_HIGHLIGHTS,
  GIFT_LIST_PRICE_USD,
  GIFT_MAX_QUANTITY,
  GIFT_NOTE_MAX,
  GIFT_PRICE_USD,
  describeGiftError,
  emptyGift,
  giftOrderSchema,
  resizeGifts,
  type GiftItem,
} from "@/lib/gift";

const highlights = GIFT_HIGHLIGHTS;

const Gift = () => {
  const [searchParams] = useSearchParams();
  const thanks = searchParams.get("thanks") === "1";
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    quantity: 1,
    note: "",
    gifts: [emptyGift()],
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setGift = (index: number, patch: Partial<GiftItem>) =>
    setForm((f) => ({ ...f, gifts: f.gifts.map((g, i) => (i === index ? { ...g, ...patch } : g)) }));
  const setQuantity = (quantity: number) => setForm((f) => ({ ...f, quantity, gifts: resizeGifts(f.gifts, quantity) }));
  const total = GIFT_PRICE_USD * form.quantity;
  const many = form.quantity > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = giftOrderSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(describeGiftError(parsed.error.issues[0]));
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-gift-checkout", { body: parsed.data });
      if (error || !data?.url) {
        toast.error(data?.error || "We couldn't start checkout. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("We couldn't start checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {thanks && (
            <Card className="mb-8 border-success/40 bg-success/10">
              <CardContent className="pt-6 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Thank you! Your gift is on its way.</p>
                  <p className="text-sm text-muted-foreground">
                    We're emailing your gift code now. It usually arrives within a minute; check spam if you don't see it.
                    Anything wrong? Write <a className="underline text-primary" href="mailto:office@trimblyhome.com">office@trimblyhome.com</a>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
            <section>
              <p className="brand-kicker flex items-center gap-2"><GiftIcon className="h-4 w-4" /> Give a gift</p>
              <h1 className="font-display mt-3 text-4xl font-bold leading-tight text-foreground md:text-5xl">
                A year of Home Hero for someone who just got the keys.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                A new homeowner's first year is full of surprises. This gift keeps them ahead of it: maintenance reminders,
                repair-cost estimates, a digital home binder, and local pros, all in one app.
              </p>

              <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-4xl font-bold text-foreground">${GIFT_PRICE_USD}</span>
                <span className="text-muted-foreground">for 12 months, instead of ${GIFT_LIST_PRICE_USD} at $5/month</span>
              </div>

              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {highlights.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-xl border border-border bg-secondary p-5">
                <p className="text-sm font-bold uppercase tracking-wide text-primary">How it works</p>
                <ol className="mt-3 space-y-2 text-sm text-foreground">
                  <li><strong>1.</strong> You pay once. No account needed.</li>
                  <li><strong>2.</strong> We email you every gift code with a printable gift card. If you add someone's email, we email them their gift too, with your name and your note.</li>
                  <li><strong>3.</strong> They create a free Trimbly account, enter the code, and Home Hero turns on for 12 months from that day.</li>
                </ol>
                <p className="mt-3 text-sm text-muted-foreground">
                  Giving to more than {GIFT_MAX_QUANTITY} people? Place another order. Questions? Write{" "}
                  <a className="underline text-primary" href="mailto:office@trimblyhome.com">office@trimblyhome.com</a>.
                </p>
              </div>

              {BETA_FREE_ACCESS && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Trimbly is in free early access, so Home Hero is open to everyone right now. A gift guarantees a full
                  12 months of Home Hero from the day it's redeemed, including after early access ends.
                </p>
              )}
            </section>

            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Send a gift</CardTitle>
                <CardDescription>You'll pay securely with Stripe on the next screen.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="buyerName">Your name</Label>
                      <Input id="buyerName" value={form.buyerName} maxLength={80} placeholder="Dana Keller, Keller Realty"
                        onChange={(e) => set("buyerName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyerEmail">Your email</Label>
                      <Input id="buyerEmail" type="email" value={form.buyerEmail} maxLength={254} placeholder="you@example.com" required
                        onChange={(e) => set("buyerEmail", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">How many gifts?</Label>
                    <Input id="quantity" type="number" inputMode="numeric" min={1} max={GIFT_MAX_QUANTITY} value={form.quantity}
                      onChange={(e) => {
                        const n = Math.round(Number(e.target.value));
                        setQuantity(Number.isFinite(n) ? Math.min(GIFT_MAX_QUANTITY, Math.max(1, n)) : 1);
                      }} />
                    <p className="text-xs text-muted-foreground">Up to {GIFT_MAX_QUANTITY} per order. Each gift gets its own code and card.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">
                      {many ? "Note for every gift" : "A note"} <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea id="note" rows={3} value={form.note} maxLength={GIFT_NOTE_MAX}
                      placeholder="Congratulations on the new home!"
                      onChange={(e) => set("note", e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Printed on the gift card{many ? ", unless you write a different note for a gift below" : ""}. {form.note.length}/{GIFT_NOTE_MAX}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{many ? "Who is each gift for?" : "Who is it for?"}</p>
                      <p className="text-xs text-muted-foreground">
                        Add their email and we send them the gift and card ourselves, with your name on it. Leave it blank
                        to hand it over yourself.
                      </p>
                    </div>
                    {form.gifts.map((g, i) => (
                      <div key={i} className={many ? "space-y-3 rounded-lg border border-border bg-secondary/40 p-3" : "space-y-3"}>
                        {many && <p className="text-sm font-semibold text-foreground">Gift {i + 1}</p>}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`rn-${i}`}>Their name <span className="text-muted-foreground">(optional)</span></Label>
                            <Input id={`rn-${i}`} value={g.recipientName} maxLength={80} placeholder="Sam and Alex"
                              onChange={(e) => setGift(i, { recipientName: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`re-${i}`}>Their email <span className="text-muted-foreground">(optional)</span></Label>
                            <Input id={`re-${i}`} type="email" value={g.recipientEmail} maxLength={254} placeholder="sam@example.com"
                              onChange={(e) => setGift(i, { recipientEmail: e.target.value })} />
                          </div>
                        </div>
                        {many && (
                          <div className="space-y-1.5">
                            <Label htmlFor={`rt-${i}`}>A different note for this gift <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea id={`rt-${i}`} rows={2} value={g.note} maxLength={GIFT_NOTE_MAX}
                              placeholder={form.note ? "Leave blank to use the note above" : "Leave blank for no note"}
                              onChange={(e) => setGift(i, { note: e.target.value })} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GiftIcon className="mr-2 h-4 w-4" />}
                    Continue to payment · ${total}
                  </Button>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Each code works once and can be redeemed within 24 months of purchase. Home Hero runs for 12 months from the day
                    it's redeemed. Gifts are non-refundable. Problem with your order? Write{" "}
                    <a className="underline" href="mailto:office@trimblyhome.com">office@trimblyhome.com</a>. See our{" "}
                    <Link className="underline" to="/terms">Terms</Link> and <Link className="underline" to="/privacy">Privacy Policy</Link>.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Got a gift code? <Link className="underline text-primary" to="/redeem-gift">Redeem it here</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Gift;
