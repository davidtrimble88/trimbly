// Small SEO helpers for client-rendered pages.
export const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const cityStateSlug = (city: string, state: string) =>
  [slugify(city), slugify(state)].filter(Boolean).join("-");

export const parseCityStateSlug = (slug: string): { city: string; state: string } => {
  // Last token (1–3 chars) is treated as state code (e.g. "austin-tx" -> {Austin, TX})
  const parts = (slug || "").split("-").filter(Boolean);
  if (parts.length === 0) return { city: "", state: "" };
  const last = parts[parts.length - 1];
  if (last.length <= 3 && parts.length > 1) {
    return {
      city: parts.slice(0, -1).map((p) => p[0].toUpperCase() + p.slice(1)).join(" "),
      state: last.toUpperCase(),
    };
  }
  return { city: parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" "), state: "" };
};

export const setSeo = (opts: {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
}) => {
  if (typeof document === "undefined") return;
  document.title = opts.title;
  const upsertMeta = (selector: string, attr: string, name: string, content: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  if (opts.description) {
    upsertMeta('meta[name="description"]', "name", "description", opts.description);
    upsertMeta('meta[property="og:description"]', "property", "og:description", opts.description);
  }
  upsertMeta('meta[property="og:title"]', "property", "og:title", opts.title);
  upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
  if (opts.ogImage) {
    upsertMeta('meta[property="og:image"]', "property", "og:image", opts.ogImage);
  }
  if (opts.canonical) {
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) {
      canon = document.createElement("link");
      canon.setAttribute("rel", "canonical");
      document.head.appendChild(canon);
    }
    canon.setAttribute("href", opts.canonical);
  }
};

export const injectJsonLd = (id: string, data: unknown) => {
  if (typeof document === "undefined") return;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};
