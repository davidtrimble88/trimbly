import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, RefreshCw, AlertTriangle, Calculator } from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

// ---------- Types ----------
type TaxApi = {
  revenue: {
    mrr: number; arr: number;
    homeowner_mrr: number; provider_mrr: number;
    ytd_sub_revenue: number; projected_year_revenue: number;
    gmv_rentals_ytd: number; gmv_rentals_lifetime: number;
    months_elapsed: number; months_remaining: number;
  };
  users: {
    paid_homeowners: number; paid_providers: number; paid_total: number;
    total_homeowners: number; total_providers: number;
  };
  jurisdiction: { federal: string; state: string; city: string; registered_address: string };
  tax_year: number;
  generated_at: string;
};

type EntityType = "c_corp" | "s_corp" | "llc" | "sole_prop";

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtUSD2 = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

// ---------- Standard SaaS write-off categories (editable in UI) ----------
const DEFAULT_WRITE_OFFS = [
  { category: "Cloud hosting & infrastructure (Supabase, Vercel, CDN)", annual: 0, irs_ref: "IRC §162 — ordinary business expense" },
  { category: "Software & SaaS subscriptions (dev tools, APIs)", annual: 0, irs_ref: "IRC §162" },
  { category: "Contractor & freelancer payments (1099-NEC)", annual: 0, irs_ref: "Schedule C / Form 1120 Line 11" },
  { category: "Employee salaries & wages (W-2)", annual: 0, irs_ref: "Form 1120 Line 13" },
  { category: "Payroll taxes (employer FICA, FUTA, CA SUI)", annual: 0, irs_ref: "Form 1120 Line 17" },
  { category: "Employee benefits & health insurance", annual: 0, irs_ref: "IRC §162(l)" },
  { category: "Marketing, advertising & SEO", annual: 0, irs_ref: "IRC §162 — advertising" },
  { category: "Professional services (legal, accounting, tax prep)", annual: 0, irs_ref: "IRC §162" },
  { category: "Merchant processing fees (Stripe, Paddle)", annual: 0, irs_ref: "IRC §162" },
  { category: "Office rent / coworking (Hollywood, CA)", annual: 0, irs_ref: "IRC §162" },
  { category: "Home office deduction (if applicable)", annual: 0, irs_ref: "IRC §280A(c)(1) — Form 8829" },
  { category: "Business insurance (E&O, general liability, cyber)", annual: 0, irs_ref: "IRC §162" },
  { category: "Travel, meals (50%) & conferences", annual: 0, irs_ref: "IRC §274" },
  { category: "Equipment & computer depreciation", annual: 0, irs_ref: "IRC §179 / Bonus depreciation" },
  { category: "R&D expenses (software development)", annual: 0, irs_ref: "IRC §174 — must amortize 5 yrs (US)" },
  { category: "Bank, merchant & SaaS subscription fees", annual: 0, irs_ref: "IRC §162" },
  { category: "Domain, trademarks & IP", annual: 0, irs_ref: "IRC §162 / §197 amortization" },
];

// ---------- Tax math ----------
// Federal C-Corp: flat 21% (IRC §11, post-TCJA)
const FED_C_CORP_RATE = 0.21;
// California Franchise Tax (C-Corp): 8.84% of net income, $800 minimum (R&TC §23151, §23153)
const CA_C_CORP_RATE = 0.0884;
const CA_MIN_FRANCHISE_TAX = 800;
// California S-Corp: 1.5% of net income, $800 minimum
const CA_S_CORP_RATE = 0.015;
// CA LLC: $800 minimum franchise tax + gross-receipts fee tiers (R&TC §17942)
function caLlcGrossReceiptsFee(gross: number): number {
  if (gross < 250_000) return 0;
  if (gross < 500_000) return 900;
  if (gross < 1_000_000) return 2_500;
  if (gross < 5_000_000) return 6_000;
  return 11_790;
}
// City of Los Angeles business tax — "Professions and Occupations" (LAMC §21.49):
// ~$5.07 per $1,000 gross receipts. Small Business Exemption if gross < $100,000.
const LA_RATE_PER_1000 = 5.07;
const LA_SMALL_BIZ_EXEMPTION = 100_000;

// 2024 federal individual brackets (single) — used for sole prop / pass-through estimate
const FED_INDIV_BRACKETS_SINGLE: [number, number][] = [
  [11_600, 0.10],
  [47_150, 0.12],
  [100_525, 0.22],
  [191_950, 0.24],
  [243_725, 0.32],
  [609_350, 0.35],
  [Infinity, 0.37],
];
// 2024 CA individual brackets (single) — simplified, top brackets included
const CA_INDIV_BRACKETS_SINGLE: [number, number][] = [
  [10_756, 0.01],
  [25_499, 0.02],
  [40_245, 0.04],
  [55_866, 0.06],
  [70_606, 0.08],
  [360_659, 0.093],
  [432_787, 0.103],
  [721_314, 0.113],
  [Infinity, 0.123],
];
function progressive(income: number, brackets: [number, number][]): number {
  if (income <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of brackets) {
    const slice = Math.min(income, cap) - prev;
    if (slice > 0) tax += slice * rate;
    if (income <= cap) break;
    prev = cap;
  }
  return tax;
}
// SE tax: 15.3% on 92.35% of net SE earnings (12.4% SS up to wage base + 2.9% Medicare)
function selfEmploymentTax(netSe: number): number {
  if (netSe <= 0) return 0;
  const taxable = netSe * 0.9235;
  const ss = Math.min(taxable, 168_600) * 0.124;
  const med = taxable * 0.029;
  return ss + med;
}

// ---------- Component ----------
const Tax = () => {
  const [data, setData] = useState<TaxApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState<EntityType>("llc");
  const [revenueOverride, setRevenueOverride] = useState<string>(""); // blank = use projected
  const [ownerSalary, setOwnerSalary] = useState<string>("0"); // for pass-through / S-corp
  const [writeOffs, setWriteOffs] = useState(DEFAULT_WRITE_OFFS);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: res, error } = await supabase.functions.invoke("staff-tax", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as TaxApi);
    } catch (e: any) {
      setError(e.message || "Failed to load tax data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ---------- Derived numbers ----------
  const grossRevenue = useMemo(() => {
    const override = parseFloat(revenueOverride);
    if (!isNaN(override) && override > 0) return override;
    return data?.revenue.projected_year_revenue ?? 0;
  }, [revenueOverride, data]);

  const totalWriteOffs = useMemo(
    () => writeOffs.reduce((acc, w) => acc + (Number(w.annual) || 0), 0),
    [writeOffs]
  );

  const netIncome = Math.max(0, grossRevenue - totalWriteOffs);
  const salary = Math.max(0, parseFloat(ownerSalary) || 0);

  // City of LA business tax
  const laBusinessTax = grossRevenue < LA_SMALL_BIZ_EXEMPTION
    ? 0
    : (grossRevenue / 1000) * LA_RATE_PER_1000;
  const laExempt = grossRevenue < LA_SMALL_BIZ_EXEMPTION;

  // Federal + state by entity
  const estimate = useMemo(() => {
    if (entityType === "c_corp") {
      const federal = netIncome * FED_C_CORP_RATE;
      const stateTax = Math.max(netIncome * CA_C_CORP_RATE, CA_MIN_FRANCHISE_TAX);
      return {
        federal, stateTax, seTax: 0, individualFed: 0, individualCa: 0,
        notes: ["C-Corp flat 21% federal", "CA 8.84% with $800 minimum franchise tax"],
      };
    }
    if (entityType === "s_corp") {
      // S-Corp: business income flows to owner; entity pays CA 1.5% min $800.
      const passThrough = Math.max(0, netIncome - salary);
      const ownerTotal = salary + passThrough;
      const federalEntity = 0;
      const stateEntity = Math.max(netIncome * CA_S_CORP_RATE, CA_MIN_FRANCHISE_TAX);
      const individualFed = progressive(ownerTotal, FED_INDIV_BRACKETS_SINGLE);
      const individualCa = progressive(ownerTotal, CA_INDIV_BRACKETS_SINGLE);
      // Payroll FICA on salary (employer + employee share — owner pays both effectively)
      const fica = salary * 0.153;
      return {
        federal: federalEntity, stateTax: stateEntity, seTax: fica,
        individualFed, individualCa,
        notes: [
          "S-Corp: entity pays CA 1.5% (min $800). Federal flows to owner.",
          "Owner pays reasonable salary (FICA 15.3%) + individual income tax on rest.",
        ],
      };
    }
    if (entityType === "llc") {
      // Single-member LLC by default — disregarded entity for federal income tax.
      // CA: NOT subject to the corporate franchise tax (8.84%). Instead pays the
      // R&TC §17941 "Annual LLC Tax" ($800/yr, Form 3522) + R&TC §17942 gross-
      // receipts fee (Form 3536) tiered on total California source income.
      const federalEntity = 0;
      const llcFee = caLlcGrossReceiptsFee(grossRevenue);
      const stateEntity = CA_MIN_FRANCHISE_TAX + llcFee; // $800 annual + tier fee
      const individualFed = progressive(netIncome, FED_INDIV_BRACKETS_SINGLE);
      const individualCa = progressive(netIncome, CA_INDIV_BRACKETS_SINGLE);
      const seTax = selfEmploymentTax(netIncome);
      return {
        federal: federalEntity, stateTax: stateEntity, seTax, individualFed, individualCa,
        notes: [
          "LLC is a pass-through — no federal corporate income tax. Profit flows to the owner's 1040 Schedule C.",
          "CA does NOT charge the 8.84% corporate franchise tax on LLCs. Instead, every CA LLC owes the $800 Annual LLC Tax (R&TC §17941, Form 3522) regardless of income or activity.",
          `On top of that, CA charges the §17942 LLC Fee tiered on gross receipts (Form 3536): currently ${fmtUSD(llcFee)} at ${fmtUSD(grossRevenue)} of revenue.`,
          "Owner pays self-employment tax (15.3%) + federal & CA individual income tax on net profit.",
        ],
      };
    }
    const individualFed = progressive(netIncome, FED_INDIV_BRACKETS_SINGLE);
    const individualCa = progressive(netIncome, CA_INDIV_BRACKETS_SINGLE);
    const seTax = selfEmploymentTax(netIncome);
    return {
      federal: 0, stateTax: 0, seTax, individualFed, individualCa,
      notes: [
        "Sole proprietor — all profit reported on Schedule C.",
        "Self-employment tax 15.3% on 92.35% of net earnings.",
        "Owner pays individual federal + CA income tax on net profit.",
      ],
    };
  }, [entityType, netIncome, salary, grossRevenue]);

  const totalTax = estimate.federal + estimate.stateTax + estimate.seTax + estimate.individualFed + estimate.individualCa + laBusinessTax;
  const effectiveRate = grossRevenue > 0 ? totalTax / grossRevenue : 0;

  // Quarterly estimated payments (federal + state, rolled together)
  const quarterly = (estimate.federal + estimate.individualFed + estimate.seTax + estimate.stateTax + estimate.individualCa) / 4;

  // Pie chart data
  const taxBreakdown = [
    { name: "Federal corporate", value: estimate.federal },
    { name: "Federal individual", value: estimate.individualFed },
    { name: "Self-employment / FICA", value: estimate.seTax },
    { name: "CA state", value: estimate.stateTax + estimate.individualCa },
    { name: "City of LA business tax", value: laBusinessTax },
  ].filter((d) => d.value > 0);
  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ef4444", "#8b5cf6"];

  // ---------- Excel export ----------
  const downloadExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const summary = [
      ["Trimbly — Tax Estimate & Filing Package"],
      [`Tax Year: ${data.tax_year}`, `Generated: ${new Date(data.generated_at).toLocaleString()}`],
      ["Registered Address", data.jurisdiction.registered_address],
      [],
      ["Entity type", entityType.replace("_", "-").toUpperCase()],
      ["Gross revenue (projected)", grossRevenue],
      ["Total write-offs", totalWriteOffs],
      ["Net taxable income", netIncome],
      [],
      ["TAX LIABILITY"],
      ["Federal corporate (21% C-Corp)", estimate.federal],
      ["Federal individual (pass-through)", estimate.individualFed],
      ["Self-employment / FICA", estimate.seTax],
      ["CA state corporate / franchise", estimate.stateTax],
      ["CA state individual (pass-through)", estimate.individualCa],
      ["City of LA business tax", laBusinessTax],
      ["TOTAL ANNUAL TAX", totalTax],
      ["Effective rate", effectiveRate],
      ["Quarterly estimated payment", quarterly],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

    const revenue = [
      ["Revenue Source", "YTD", "Projected Annual"],
      ["Homeowner subscriptions (MRR)", "", data.revenue.homeowner_mrr * 12],
      ["Provider subscriptions (MRR)", "", data.revenue.provider_mrr * 12],
      ["Total subscription revenue", data.revenue.ytd_sub_revenue, data.revenue.projected_year_revenue],
      ["Rental marketplace GMV (informational)", data.revenue.gmv_rentals_ytd, ""],
      [],
      ["Current MRR", data.revenue.mrr],
      ["Current ARR", data.revenue.arr],
      ["Paying homeowners", data.users.paid_homeowners],
      ["Paying providers", data.users.paid_providers],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenue), "Revenue");

    const woRows = [
      ["Write-off Category", "Annual Amount", "IRS / FTB Reference"],
      ...writeOffs.map((w) => [w.category, Number(w.annual) || 0, w.irs_ref]),
      ["TOTAL WRITE-OFFS", totalWriteOffs, ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(woRows), "Write-Offs");

    const fees = businessFees().map((f) => [f.name, f.amount, f.frequency, f.due, f.authority]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Fee / Filing", "Amount", "Frequency", "Due", "Authority"], ...fees]),
      "Business Fees"
    );

    const filings = filingChecklist().map((f) => [f.form, f.entity, f.due, f.authority, f.notes]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Form", "Applies To", "Due", "Authority", "Notes"], ...filings]),
      "Filing Checklist"
    );

    const quarterDates = ["Apr 15", "Jun 17", "Sep 16", "Jan 15 (next yr)"];
    const quarters = quarterDates.map((d, i) => [`Q${i + 1}`, d, quarterly]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Quarter", "Due", "Estimated Payment (USD)"], ...quarters]),
      "Quarterly Estimates"
    );

    XLSX.writeFile(wb, `trimbly-tax-${data.tax_year}-${entityType}.xlsx`);
    toast.success("Tax package downloaded");
  };

  // ---------- Static reference tables ----------
  function businessFees() {
    const llcFee = caLlcGrossReceiptsFee(grossRevenue);
    const rows = [
      {
        name: entityType === "llc"
          ? "CA Annual LLC Tax (Form 3522)"
          : entityType === "sole_prop"
            ? "CA — no entity-level tax (sole prop)"
            : "CA Franchise Tax — minimum",
        amount: entityType === "sole_prop" ? 0 : CA_MIN_FRANCHISE_TAX,
        frequency: "Annual",
        due: entityType === "llc" ? "Apr 15 (1st year: 15th day of 4th month after formation)" : "Apr 15",
        authority: "CA FTB",
      },
      { name: "CA Statement of Information", amount: entityType === "c_corp" || entityType === "s_corp" ? 25 : 20, frequency: entityType.includes("corp") ? "Annual" : "Biennial", due: "Anniversary month", authority: "CA Secretary of State" },
      { name: "City of LA business tax registration", amount: laExempt ? 0 : laBusinessTax, frequency: "Annual", due: "Feb 28 (renewal)", authority: "LA Office of Finance" },
      { name: "LA Small Business Exemption filing", amount: 0, frequency: "Annual (if gross < $100k)", due: "Feb 28", authority: "LA Office of Finance" },
    ];
    if (entityType === "llc" && llcFee > 0) {
      rows.push({ name: `CA LLC gross-receipts fee (tier)`, amount: llcFee, frequency: "Annual", due: "Jun 15 (Form 3536)", authority: "CA FTB" });
    }
    return rows;
  }

  function filingChecklist() {
    const base = [
      { form: "Form W-9 collection from contractors", entity: "All", due: "Before payment", authority: "IRS", notes: "Collect before issuing 1099" },
      { form: "Form 1099-NEC", entity: "All (contractors ≥$600)", due: "Jan 31", authority: "IRS", notes: "Issue to contractors + file copy" },
      { form: "Form W-2 / W-3", entity: "If W-2 employees", due: "Jan 31", authority: "IRS / SSA", notes: "" },
      { form: "Form 941 (Employer Quarterly)", entity: "If payroll", due: "Quarterly", authority: "IRS", notes: "FICA + withholding" },
      { form: "Form 940 (FUTA)", entity: "If payroll", due: "Jan 31", authority: "IRS", notes: "" },
      { form: "CA DE 9 / DE 9C (EDD)", entity: "If payroll", due: "Quarterly", authority: "CA EDD", notes: "Wages + SDI/SUI" },
      { form: "CA Form 100-ES (estimates)", entity: "C-Corp", due: "Quarterly", authority: "CA FTB", notes: "Min $800 first installment" },
      { form: "CA Statement of Information", entity: "All entities", due: "Anniversary", authority: "CA SOS", notes: "Form SI-550 (corp) / SI-LLC" },
      { form: "City of LA Business Tax Renewal", entity: "All registered LA businesses", due: "Feb 28", authority: "LA Office of Finance", notes: laExempt ? "File for Small Biz Exemption" : `Owed: ${fmtUSD(laBusinessTax)}` },
    ];
    if (entityType === "c_corp") {
      base.unshift({ form: "Form 1120 (U.S. Corp Income Tax)", entity: "C-Corp", due: "Apr 15", authority: "IRS", notes: "Federal corporate return" });
      base.unshift({ form: "CA Form 100", entity: "C-Corp", due: "Apr 15", authority: "CA FTB", notes: "State corporate return — 8.84% / min $800" });
    }
    if (entityType === "s_corp") {
      base.unshift({ form: "Form 1120-S + K-1s", entity: "S-Corp", due: "Mar 15", authority: "IRS", notes: "Pass-through; K-1 to each shareholder" });
      base.unshift({ form: "CA Form 100S", entity: "S-Corp", due: "Mar 15", authority: "CA FTB", notes: "1.5% net income / min $800" });
    }
    if (entityType === "llc") {
      base.unshift({ form: "Form 1040 Schedule C (SMLLC)", entity: "Single-member LLC", due: "Apr 15", authority: "IRS", notes: "Profit flows to owner 1040" });
      base.unshift({ form: "CA Form 568 (LLC Return)", entity: "LLC", due: "Apr 15", authority: "CA FTB", notes: "$800 + gross-receipts fee" });
      base.unshift({ form: "CA Form 3536 (Estimated LLC Fee)", entity: "LLC", due: "Jun 15", authority: "CA FTB", notes: "Tiered by gross receipts" });
    }
    if (entityType === "sole_prop") {
      base.unshift({ form: "Form 1040 + Schedule C + Schedule SE", entity: "Sole Prop", due: "Apr 15", authority: "IRS", notes: "Profit + SE tax" });
      base.unshift({ form: "CA Form 540", entity: "Sole Prop", due: "Apr 15", authority: "CA FTB", notes: "Individual return" });
    }
    base.push({ form: "Form 1040-ES (Federal estimates)", entity: "All pass-through", due: "Quarterly", authority: "IRS", notes: `~${fmtUSD(quarterly)}/quarter` });
    return base;
  }

  // ---------- Render ----------
  if (loading) {
    return <div className="p-6 text-muted-foreground text-sm">Loading tax data…</div>;
  }
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Could not load tax data</AlertTitle>
        <AlertDescription>{error || "Unknown error"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" /> Tax Estimator — {data.tax_year}
          </h2>
          <p className="text-sm text-muted-foreground">
            {data.jurisdiction.registered_address} · {data.jurisdiction.federal} · {data.jurisdiction.state} · {data.jurisdiction.city}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={downloadExcel}>
            <Download className="h-4 w-4 mr-1" /> Download Tax Package (.xlsx)
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Estimate only — not tax advice</AlertTitle>
        <AlertDescription>
          These numbers use current federal/CA/LA rates and your subscription revenue to project an annual tax bill.
          They do not replace a CPA — confirm before filing, especially for §174 R&D capitalization and depreciation.
        </AlertDescription>
      </Alert>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entity & inputs</CardTitle>
          <CardDescription>Change entity type or override revenue to model scenarios.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Entity type</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="c_corp">C-Corporation</SelectItem>
                <SelectItem value="s_corp">S-Corporation</SelectItem>
                <SelectItem value="llc">LLC (single-member)</SelectItem>
                <SelectItem value="sole_prop">Sole Proprietor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Annual revenue override</Label>
            <Input
              type="number"
              placeholder={fmtUSD(data.revenue.projected_year_revenue)}
              value={revenueOverride}
              onChange={(e) => setRevenueOverride(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Default: projected from current MRR + YTD.</p>
          </div>
          {(entityType === "s_corp") && (
            <div>
              <Label>Owner W-2 salary</Label>
              <Input
                type="number"
                value={ownerSalary}
                onChange={(e) => setOwnerSalary(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Reasonable comp — FICA applies.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Gross revenue" value={fmtUSD(grossRevenue)} sub={`YTD ${fmtUSD(data.revenue.ytd_sub_revenue)}`} />
        <Kpi label="Write-offs" value={fmtUSD(totalWriteOffs)} sub="Editable below" />
        <Kpi label="Net taxable" value={fmtUSD(netIncome)} sub="Gross − write-offs" />
        <Kpi label="Total tax" value={fmtUSD(totalTax)} sub={fmtPct(effectiveRate) + " effective"} highlight />
        <Kpi label="Quarterly estimate" value={fmtUSD(quarterly)} sub="Apr/Jun/Sep/Jan" />
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Tax breakdown</TabsTrigger>
          <TabsTrigger value="writeoffs">Write-offs</TabsTrigger>
          <TabsTrigger value="fees">Business fees</TabsTrigger>
          <TabsTrigger value="filings">Filing checklist</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
        </TabsList>

        {/* Breakdown */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">By jurisdiction</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Federal", value: estimate.federal + estimate.individualFed + estimate.seTax },
                    { name: "California", value: estimate.stateTax + estimate.individualCa },
                    { name: "City of LA", value: laBusinessTax },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtUSD(Number(v))} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Tax mix</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taxBreakdown} dataKey="value" nameKey="name" outerRadius={80} label={(e) => fmtUSD(Number(e.value))}>
                      {taxBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtUSD(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Line items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Authority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <Row item="Federal corporate income tax (21%)" amount={estimate.federal} authority="IRS — Form 1120" />
                  <Row item="Federal individual income tax" amount={estimate.individualFed} authority="IRS — Form 1040" />
                  <Row item="Self-employment / FICA tax" amount={estimate.seTax} authority="IRS — Schedule SE / Form 941" />
                  <Row
                    item={
                      entityType === "llc"
                        ? "CA Annual LLC Tax ($800) + LLC Fee tier"
                        : entityType === "s_corp"
                          ? "CA S-Corp tax (1.5% / $800 min)"
                          : entityType === "sole_prop"
                            ? "CA entity-level tax (none — sole prop)"
                            : "CA corporate franchise tax (8.84% / $800 min)"
                    }
                    amount={estimate.stateTax}
                    authority="CA FTB"
                  />
                  <Row item="CA individual income tax (pass-through)" amount={estimate.individualCa} authority="CA FTB — Form 540" />
                  <Row item={`City of LA business tax${laExempt ? " (exempt)" : ""}`} amount={laBusinessTax} authority="LA Office of Finance — LAMC §21.49" />
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total annual tax</TableCell>
                    <TableCell className="text-right">{fmtUSD(totalTax)}</TableCell>
                    <TableCell>{fmtPct(effectiveRate)} effective</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 space-y-1">
                {estimate.notes.map((n, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {n}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Write-offs */}
        <TabsContent value="writeoffs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available write-offs</CardTitle>
              <CardDescription>Enter your actual annual spend per category. Totals flow into the tax estimate.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-40">Annual amount</TableHead>
                    <TableHead>Tax code reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {writeOffs.map((w, idx) => (
                    <TableRow key={w.category}>
                      <TableCell className="text-sm">{w.category}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={w.annual}
                          onChange={(e) => {
                            const next = [...writeOffs];
                            next[idx] = { ...next[idx], annual: parseFloat(e.target.value) || 0 };
                            setWriteOffs(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{w.irs_ref}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total deductions</TableCell>
                    <TableCell>{fmtUSD(totalWriteOffs)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business fees & registrations</CardTitle>
              <CardDescription>Required filings and fees for a business registered in Hollywood, CA.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee / Filing</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Authority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businessFees().map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{f.name}</TableCell>
                      <TableCell className="text-right">{fmtUSD2(f.amount)}</TableCell>
                      <TableCell>{f.frequency}</TableCell>
                      <TableCell>{f.due}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.authority}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {laExempt && (
                <p className="text-xs text-muted-foreground mt-3">
                  Gross receipts are under $100,000 — Trimbly qualifies for LA's Small Business Exemption.
                  Still must file the renewal annually to claim it.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filings */}
        <TabsContent value="filings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filing checklist — {entityType.replace("_", "-").toUpperCase()}</CardTitle>
              <CardDescription>All forms required for the {data.tax_year} tax year.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filingChecklist().map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{f.form}</TableCell>
                      <TableCell><Badge variant="outline">{f.entity}</Badge></TableCell>
                      <TableCell>{f.due}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.authority}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarterly */}
        <TabsContent value="quarterly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quarterly estimated payments</CardTitle>
              <CardDescription>Safe-harbor 110% of prior-year tax or 90% of current. These split the projected liability evenly.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="text-right">Federal + State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["Apr 15", "Jun 17", "Sep 16", "Jan 15 (next yr)"].map((d, i) => (
                    <TableRow key={d}>
                      <TableCell>Q{i + 1}</TableCell>
                      <TableCell>{d}</TableCell>
                      <TableCell className="text-right">{fmtUSD2(quarterly)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                CA additionally requires 30% Q1 / 40% Q2 / 0% Q3 / 30% Q4 weighting for individuals — adjust in your tax prep software.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Kpi = ({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) => (
  <Card className={highlight ? "border-primary" : ""}>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const Row = ({ item, amount, authority }: { item: string; amount: number; authority: string }) => (
  <TableRow>
    <TableCell className="text-sm">{item}</TableCell>
    <TableCell className="text-right">{fmtUSD2(amount)}</TableCell>
    <TableCell className="text-xs text-muted-foreground">{authority}</TableCell>
  </TableRow>
);

export default Tax;
