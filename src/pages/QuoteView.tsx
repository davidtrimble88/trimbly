import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Check, X, Loader2, Printer, ArrowLeft } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteRow {
  id: string;
  provider_id: string;
  homeowner_id: string;
  title: string;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
}

const statusColor = (s: string) => {
  if (s === "accepted") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (s === "paid") return "bg-primary/15 text-primary";
  if (s === "declined") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (s === "sent") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-secondary text-secondary-foreground";
};

const QuoteView = () => {
  const { quoteId = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [providerName, setProviderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
    if (data) {
      setQuote(data as unknown as QuoteRow);
      const { data: prov } = await supabase
        .from("providers")
        .select("business_name")
        .eq("id", (data as any).provider_id)
        .maybeSingle();
      setProviderName(prov?.business_name || "Provider");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) load();
  }, [quoteId, authLoading]);

  const updateStatus = async (status: "accepted" | "declined") => {
    if (!quote) return;
    setActioning(true);
    const { error } = await supabase
      .from("quotes")
      .update({
        status,
        accepted_at: status === "accepted" ? new Date().toISOString() : null,
      })
      .eq("id", quote.id);
    setActioning(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setQuote({ ...quote, status });
    toast({ title: status === "accepted" ? "Quote accepted" : "Quote declined" });
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 container mx-auto px-4 max-w-md text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Quote not found</h1>
          <p className="text-muted-foreground mb-6">This quote doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isHomeowner = user?.id === quote.homeowner_id;
  const canRespond = isHomeowner && quote.status === "sent";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 print:hidden">
            <ArrowLeft size={14} /> Back
          </Button>

          <Card>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Quote from</p>
                  <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                    <FileText className="text-primary" /> {providerName}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(quote.sent_at || quote.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={`${statusColor(quote.status)} capitalize`}>{quote.status}</Badge>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground">{quote.title}</h2>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Line Items
                </h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-3">Description</th>
                        <th className="text-right p-3 w-20">Qty</th>
                        <th className="text-right p-3 w-28">Unit Price</th>
                        <th className="text-right p-3 w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.line_items.map((it, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-3">{it.description}</td>
                          <td className="p-3 text-right">{it.quantity}</td>
                          <td className="p-3 text-right">${Number(it.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-right font-medium">
                            ${(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${Number(quote.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({quote.tax_rate}%)</span>
                    <span>${Number(quote.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                    <span>Total</span>
                    <span>${Number(quote.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {quote.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-line bg-muted/30 rounded-lg p-3">
                    {quote.notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4 border-t border-border print:hidden">
                <Button variant="outline" onClick={() => window.print()} className="gap-1">
                  <Printer size={14} /> Print / Save PDF
                </Button>
                {canRespond && (
                  <>
                    <Button
                      onClick={() => updateStatus("accepted")}
                      disabled={actioning}
                      className="gap-1"
                    >
                      <Check size={14} /> Accept Quote
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateStatus("declined")}
                      disabled={actioning}
                      className="gap-1 text-destructive"
                    >
                      <X size={14} /> Decline
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuoteView;
