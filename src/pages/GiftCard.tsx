import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { GIFT_HIGHLIGHTS, GIFT_LIST_PRICE_USD, formatGiftCode } from "@/lib/gift";

interface GiftCardData {
  found: boolean;
  code?: string;
  months?: number;
  from_name?: string | null;
  to_name?: string | null;
  note?: string | null;
  redeemed?: boolean;
  void?: boolean;
  expired?: boolean;
}

// A printable (or save-as-PDF) gift card: who it's from, their note, what Home
// Hero does for a homeowner, and the code with a QR that opens the redeem page.
// Reached from the gift emails; the code in the link is the only key.
const GiftCard = () => {
  const [params] = useSearchParams();
  const code = formatGiftCode(params.get("code") ?? "");
  const [card, setCard] = useState<GiftCardData | null>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_gift_card" as never, { p_code: code } as never);
      if (cancelled) return;
      setCard(error ? { found: false } : (data as GiftCardData | null) ?? { found: false });
    })();
    return () => { cancelled = true; };
  }, [code]);

  const redeemUrl = card?.code ? `${window.location.origin}/redeem-gift?code=${encodeURIComponent(card.code)}` : "";
  useEffect(() => {
    if (!redeemUrl) return;
    QRCode.toDataURL(redeemUrl, { margin: 1, width: 240, color: { dark: "#0c4a76", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [redeemUrl]);

  if (card === null) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!card.found) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">We couldn't find that gift</h1>
        <p className="max-w-md text-muted-foreground">Check that the link is complete, or write <a className="underline" href="mailto:office@trimblyhome.com">office@trimblyhome.com</a>.</p>
        <Button asChild variant="outline"><Link to="/">Go to Trimbly</Link></Button>
      </div>
    );
  }

  const unusable = card.redeemed || card.void || card.expired;
  const status = card.redeemed ? "This gift has already been redeemed." : card.void ? "This gift is no longer active." : card.expired ? "This gift has expired." : "";
  const years = (card.months ?? 12) / 12;
  const term = Number.isInteger(years) ? `${years} year${years === 1 ? "" : "s"}` : `${card.months} months`;

  return (
    <div className="min-h-screen bg-secondary py-6 print:min-h-0 print:bg-white print:py-0">
      {/* Print: one letter page, and none of the site's floating banners (cookie notice, offline bar, bottom nav). */}
      <style>{`@media print { @page { size: letter; margin: 0.4in; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; } .fixed { display: none !important; } }`}</style>

      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-muted-foreground">Print this card, save it as a PDF, or forward the link to the person getting the gift.</p>
        <Button onClick={() => window.print()} className="shrink-0 gap-2"><Printer className="h-4 w-4" /> Print or save PDF</Button>
      </div>

      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-white text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex items-center gap-4 bg-[#0c4a76] px-8 py-6 text-white">
          <BrandMark className="h-14 w-14 bg-white" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fd3f5]">A gift for your home</p>
            <h1 className="font-display text-3xl font-bold leading-tight">
              {card.to_name ? `${card.to_name}, a year of Home Hero is yours` : `A ${term} of Trimbly Home Hero is yours`}
            </h1>
          </div>
        </header>

        <div className="space-y-6 px-8 py-6">
          {card.from_name && <p className="text-lg font-semibold text-[#0c4a76]">A gift from {card.from_name}</p>}

          {card.note && (
            <blockquote className="whitespace-pre-wrap rounded-xl border-l-4 border-[#4cb85a] bg-[#f3faf4] px-5 py-4 text-lg leading-relaxed text-slate-800">
              {card.note}
            </blockquote>
          )}

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1476c4]">What Trimbly does for your home</h2>
            <p className="mt-1 text-slate-700">
              Trimbly is the app that keeps track of everything a home needs, so the first year of ownership has fewer surprises.
              Home Hero, worth ${GIFT_LIST_PRICE_USD} a year, includes:
            </p>
            <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {GIFT_HIGHLIGHTS.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4cb85a]" /> {f}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border-2 border-dashed border-[#1476c4] bg-[#eef6fc] p-5">
            {unusable ? (
              <p className="text-center font-semibold text-slate-700">{status}</p>
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1476c4]">Your gift code</p>
                  <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-[#0c4a76]">{card.code}</p>
                  <ol className="mt-3 space-y-1 text-sm text-slate-700">
                    <li>1. Go to <strong>trimblyhome.com/redeem-gift</strong> or scan the code.</li>
                    <li>2. Create a free account, or sign in.</li>
                    <li>3. Enter your code. Home Hero turns on for {term}.</li>
                  </ol>
                </div>
                {qr && <img src={qr} alt="QR code to redeem your gift" className="h-32 w-32 shrink-0" />}
              </div>
            )}
          </section>

          <p className="text-xs leading-relaxed text-slate-500">
            One-time code, redeemable once within 24 months of purchase. Home Hero runs for {term} from the day it is redeemed.
            Questions? office@trimblyhome.com
          </p>
        </div>
      </article>
    </div>
  );
};

export default GiftCard;
