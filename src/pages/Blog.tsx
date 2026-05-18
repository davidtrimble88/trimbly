import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { blogPosts } from "@/content/blogPosts";
import { setSeo, injectJsonLd } from "@/lib/seo";

const Blog = () => {
  useEffect(() => {
    setSeo({
      title: "Trimbly Blog — Home Maintenance, Pricing & DIY Guides",
      description:
        "Practical guides on home maintenance, repair pricing, and when to DIY vs. hire a pro — written for actual homeowners.",
      canonical: `${window.location.origin}/blog`,
    });
    injectJsonLd("ld-blog", {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Trimbly Blog",
      url: `${window.location.origin}/blog`,
      blogPost: blogPosts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        description: p.description,
        datePublished: p.publishedAt,
        url: `${window.location.origin}/blog/${p.slug}`,
      })),
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 text-sm text-primary font-semibold mb-2">
              <BookOpen size={16} /> Trimbly Blog
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-foreground">
              Home maintenance, pricing & DIY guides
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Practical posts written for homeowners — no fluff, no SEO filler.
            </p>
          </header>

          <div className="grid gap-4">
            {blogPosts.map((post) => (
              <Card key={post.slug} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <Link to={`/blog/${post.slug}`} className="block group">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} /> {post.readingMinutes} min read
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">{post.description}</p>
                    <span className="inline-flex items-center gap-1 mt-3 text-sm text-primary font-medium">
                      Read post <ArrowRight size={12} />
                    </span>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
