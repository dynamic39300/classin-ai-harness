# DW sample import readiness

Status: PARTIAL IMPORT; one draft homework has been created and read back. User authorized test-account sample restoration for IM Copilot evaluation. Production source remains read-only.

## Target and scope

Use the existing authenticated teacher test environment and owned test class identified in the authentication probe. Keep existing courses intact. Import a small set of source-backed cases; do not copy production identities or credential-bearing media links into repository artifacts.

## Verified target contracts

All paths below are Apifox document paths in LMS project 345129; gateway prefix must be resolved before calls.

| Object | Endpoint ID | Path | Required migration work |
| --- | --- | --- | --- |
| Category | 3496918 | /app/category/create | Target class ID and category name |
| Homework | 3471034 | /app/activity/homework/create | Teacher/class/student remapping; unit/category; timing; full content; grading and sharing settings |
| Exam | 3495080 | /app/activity/exam/createV2 | New-format paperInfo and question references; learner roster; grading and timing |
| Recorded video | 3471135 | /app/activity/recordClass/create | Target-valid video resources and learner roster; playback settings |
| Homework scores | 3492860 | /app/activity/homework/scoreImportConfirm | Existing target activity and student IDs; scores alone do not reconstruct submissions |
| Unit/activity import | 3487643 | /basic/createUnitAndActivity | Requires TeacherIn repoId; not an arbitrary DW record importer |

## Source check

A real upcoming homework record was joined from activity metadata to the homework source by biz_id/homework_id. Its description is empty and assigned learner count is six. Content/resource completeness must be verified before writing; an empty imitation must not be presented as a restored case.

## Current dependency

No supported facility for restoring historical submissions, grading history and recorded-video progress has been established. Searched registered interface names for import/sync/migration; found student imports and score synchronization, but not proof of a complete historical learning-record importer. This is not proof that such a facility does not exist. Need the existing test seeding service/script or documented test database import facility. Do not impersonate production learners with the teacher credential.

## Readback acceptance

- Category/unit/activity counts and ID links reconcile with the selected source cases.
- Activity content is present and attachments resolve under target authorization.
- Assigned student count and individual records agree; score units are preserved.
- Time shifting preserves chronology; future activities cannot silently inherit completed outcomes.
- Teacher API readback and IM Copilot context checks pass before calling the dataset complete.

## First write and readback

Created category 3153556 (DW-Copilot-20260911) in test class 591820. Created draft homework activity 54580067, unit 53173051, from a reviewed plain-text DW homework case. Source content contains ten mathematics questions in Vietnamese; no translation or invented answers. Detail API returned success and 3355 characters of content, one test learner, and draft publication flag 0.

The source had five learners; only one existing test learner is assigned here. No historical responses or grading records imported. This is a content/configuration probe, not a complete monthly case collection or completed Copilot integration.

Time shifted forward while preserving the original duration. Source max_score=10000 was mapped to API maxScore=100 using a provisional factor of 100; API readback confirms 100, but this alone does not prove source score semantics. Independently verify source scaling before expanding scored imports. Script now requires the caller to specify source_score_scale explicitly.

Create rejected hidden publication flag 1 and maxScore greater than 999 despite incomplete Apifox documentation. Retry used draft flag 0. The earlier rejected request and successful request have separate private receipts outside the repository. Course creation succeeded with SID and login_uid added to the documented parameters.

Script: reference/classin-api/scripts/import_homework_case.py. Reads a reviewed source/target mapping from stdin, dry-run by default; --apply requires an exclusive external receipt to prevent accidental reuse. Source records and credentials are not embedded. Syntax parsed successfully; the first live write/readback was exercised. Future caller must supply a verified learner roster and score scaling; remaining activity types and full source relation mappings are not implemented.
