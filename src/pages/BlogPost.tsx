import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock } from "lucide-react";
import { getBlogPost, blogPosts } from "@/content/blogPosts";
import { setSeo, injectJsonLd } from "@/lib/seo";

// Lightweight markdown-ish renderer for our hand-authored posts.
const renderBody = (body: string) => {
  const lines = body.replace(/^\n+|\n+$/g, "").split("\n");
  const out: JSX.Element[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableBuffer: string[] = [];

  const flushList = () => {
    if (!listType || listBuffer.length === 0) return;
    const Tag = listType;
    out.push(
      <Tag key={`l${out.length}`} className={listType === "ol" ? "list-decimal pl-5 space-y-1" : "list-disc pl-5 space-y-1"}>
        {listBuffer.map((li, i) => (
          <li key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: renderInline(li) }} />
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  };

  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const rows = tableBuffer.map((r) => r.split("|").map((c) => c.trim()).filter(Boolean));
    const [header, , ...body] = rows;
    out.push(
      <div key={`t${out.length}`} className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{header.map((h, i) => <th key={i} className="text-left p-2 font-semibold text-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {row.map((c, j) => <td key={j} className="p-2 text-muted-foreground" dangerouslySetInnerHTML={{ __html: renderInline(c) }} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const renderInline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("|")) { flushList(); tableBuffer.push(line); continue; }
    else if (tableBuffer.length) flushTable();

    if (line.startsWith("## ")) {
      flushList();
      out.push(<h2 key={`h${out.length}`} className="text-2xl font-bold font-display text-foreground mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(<h3 key={`h${out.length}`} className="text-lg font-bold text-foreground mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("> ")) {
      flushList();
      out.push(<blockquote key={`q${out.length}`} className="border-l-4 border-primary/40 pl-4 my-4 text-muted-foreground italic" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />);
    } else if (/^- /.test(line)) {
      if (listType !== "ul") flushList();
      listType = "ul"; listBuffer.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== "ol") flushList();
      listType = "ol"; listBuffer.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(<p key={`p${out.length}`} className="text-muted-foreground leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
    }
  }
  flushList(); flushTable();
  return out;
};

const BlogPostPage = () => {
  const { slug = "" } = useParams();
  const post = getBlogPost(slug);

  useEffect(() => {
    if (!post) return;
    setSeo({
      title: `${post.title} | Trimbly Blog`,
      description: post.description,
      canonical: `${window.location.origin}/blog/${post.slug}`,
    });
    injectJsonLd("ld-blog-post", {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      url: `${window.location.origin}/blog/${post.slug}`,
      author: { "@type": "Organization", name: "Trimbly" },
    });
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-2">Post not found</h1>
          <Button asChild className="mt-4"><Link to="/blog">Back to blog</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <article className="container mx-auto px-4 max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={14} /> All posts
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock size={12} /> {post.readingMinutes} min read</span>
            <span className="text-xs text-muted-foreground">
              · {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-display text-foreground mb-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">{post.description}</p>
          <div className="prose-content">{renderBody(post.body)}</div>

          {related.length > 0 && (
            <aside className="mt-12 pt-8 border-t border-border">
              <h3 className="font-bold text-foreground mb-3">Keep reading</h3>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link to={`/blog/${r.slug}`} className="text-primary hover:underline">{r.title}</Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPostPage;
