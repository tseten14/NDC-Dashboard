# Documentation index

Use this page to find the maintained source for each subject. Documentation is split by audience so user instructions, engineering contracts, audit evidence, and archived presentation material do not get confused.

## Start here

| Audience | Canonical document |
| --- | --- |
| Application user | The live `/docs` page and [guide/user-guide.md](./guide/user-guide.md) |
| New developer or integrator | [dev/codebase-guide.md](./dev/codebase-guide.md) |
| Architecture reviewer | [dev/system-design.md](./dev/system-design.md) and [dev/architecture.md](./dev/architecture.md) |
| Data reviewer | [guide/data.md](./guide/data.md), [dev/application-data-audit.md](./dev/application-data-audit.md), and [dev/climate-trace-integration.md](./dev/climate-trace-integration.md) |
| Deployment operator | [dev/deploy.md](./dev/deploy.md) and [dev/workspace-quality.md](./dev/workspace-quality.md) |
| Qlik analyst | [qlik-cloud.md](./qlik-cloud.md) |
| External reader | [NDC Data Explorer: Complete application and engineering guide](./NDC-Data-Explorer-Complete-Guide.pdf) |

The live Documentation page bundles the plain-language guide, a complete route directory, [the codebase guide](./dev/codebase-guide.md), and [the system design](./dev/system-design.md). Markdown is the maintained source for technical tabs; rebuild the application to publish changes.

## Engineering references

| Document | Scope |
| --- | --- |
| [dev/code-comments.md](./dev/code-comments.md) | File headers and useful inline comments |
| [dev/dashboard-accuracy-audit.md](./dev/dashboard-accuracy-audit.md) | Dashboard-to-Climate-TRACE reconciliation evidence |
| [dev/district-translator.md](./dev/district-translator.md) | Boundary sets, centroid filtering, and translator limitations |
| [dev/policy-engine.md](./dev/policy-engine.md) | Disabled policy-impact contract and evidence needed to enable it |
| [dev/mcf-fulltext-schema.md](./dev/mcf-fulltext-schema.md) | Climate-fund project document schema |
| [inventory-exercises.md](./inventory-exercises.md) | User-authored inventory comparison workflow |
| [scenario-analysis.md](./scenario-analysis.md) | Deterministic scenario workflow |
| [sector-classification.md](./sector-classification.md) | Supported reporting hierarchy and source mapping |

## Supporting and historical material

- `PROJECT_DOCUMENTATION.txt` is a long-form project reference retained for readers who need one plain-text file. The codebase guide and live `/docs` page take precedence when navigation changes.
- `CHANGELOG.md` records historical behavior. Statements under older dates describe those releases rather than the current application.
- `demo/` contains presentation scripts, screenshots, and notes from earlier demonstrations. It is not an operating manual or a source of current data claims.
- `samples/` contains example request and response shapes. Examples are fixtures, not production evidence.
- `un-accountable-ai-perspective.*` is a research paper and its source file; it does not define application behavior.
- Binary PDF, PowerPoint, Word, image, and database files cannot carry code comments. Their purpose is recorded here or in the guide that generates them.

## Generated data and exports

Large JSON, CSV, GeoJSON, TSV, lockfiles, caches, and generated exports are documented by their build script, schema, and owning guide. Do not insert hand-written comments into machine-readable data because that can invalidate the format or break reproducible builds.

The client-ready Climate TRACE source-record extract is [`data/exports/climate-trace-uganda-sources-2021-2025.csv`](../data/exports/climate-trace-uganda-sources-2021-2025.csv). [qlik-cloud.md](./qlik-cloud.md) explains its columns and Qlik import steps.
