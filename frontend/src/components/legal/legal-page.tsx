"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Link from "next/link";

interface LegalPageProps {
  content: string;
}

export function LegalPage({ content }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <div className="mx-auto max-w-[720px] px-6 sm:px-8 py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-2 prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-12 prose-h3:text-lg prose-p:leading-7 prose-li:leading-7 prose-a:text-primary prose-a:underline prose-strong:text-foreground prose-table:text-sm prose-th:text-left">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug]}
          >
            {content}
          </ReactMarkdown>
        </article>

        <footer className="mt-16 pt-8 border-t border-border text-sm text-muted-foreground flex gap-6">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span className="ml-auto">&copy; {new Date().getFullYear()} Askly</span>
        </footer>
      </div>
    </div>
  );
}
