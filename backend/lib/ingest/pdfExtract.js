/** Shared PDF text extraction for ingest scan + structured upload. */

export function isPdfMagic(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).toString("ascii") === "%PDF-";
}

export async function extractPdfText(buffer) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const r = await parser.getText();
      const pages = r.total ?? r.pages?.length ?? 0;
      const text = (r.text || "")
        .replace(/-- \d+ of \d+ --/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return { text, pages, source: "pdf-parse" };
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (primaryErr) {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      let text = "";
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((it) => ("str" in it ? it.str : ""))
            .join(" ")
            .trim() + "\n";
        page.cleanup();
      }
      await doc.destroy();
      return { text: text.trim(), pages: doc.numPages, source: "pdfjs-dist-fallback" };
    } catch (fallbackErr) {
      const root = primaryErr.message || String(primaryErr);
      const fb = fallbackErr.message || String(fallbackErr);
      throw new Error(`PDF text extraction failed: ${root} | fallback: ${fb}`);
    }
  }
}
