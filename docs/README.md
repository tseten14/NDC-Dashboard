# Documentation

The single comprehensive reference is **[NDC Data Explorer: Complete application and engineering guide (PDF)](./NDC-Data-Explorer-Complete-Guide.pdf)**. It covers the user workflow, routes, runtime architecture, Climate TRACE v7 queries and interpretation, data provenance, protected writes, deployment, testing, and the Qlik handoff extract.

The other files in `docs/` are supporting source notes, examples, and presentation assets. The website's `/docs` page still reads `frontend/src/data/user-guide-content.ts` and `docs/dev/system-design.md` at build time; those files must remain available for the in-app guide. For a shareable overview, send the PDF above.

The client-ready Climate TRACE source-record CSV is [`data/exports/climate-trace-uganda-sources-2021-2025.csv`](../data/exports/climate-trace-uganda-sources-2021-2025.csv). The PDF's Section 12 explains its scope and Qlik import interpretation.
