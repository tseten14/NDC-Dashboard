import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

let mermaidInitialized = false;

function ensureMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    fontFamily: "inherit",
    themeVariables: {
      fontSize: "13px",
    },
    flowchart: { useMaxWidth: true, htmlLabels: true, padding: 14, nodeSpacing: 28, rankSpacing: 40 },
    sequence: { useMaxWidth: true, wrap: true, width: 280 },
    state: { useMaxWidth: true, nodeSpacing: 36, rankSpacing: 40 },
  });
  mermaidInitialized = true;
}

/** Strip Mermaid's fixed max-width so wide diagrams scale to the content column. */
export function scrubMermaidSvgMarkup(svg: string) {
  return svg
    .replace(/\s*style="[^"]*max-width:\s*[^;"]+[^"]*"/gi, "")
    .replace(/\smax-width:\s*[\d.]+px;?/gi, "")
    .replace(/\swidth="[\d.]+"/i, ' width="100%"');
}

/** Scale Mermaid SVG to its container (ScrollArea clips horizontal overflow). */
export function normalizeMermaidSvg(container: HTMLElement) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  svg.removeAttribute("style");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%");
  svg.removeAttribute("height");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.maxWidth = "100%";
  svg.style.display = "block";
  svg.style.overflow = "visible";

  svg.querySelectorAll("foreignObject").forEach((fo) => {
    fo.setAttribute("overflow", "visible");
  });
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    ensureMermaid();

    (async () => {
      const renderId = `mermaid-${id}-${Math.random().toString(36).slice(2, 11)}`;
      try {
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (cancelled) return;
        el.innerHTML = scrubMermaidSvgMarkup(svg);
        normalizeMermaidSvg(el);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Diagram could not be rendered");
        }
      } finally {
        document.getElementById(`d${renderId}`)?.remove();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
        {chart}
      </pre>
    );
  }

  return (
    <div className="not-prose my-4 w-full min-w-0 rounded-md border border-border bg-background p-3 sm:p-4">
      <div
        ref={containerRef}
        className={cn(
          "w-full min-w-0 mermaid-host",
          "[&_svg]:overflow-visible [&_svg]:max-w-full [&_svg]:h-auto",
          "[&_foreignObject]:overflow-visible [&_.nodeLabel]:overflow-visible",
          "[&_.edgeLabel]:text-[11px] [&_.edgeLabel_p]:text-[11px] [&_.edgeLabel]:leading-tight",
          "[&_.messageText]:text-[11px] [&_.actor]:text-[12px]",
          "[&_.state-title]:text-[12px]",
        )}
        data-testid="mermaid-diagram"
      />
    </div>
  );
}

function DocLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.endsWith(".md") || href?.endsWith(".txt")) {
    const label = typeof children === "string" ? children : href;
    return (
      <span
        className="text-muted-foreground"
        title={`Repository file: ${href}`}
      >
        {label}
        <span className="text-[10px]"> (repo docs)</span>
      </span>
    );
  }

  if (href?.startsWith("/")) {
    return (
      <a href={href} className="text-primary font-medium hover:underline" {...props}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary font-medium hover:underline"
      {...props}
    >
      {children}
    </a>
  );
}

export function MarkdownDocument({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none",
        "prose-headings:font-brand prose-headings:text-foreground",
        "prose-p:text-muted-foreground prose-p:leading-relaxed",
        "prose-li:text-muted-foreground",
        "prose-strong:text-foreground",
        "prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border",
        "prose-table:text-xs",
        "prose-th:text-foreground prose-td:text-muted-foreground",
        "prose-hr:border-border",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: DocLink,
          code({ className: codeClass, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClass ?? "");
            const lang = match?.[1];
            const text = String(children).replace(/\n$/, "");

            if (lang === "mermaid") {
              return <MermaidDiagram chart={text} />;
            }

            if (codeClass) {
              return (
                <code className={codeClass} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <code {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
