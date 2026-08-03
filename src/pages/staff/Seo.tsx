import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, PlayCircle, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { blogPosts } from "@/content/blogPosts";

type AuditRoute = { path: string; label: string; group: "Marketing" | "Blog" };

const AUDIT_ROUTES: AuditRoute[] = [
  { path: "/", label: "Homepage", group: "Marketing" },
  { path: "/about", label: "About", group: "Marketing" },
  { path: "/search", label: "Find a Pro", group: "Marketing" },
  { path: "/pro-pricing", label: "Pro Pricing", group: "Marketing" },
  { path: "/mechanic-pricing", label: "Mechanic Pricing", group: "Marketing" },
  { path: "/faq", label: "FAQ", group: "Marketing" },
  { path: "/contact", label: "Contact", group: "Marketing" },
  { path: "/blog", label: "Blog Index", group: "Blog" },
  ...blogPosts.map((p) => ({ path: `/blog/${p.slug}`, label: p.title, group: "Blog" as const })),
];

type Issue = { severity: "error" | "warn"; text: string };

type PageResult = {
  route: AuditRoute;
  status: "pending" | "checking" | "done" | "failed";
  score?: number;
  title?: string;
  titleLength?: number;
  description?: string;
  descriptionLength?: number;
  hasCanonical?: boolean;
  h1Count?: number;
  imagesMissingAlt?: number;
  imagesTotal?: number;
  wordCount?: number;
  issues: Issue[];
};

const initialResults = (): PageResult[] =>
  AUDIT_ROUTES.map((route) => ({ route, status: "pending", issues: [] }));

function scoreLabel(score: number) {
  if (score >= 85) return { label: "Good", className: "bg-primary/10 text-primary", icon: CheckCircle2 };
  if (score >= 60) return { label: "Needs Work", className: "bg-accent/10 text-accent", icon: AlertTriangle };
  return { label: "Poor", className: "bg-destructive/10 text-destructive", icon: XCircle };
}

async function auditPage(iframe: HTMLIFrameElement, route: AuditRoute): Promise<PageResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: PageResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({ route, status: "failed", issues: [{ severity: "error", text: "Timed out loading this page." }] });
    }, 12000);

    iframe.onload = () => {
      // Give the SPA's client-side render + setSeo() effect a moment to run after load.
      setTimeout(() => {
        clearTimeout(timeout);
        try {
          const doc = iframe.contentDocument;
          if (!doc) throw new Error("No document");

          const title = doc.title || "";
          const descriptionEl = doc.querySelector('meta[name="description"]') as HTMLMetaElement | null;
          const description = descriptionEl?.content || "";
          const canonicalEl = doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
          const h1s = doc.querySelectorAll("h1");
          const images = Array.from(doc.querySelectorAll("img"));
          const imagesMissingAlt = images.filter((img) => !img.getAttribute("alt")?.trim()).length;
          const bodyText = (doc.body?.innerText || "").trim();
          const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

          const issues: Issue[] = [];
          let score = 100;

          if (!title) { issues.push({ severity: "error", text: "Missing page title." }); score -= 30; }
          else if (title.length < 30 || title.length > 65) { issues.push({ severity: "warn", text: `Title is ${title.length} chars — ideal is 30–65.` }); score -= 10; }

          if (!description) { issues.push({ severity: "error", text: "Missing meta description." }); score -= 25; }
          else if (description.length < 70 || description.length > 165) { issues.push({ severity: "warn", text: `Description is ${description.length} chars — ideal is 70–165.` }); score -= 10; }

          if (!canonicalEl) { issues.push({ severity: "warn", text: "No canonical link tag." }); score -= 10; }

          if (h1s.length === 0) { issues.push({ severity: "error", text: "No <h1> found on the page." }); score -= 10; }
          else if (h1s.length > 1) { issues.push({ severity: "warn", text: `${h1s.length} <h1> tags found — should be exactly one.` }); score -= 5; }

          if (imagesMissingAlt > 0) { issues.push({ severity: "warn", text: `${imagesMissingAlt} of ${images.length} images missing alt text.` }); score -= Math.min(10, imagesMissingAlt * 2); }

          if (wordCount < 150) { issues.push({ severity: "warn", text: `Only ~${wordCount} words of visible content — thin content can hurt rankings.` }); score -= 10; }

          score = Math.max(0, Math.round(score));

          finish({
            route, status: "done", score, title, titleLength: title.length, description,
            descriptionLength: description.length, hasCanonical: !!canonicalEl, h1Count: h1s.length,
            imagesMissingAlt, imagesTotal: images.length, wordCount, issues,
          });
        } catch (e) {
          finish({ route, status: "failed", issues: [{ severity: "error", text: "Could not read this page's content." }] });
        }
      }, 900);
    };

    iframe.src = route.path;
  });
}

export default function StaffSeo() {
  const [results, setResults] = useState<PageResult[]>(initialResults);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const runAudit = async () => {
    setRunning(true);
    setResults(initialResults());
    const iframe = iframeRef.current;
    if (!iframe) { setRunning(false); return; }

    for (let i = 0; i < AUDIT_ROUTES.length; i++) {
      const route = AUDIT_ROUTES[i];
      setResults((prev) => prev.map((r) => (r.route.path === route.path ? { ...r, status: "checking" } : r)));
      // eslint-disable-next-line no-await-in-loop
      const result = await auditPage(iframe, route);
      setResults((prev) => prev.map((r) => (r.route.path === route.path ? result : r)));
    }
    setRunning(false);
  };

  const checkedCount = results.filter((r) => r.status === "done" || r.status === "failed").length;
  const doneResults = results.filter((r): r is PageResult & { score: number } => r.status === "done" && typeof r.score === "number");
  const avgScore = doneResults.length > 0 ? Math.round(doneResults.reduce((s, r) => s + r.score, 0) / doneResults.length) : null;
  const errorCount = results.reduce((s, r) => s + r.issues.filter((i) => i.severity === "error").length, 0);
  const warnCount = results.reduce((s, r) => s + r.issues.filter((i) => i.severity === "warn").length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Search size={20} className="text-primary" /> SEO Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Live audit of {AUDIT_ROUTES.length} public pages — titles, meta descriptions, headings, alt text, and content depth.
          </p>
        </div>
        <Button onClick={runAudit} disabled={running} className="gap-2">
          {running ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
          {running ? `Auditing ${checkedCount}/${AUDIT_ROUTES.length}...` : "Run Audit"}
        </Button>
      </div>

      {/* Hidden crawler iframe */}
      <iframe ref={iframeRef} title="seo-audit-crawler" style={{ display: "none" }} />

      {avgScore !== null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Average Score</p>
              <p className={`text-2xl font-bold ${avgScore >= 85 ? "text-primary" : avgScore >= 60 ? "text-accent" : "text-destructive"}`}>{avgScore}/100</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Pages Checked</p>
              <p className="text-2xl font-bold text-foreground">{doneResults.length}/{AUDIT_ROUTES.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Errors</p>
              <p className="text-2xl font-bold text-destructive">{errorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Warnings</p>
              <p className="text-2xl font-bold text-accent">{warnCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page-by-Page Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {results.map((r) => {
              const isOpen = expanded === r.route.path;
              const meta = r.status === "done" && typeof r.score === "number" ? scoreLabel(r.score) : null;
              return (
                <div key={r.route.path}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.route.path)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">{r.route.label}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{r.route.group}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">{r.route.path}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {r.status === "pending" && <span className="text-xs text-muted-foreground">Not checked</span>}
                      {r.status === "checking" && <Loader2 size={14} className="animate-spin text-primary" />}
                      {r.status === "failed" && <Badge className="bg-destructive/10 text-destructive text-xs">Failed</Badge>}
                      {meta && (
                        <Badge className={`text-xs gap-1 ${meta.className}`}>
                          <meta.icon size={11} /> {r.score}/100 · {meta.label}
                        </Badge>
                      )}
                      {(r.status === "done" || r.status === "failed") && (isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </button>
                  {isOpen && (r.status === "done" || r.status === "failed") && (
                    <div className="px-4 pb-4 space-y-3">
                      {r.status === "done" && (
                        <div className="grid sm:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-muted-foreground mb-1">Title ({r.titleLength} chars)</p>
                            <p className="text-foreground">{r.title || <em className="text-muted-foreground">none</em>}</p>
                          </div>
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-muted-foreground mb-1">Meta Description ({r.descriptionLength} chars)</p>
                            <p className="text-foreground">{r.description || <em className="text-muted-foreground">none</em>}</p>
                          </div>
                          <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                            <span className="text-muted-foreground">Canonical tag</span>
                            <span className={r.hasCanonical ? "text-primary" : "text-destructive"}>{r.hasCanonical ? "Present" : "Missing"}</span>
                          </div>
                          <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                            <span className="text-muted-foreground">H1 count</span>
                            <span className={r.h1Count === 1 ? "text-primary" : "text-accent"}>{r.h1Count}</span>
                          </div>
                          <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                            <span className="text-muted-foreground">Images missing alt text</span>
                            <span className={r.imagesMissingAlt ? "text-accent" : "text-primary"}>{r.imagesMissingAlt}/{r.imagesTotal}</span>
                          </div>
                          <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                            <span className="text-muted-foreground">Visible word count</span>
                            <span className={((r.wordCount ?? 0) < 150) ? "text-accent" : "text-primary"}>{r.wordCount}</span>
                          </div>
                        </div>
                      )}
                      {r.issues.length > 0 ? (
                        <ul className="space-y-1.5">
                          {r.issues.map((issue, i) => (
                            <li key={i} className={`flex items-start gap-2 text-xs ${issue.severity === "error" ? "text-destructive" : "text-accent"}`}>
                              {issue.severity === "error" ? <XCircle size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
                              {issue.text}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-primary flex items-center gap-1.5"><CheckCircle2 size={13} /> No issues found.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Audits run live against the currently deployed pages in a hidden browser tab — results reflect this site right now, not a cached report.
      </p>
    </div>
  );
}
