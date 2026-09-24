# The UN as an intermediary for accountable AI in climate policymaking

Tseten Sherpa

School for Environment and Sustainability, University of Michigan, Ann Arbor, USA; Mitigation Data Systems, UNFCCC, Bonn, Germany

Correspondence: tsherp@umich.edu

Perspective — working draft for discussion, 24 September 2026

## Abstract

Large language models could help governments interpret climate evidence, but their usefulness depends on how evidence, authority, and accountability are organized. Drawing on the Uganda NDC Data Explorer, we propose a role for the United Nations as an intermediary connecting national institutions, climate-data providers, and AI developers. We describe a governed environment for evidence-based assistance, illustrate policy tasks using existing information, and identify evaluations needed to establish decision-making benefits.

## Making climate evidence usable

Climate policymaking requires governments to translate commitments into decisions about sectors, places, resources, and implementation. Nationally Determined Contributions (NDCs) provide a central reference for this work under the Paris Agreement [1]. Yet a commitment in a policy document does not by itself provide an accessible account of what is happening, where further investigation is needed, or which evidence supports a proposed response. The practical challenge includes assembling information into a form that officials can interrogate and use.

Official NDC documents, national greenhouse-gas inventories, independent emissions estimates, climate-finance tables, and sector strategies occupy different systems, update cycles, and accounting frameworks. Answering a seemingly straightforward question about transport emissions may require finding a target, interpreting its baseline and conditionality, selecting an observation year, and establishing whether the datasets describe comparable activities. This work combines technical analysis with institutional knowledge. Its demands can be especially consequential for teams with limited analytical capacity.

Large language models (LLMs) offer a possible interface to this fragmented evidence. Research has examined their use for processing climate-policy documents while identifying limitations that affect interpretation and policy use [2]. Recent work on climate services similarly connects the promise of generative AI with questions of reliability, accountability, and access [3]. A fluent answer, however, can hide a missing source or an invalid comparison. Making analysis easier to produce does not necessarily make it easier to defend.

We argue that international institutions could help organize the conditions under which AI assistance becomes useful to national policymakers. Drawing on the NDC Data Explorer developed in a UNFCCC internship, with Uganda as its initial implementation setting, we propose an intermediary role linking data providers, technical developers, and national institutions. The contribution is a governance framework grounded in a practical system and its design limitations. Better access to evidence addresses one constraint on policymaking; political priorities, finance, administrative authority, and implementation capacity continue to shape outcomes.

## An institutional framework for accountable assistance

The proposed framework draws on research about the organizations and practices that connect scientific knowledge with decision-making. Cash and colleagues identify credibility, salience, and legitimacy as interdependent qualities of effective knowledge systems [4]. Applied here, these qualities ask whether information is technically defensible, relevant to a policy task, and produced through arrangements that affected institutions can regard as appropriate. They provide a foundation for evaluating the relationship between an AI application and its users.

Within this relationship, national institutions define the policy question and retain decision authority. Data providers supply observations, estimates, methods, and information about coverage. Developers implement retrieval, calculation, presentation, and language assistance. An intermediary could coordinate these contributions, establish responsibilities, and support a process through which outputs are examined and corrected. Its value would depend on the functions it performs and the accountability arrangements surrounding them.

We describe this proposed arrangement as an institutional safe harbor for climate AI: a governed environment in which officials can explore evidence with bounded assistance, inspect the basis of an answer, and challenge it before use. The term denotes an operating model, without implying a legal designation or a guarantee of safety. Its defining features are traceable sources, explicit analytical limits, named responsibilities, human review, and accessible correction procedures. Their effectiveness would require evaluation in the settings where the system is used.

A credible arrangement must also make room for disagreement. An independent estimate and a national inventory may reflect different boundaries or methods. Their coexistence should prompt explanation and, where useful, investigation. The intermediary should support national experts in assessing the difference and preserve the provenance of both accounts. The system should make clear who supplied an estimate, who interpreted it, and who authorized its use in a policy product.

This framing extends the discussion from the quality of an individual answer to the organization of the evidence service around it. Williams and colleagues already connect trustworthy AI for climate services with user needs and institutional responsibilities [3]. Our particular focus is multilateral intermediation for national mitigation policy: how evidence from heterogeneous providers can be made usable while respecting NDC accounting and national authority. The UNFCCC setting provides a practical case through which to examine that proposal.

## The Uganda NDC Data Explorer

The NDC Data Explorer brings official commitments, independent emissions estimates, policy documents, and language assistance into a shared workspace. It was developed during an internship with the UNFCCC secretariat, with Uganda selected in coordination with secretariat staff. The project has received approval for use in Uganda; the approving authority and scope of that authorization require specification in the final manuscript. This establishes an implementation context, while evidence of routine use and effects on decisions remains to be collected.

Uganda's September 2022 NDC is a useful setting because its mitigation commitments require careful interpretation of business-as-usual (BAU) projections, sector coverage, and conditional support [5]. Climate TRACE provides an independent emissions-estimation layer, combining existing data and sector-specific methods [6]. The portal places these estimates alongside encoded commitments and a snapshot of policy documents assembled from Climate Policy Radar. These inputs serve different evidentiary functions; access through one interface does not make them interchangeable.

The dashboard assistant is designed to work from a structured fact ledger built from the current view. Each entry identifies a value or claim and its source. The prompt instructs the model to use those entries, cite their identifiers, and acknowledge unavailable information. A separate document-assistance path uses extracted text and page markers. This architecture makes the intended source of an answer inspectable, although compliance with the instructions and support for the resulting prose still require verification.

The broader design separates externally retrieved estimates, official commitments, document snapshots, indicative planning assumptions, and user-entered information. National targets are distinguished from district observations. Climate-finance screening remains indicative. The project also has access to Planet data for developing an Earth-observation component, whose product, coverage, and current integration status require specification. Project planning identifies land-change evidence for selected mitigation measures as a complementary role; no completed Planet analysis is reported here.

This Perspective draws on the system's documented design, its development account, and a source-based illustration of NDC interpretation. The following tasks were selected to expose different requirements: descriptive analysis, commitment interpretation, and handling evidentiary gaps. They are analytical walkthroughs, rather than a sampled user study or a benchmark of generated answers. This distinction keeps the case useful without treating intended capabilities as measured benefits.

## Policy tasks that can be examined with existing evidence

### Understanding an emissions pattern

A policymaker may need a briefing on which sectors account for the largest estimated emissions and how the pattern has changed across available inventory years. The portal can bring the relevant series, sector definitions, and source links into one view. Deterministic calculations can establish totals and changes; the assistant's proposed contribution is to explain those results in response to a question and identify qualifications that matter for interpretation.

An inspectable briefing should identify its observation period, geographic scope, units, and source version. It should distinguish complete sector aggregates from mapped facilities or other geolocated sources that represent only part of the total. Missing years should remain visible. The resulting account could help an official identify where to request further analysis. Selecting an intervention would additionally require information about feasibility, cost, distributional effects, and institutional priorities.

### Interpreting an NDC commitment

The question of whether transport is aligned with an NDC requires more than comparing two numbers. Uganda's NDC reports transport emissions of 4.2 MtCO2e in 2015, a 2030 BAU projection of 9.6, and a mitigation level of 6.8. It also publishes annual trajectories: Figure 3-6 gives a 2024 baseline of 7.2 and a mitigation level of 6.1 MtCO2e [5, printed p. 41]. These published annual values should take precedence over an assumed straight-line path.

Consider a hypothetical, accounting-compatible observation of 7.5 MtCO2e in 2024. Comparing it with the 2030 endpoint gives a ratio of (9.6 - 7.5) / (9.6 - 6.8), or 75%. The same observation exceeds the published 2024 BAU value. The example demonstrates how an apparently favorable percentage can result from choosing the wrong comparison year. It is an arithmetic illustration, not a measured assessment of Uganda's actual performance.

The assistant should explain both the pledge and the comparison's limits. Matching years is necessary but insufficient: gas coverage, sector boundaries, removals, and estimation methods must also be examined. Where compatibility is unresolved, the appropriate output is a contextual comparison with an explanation of missing information. A percentage should not imply verified policy delivery simply because all its inputs have source links.

### Identifying an evidence gap

A third task begins when the evidence cannot answer the question. National agriculture, forestry, and other land-use emissions estimates do not by themselves establish which restoration sites are recovering. A proposed Planet component would examine whether land-change observations can help track selected implementation indicators. Connecting such observations to emissions consequences would require validated interpretation, national programme records, and suitable accounting methods. Any overlap in upstream inputs should also be checked before treating datasets as independent corroboration.

The useful output may therefore be a structured request for additional evidence: identify the relevant measure, describe what each dataset contributes, and specify the unresolved inference. A difference between inventories is not automatically an omission, and a vegetation signal does not establish programme causality. An LLM could help organize this explanation and retrieve supporting documents. National specialists would determine whether the observations justify a revised assessment or further investigation.

## What multilateral intermediation would require

The UNFCCC Technology Mechanism's AI4ClimateAction initiative provides an existing context for knowledge sharing, capacity development, and locally led climate applications in developing countries [7]. More broadly, the UN Advisory Body's report on AI governance calls attention to international cooperation and uneven capacity [8]. These activities support the relevance of examining multilateral intermediation; they do not establish that the NDC Data Explorer has a mandate under those initiatives. We propose five responsibilities through which such a role could become operational.

First, convening should begin with national policy tasks. Ministries, inventory specialists, and intended users should help define the questions, acceptable evidence, and outputs worth developing. Data providers and developers can then identify which parts of those tasks are feasible. National participation needs to influence system requirements and release decisions. Demonstrations and expressions of interest are useful starting points, but they provide limited evidence about whether the resulting workflow fits everyday practice.

Second, evidence stewardship should preserve the meaning of data as they move through the system. This includes recording versions, update dates, transformations, geographic boundaries, and the relationship between an estimate and an official commitment. The project's experience with BAU comparisons illustrates why this responsibility extends beyond maintaining working links. A technically correct calculation can answer an inappropriate question. Stewardship therefore requires both software competence and domain expertise, with a process for resolving disputed interpretations.

Third, assurance should examine complete claims. The original prototype's citation resolver could associate generated numbers with nearby ledger values, potentially attaching a genuine source to an incorrect statement. Replacing that behavior requires checks on values and their context, including year, sector, geography, and unit. Paragraphs can remain misleading even when each number appears somewhere in the ledger. Proposed safeguards should include contextual validation, controlled rendering of numerical facts, and refusal or review when support is missing. These safeguards remain an evaluation agenda, rather than demonstrated guarantees.

Fourth, capacity development should enable continued national use and scrutiny. Training must cover source interpretation, limitations, and correction procedures alongside interface operation. Language access, connectivity, licensing, recurring model costs, and maintenance affect who can benefit. A shared service could distribute some technical costs across participating countries, but that possibility depends on durable resourcing and locally useful support. The objective should include strengthening national analytical capability and avoiding dependence on a single developer or proprietary configuration.

Fifth, accountability should assign responsibility across the service. National institutions retain authority over their policy decisions and official reporting. Providers remain responsible for explaining their products, while operators need named responsibilities for maintenance, incident handling, and corrections. A disputed output should have an identifiable route for review. Where an error has affected an exported briefing, the service should make it possible to identify the affected version and notify the relevant users.

These responsibilities also expose a risk specific to institutional intermediation: an authoritative name may encourage excessive confidence in an unreliable output. Visible evidence, opportunities to challenge interpretations, and clear separation between system-generated text and institutionally reviewed statements are therefore central to the proposal. The case for UN involvement rests on maintaining these functions under appropriate authority and resources. A network involving national agencies, research institutions, and technical partners may provide them more effectively than a single centralized operator.

## Establishing usefulness without waiting for future emissions

Evaluation can begin with the evidence already available. Technical capability can be assessed against frozen data snapshots and expert-checked answers. Questions should include routine retrieval and comparison alongside missing observations, incompatible boundaries, incorrect citations, ambiguous geography, and requests for unsupported recommendations. Evaluation should record factual accuracy, contextual correctness, citation support, and appropriate abstention. Repeated runs and version records are needed to characterize variability rather than treating a favorable demonstration as representative.

Decision-support value requires an additional comparison. The same tasks and evidence could be presented through a dashboard, a deterministic briefing template, and the LLM-assisted interface. Qualified reviewers could assess completeness, clarity, and correction burden without knowing which workflow produced each briefing. A user study could then examine task accuracy and completion time with national officials, using counterbalanced task order and appropriately comparable questions. This would help separate the contribution of the language interface from the benefit of assembling the data in the first place.

The institutional proposal also needs examination. Relevant evidence would include whether responsibilities are understood, errors reach the correct reviewer, corrections are completed, and national users can influence system priorities. Documented design meetings and maintenance decisions could support a process study. Comparing alternative arrangements across later deployments could examine which intermediary functions travel well across contexts. The present case does not establish that UN participation is necessary or superior to national, regional, or other institutional arrangements.

Longer-term policy impact is a further question. Better briefings may inform decisions without determining them, and emissions outcomes depend on many factors beyond the tool. Approval for use creates an opportunity to study these relationships; it does not resolve them. Current limitations also include the single-country setting, incomplete document coverage, untested safeguards, and the absence of a systematic assessment of user experience. The proposed safe harbor should consequently be judged through documented practice, including failures and contested cases.

## Implications for climate governance

The transferable element of this approach is the arrangement connecting evidence, assistance, and responsibility. Other countries would require their own NDC interpretations, institutional roles, data assessments, and priorities. Shared infrastructure could provide provenance records, evaluation methods, and correction mechanisms, while national institutions determine acceptable uses. Maintaining that balance would be a substantive part of the work of intermediation.

The Uganda NDC Data Explorer makes this institutional proposition concrete. It brings climate evidence and a constrained language interface into a setting where questions about sources, accounting, and authority have immediate practical consequences. Its experience shows why those questions must be addressed together in system design. Existing information is sufficient to examine whether the resulting analyses are accurate and useful; observing changes in policy and implementation will require further research.

International institutions could contribute by making climate AI inspectable, contestable, and maintainable in national settings. The opportunity is to organize the expertise and accountability that allow governments to use emerging tools with informed judgment. The next step is to evaluate that proposition through the Uganda implementation, documenting both useful assistance and the circumstances in which human review, better data, or refusal remains essential.

## References

1. United Nations Framework Convention on Climate Change. Paris Agreement. Article 4 (2015). [Official text](https://unfccc.int/sites/default/files/english_paris_agreement.pdf).

2. Larosa, F. et al. Large language models in climate and sustainability policy: limits and opportunities. Environmental Research Letters 20, 074032 (2025). [Published article](https://doi.org/10.1088/1748-9326/addd36).

3. Williams, H. T. P. et al. Developing trustworthy AI for climate services at scale. npj Climate Action 5, 74 (2026). [Published article](https://doi.org/10.1038/s44168-026-00420-z).

4. Cash, D. W. et al. Knowledge systems for sustainable development. Proceedings of the National Academy of Sciences 100, 8086–8091 (2003). [Published article](https://doi.org/10.1073/pnas.1231332100).

5. Republic of Uganda, Ministry of Water and Environment. Updated Nationally Determined Contribution (NDC) (September 2022). Figure 3-6, printed p. 41 (PDF p. 52). [Official document](https://unfccc.int/sites/default/files/NDC/2022-09/Updated%20NDC%20_Uganda_2022%20Final.pdf).

6. Lancellotti, B. V. et al. Closing Gaps in Emissions Monitoring with Climate TRACE. arXiv:2511.19277, version 2 (2026; first submitted 2025). [Versioned preprint](https://arxiv.org/abs/2511.19277v2).

7. UNFCCC Technology Mechanism. AI4ClimateAction initiative. Accessed 24 September 2026. [Official initiative](https://unfccc.int/ttclear/artificial_intelligence).

8. United Nations Secretary-General's High-level Advisory Body on Artificial Intelligence. Governing AI for Humanity: Final Report (2024). [UN Digital Library record](https://digitallibrary.un.org/record/4062495).

## Author contributions

Provisional statement for author confirmation: T.S. developed the NDC Data Explorer and prepared this manuscript. Contributions and the author list will be finalized with all contributors before submission.

## Acknowledgements

To be finalized from the original manuscript after confirming names, contributions, and permission to acknowledge individuals. Review of an earlier manuscript should be identified as such.

## Competing interests

The author developed the system discussed in this Perspective. Additional financial and non-financial interests, including the relevant institutional relationship, require confirmation before submission.

## Funding

The author should specify project and manuscript funding, internship support, in-kind data access, and any relevant funder roles before submission.

## Data and code availability

The official NDC and methodological sources are linked in the references. This Perspective reports no new user-study dataset or benchmark results. A versioned code release, inventory snapshots, model configuration, and any permitted Planet-derived data supporting future worked demonstrations should be identified before those demonstrations are reported as results. Data access conditions remain provider-specific.
