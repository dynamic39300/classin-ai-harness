# DW-derived test data acceptance

Status: feasibility work in progress; no source teacher selected, no business records exported or imported.

## User requirements

- Source business records must originate from online DW data. Generated substitutes do not satisfy source authenticity.
- Cover teacher, class, category, unit, activity configuration, assigned learners, responses, grading and learning progress. Missing fields or activity types remain explicit gaps.
- Persist in the ClassIn test environment and verify through existing teacher APIs, not merely local JSON or UI mocks.
- Map scheduled activities to the next month. Preserve original timestamps in controlled provenance, record transformed timestamps separately, and avoid future activities with already-completed learner records unless explicitly using a replay clock. Historical outcomes need an agreed time policy.

## Acceptance checks

1. Source snapshot date and extraction scope recorded. Identity anonymization and ID remapping preserve relationships.
2. Per-activity coverage matrix includes field availability, content/resource accessibility, learner roster, state semantics and score units.
3. Target IDs do not retain production authority or credentials. No production personal records committed to repository.
4. Import uses a verified test write interface or supported seeding facility; retry, cleanup and ownership scope defined. Current teacher read credentials do not establish database write access.
5. API readback reconciles object counts, links, activity time windows, learner status and aggregate/individual results against the transformed source snapshot.

## Verified access and blockers

DW knowledge and query services reachable using existing local configuration. Current role has access to selected warehouse datasets, but not online raw operational data. Knowledge and summary-table metadata were inspected. No candidate data query executed.

Candidate selection draft: classes with teachers, 10-100 learners, and all four core types (classroom, homework, exam, recorded video), followed by verification of assigned teachers and individual records. The learner range is an initial sampling preference, not a completeness guarantee.

The read-only query plan shows a full scan of an unpartitioned summary. Skill performance guidance requires user choice before executing this candidate query. Test write/import capability remains unverified.
