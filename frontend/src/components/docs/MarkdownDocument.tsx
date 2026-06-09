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
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false,
      padding: 18,
      nodeSpacing: 40,
      rankSpacing: 50,
      wrappingWidth: 200,
    },
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

  expandFlowchartNodeBoxes(svg);
}

/** Widen node rects when label text exceeds the default Mermaid box (htmlLabels off). */
export function expandFlowchartNodeBoxes(svg: SVGSVGElement) {
  const padX = 24;
  const padY = 16;

  svg.querySelectorAll("g.node").forEach((nodeG) => {
    const label = nodeG.querySelector(".nodeLabel");
    const rect = nodeG.querySelector("rect");
    if (!label || !rect) return;

    let labelW = 0;
    let labelH = 0;
    try {
      const bbox = (label as SVGGraphicsElement).getBBox();
      labelW = bbox.width;
      labelH = bbox.height;
    } catch {
      return;
    }

    if (labelW < 1 || labelH < 1) {
      const text = label.textContent?.trim() ?? "";
      const lines = text.split("\n").filter(Boolean);
      labelW = Math.max(labelW, text.length * 7);
      labelH = Math.max(labelH, (lines.length || 1) * 14);
    }

    const neededW = labelW + padX * 2;
    const neededH = labelH + padY * 2;
    const curW = Number(rect.getAttribute("width")) || 0;
    const curH = Number(rect.getAttribute("height")) || 0;
    if (neededW <= curW && neededH <= curH) return;

    const x = Number(rect.getAttribute("x")) || 0;
    const y = Number(rect.getAttribute("y")) || 0;
    const dw = Math.max(0, neededW - curW);
    const dh = Math.max(0, neededH - curH);

    rect.setAttribute("x", String(x - dw / 2));
    rect.setAttribute("y", String(y - dh / 2));
    rect.setAttribute("width", String(curW + dw));
    rect.setAttribute("height", String(curH + dh));

    const fo = nodeG.querySelector("foreignObject");
    if (fo) {
      fo.setAttribute("x", String((Number(fo.getAttribute("x")) || 0) - dw / 2));
      fo.setAttribute("y", String((Number(fo.getAttribute("y")) || 0) - dh / 2));
      fo.setAttribute("width", String((Number(fo.getAttribute("width")) || 0) + dw));
      fo.setAttribute("height", String((Number(fo.getAttribute("height")) || 0) + dh));
    }
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
          "[&_.nodeLabel]:overflow-hidden [&_.nodeLabel_p]:m-0 [&_.nodeLabel_p]:leading-snug",
          "[&_.node rect]:rx-[4px]",
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
