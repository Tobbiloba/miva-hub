import { isJson, isString, toAny } from "lib/utils";
import React, { memo, PropsWithChildren } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import JsonView from "ui/json-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { PreBlock } from "./pre-block";

const FadeIn = memo(({ children }: PropsWithChildren) => {
  return <span className="fade-in animate-in duration-1000">{children} </span>;
});
FadeIn.displayName = "FadeIn";

export const WordByWordFadeIn = memo(({ children }: PropsWithChildren) => {
  const childrens = [children]
    .flat()
    .flatMap((child) => (isString(child) ? child.split(" ") : child));
  return childrens.map((word, index) =>
    isString(word) ? <FadeIn key={index}>{word}</FadeIn> : word,
  );
});
WordByWordFadeIn.displayName = "WordByWordFadeIn";
const components: Partial<Components> = {
  table: ({ node, children, ...props }) => {
    return (
      <div className="my-4">
        <Table {...props}>{children}</Table>
      </div>
    );
  },
  thead: ({ node, children, ...props }) => {
    return <TableHeader {...props}>{children}</TableHeader>;
  },
  tbody: ({ node, children, ...props }) => {
    return <TableBody {...props}>{children}</TableBody>;
  },
  tr: ({ node, children, ...props }) => {
    return <TableRow {...props}>{children}</TableRow>;
  },
  th: ({ node, children, ...props }) => {
    return (
      <TableHead {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </TableHead>
    );
  },
  td: ({ node, children, ...props }) => {
    return (
      <TableCell {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </TableCell>
    );
  },
  code: ({ children }) => {
    return (
      <code className="mx-0.5 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.86em] text-foreground">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => {
    return (
      <blockquote className="my-4 border-l-2 border-input pl-4 text-muted-foreground">
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </blockquote>
    );
  },
  p: ({ children }) => {
    return (
      <p className="my-3 break-words leading-7 first:mt-0 last:mb-0">
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </p>
    );
  },
  pre: ({ children }) => {
    return (
      <div className="my-3">
        <PreBlock>{children}</PreBlock>
      </div>
    );
  },
  ol: ({ node, children, ...props }) => {
    return (
      <ol
        className="my-3 list-decimal space-y-1.5 pl-6 marker:text-muted-foreground"
        {...props}
      >
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="break-words pl-1 leading-7" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul
        className="my-3 list-disc space-y-1.5 pl-6 marker:text-muted-foreground"
        {...props}
      >
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    // Course-material citation ([S1] → lib/ai/citations): an inline chip
    if (typeof props.href === "string" && props.href.includes("?cite=S")) {
      return (
        <a
          href={props.href}
          title={props.title}
          aria-label={`Source ${children}: ${props.title ?? ""}`}
          target="_blank"
          rel="noreferrer"
          className="mx-0.5 inline-flex h-[18px] items-center rounded-[5px] bg-tint-blue px-1.5 align-[1px] text-[11px] font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-brand-foreground"
        >
          {children}
        </a>
      );
    }
    return (
      <a
        className="text-brand underline-offset-2 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...toAny(props)}
      >
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </a>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="mt-6 mb-2 text-2xl font-semibold first:mt-0" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="mt-6 mb-2 text-xl font-semibold first:mt-0" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3
        className="mt-5 mb-1.5 text-[17px] font-semibold first:mt-0"
        {...props}
      >
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="mt-5 mb-1.5 text-[15px] font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="mt-4 mb-1 text-[15px] font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6
        className="mt-4 mb-1 text-sm font-semibold text-muted-foreground"
        {...props}
      >
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h6>
    );
  },
  img: ({ node, children, ...props }) => {
    const { src, alt, ...rest } = props;

    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="mx-auto rounded-lg" src={src} alt={alt} {...rest} />
    ) : null;
  },
};

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <article className="relative h-full w-full text-[15px] leading-7">
      {isJson(children) ? (
        <JsonView data={children} />
      ) : (
        <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
          {children}
        </ReactMarkdown>
      )}
    </article>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
