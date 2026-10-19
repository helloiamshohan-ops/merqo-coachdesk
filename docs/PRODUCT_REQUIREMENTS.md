# Product requirements and traceability

This document turns the locked product prompt into a traceable backlog. A requirement is not considered complete merely because a source file exists.

## Status vocabulary

- `PASS` — implemented and exercised by an inspected test or artifact.
- `FAIL` — a release requirement is known not to be satisfied.
- `NOT RUN` — implementation may exist, but the corresponding verification has not run.
- `BLOCKED` — the environment or missing approved dependency prevents execution.
- `NOT APPLICABLE` — deliberately not part of the current slice, with a documented reason.

## Priority legend

- **P0** — architecture, security, data loss, financial corruption, or release-blocking.
- **P1** — essential daily workflow.
- **P2** — important operational capability.
- **P3** — enhancement after core stability.

## Traceability matrix

| ID | Requirement | Priority | Current status | Implementation / verification |
|---|---|---:|---|---|
| ARC-001 | Desktop must call a central application service, not PostgreSQL directly. | P0 | PASS (slice) | `src/api/server.js`; UI uses relative `/api/v1` calls. Final WPF service remains pending. |
| ARC-002 | PostgreSQL is the production database. | P0 | PASS (decision) | `database/migrations/001_initial.sql`; SQLite adapter is explicitly development-only. |
| OFF-001 | Core operation must work without internet. | P0 | PASS (slice) | No runtime network dependency in Node slice; final Windows verification is NOT RUN. |
| STU-001 | One student master profile supports multiple separate enrollments. | P0 | PASS (slice) | `students` and `enrollments` schema/repository; vertical-slice test. |
| STU-002 | Bengali/English text and searchable student records. | P1 | PASS (slice) | Student API/UI and Bengali test data. Duplicate-review UI is pending. |
| ACD-001 | Courses, batches, academic years, and enrollment validation. | P1 | PASS (slice) | Course/batch/enrollment API and tests. Subject, teacher, timetable, and transfer history pending. |
| FIN-001 | Money is not represented by floating-point arithmetic. | P0 | PASS (slice) | `src/domain/money.js`; minor-unit SQLite adapter; PostgreSQL `numeric(12,2)` baseline. |
| FIN-002 | Partial payment and manual allocation across fee items. | P0 | PASS (slice) | `recordPayment`, allocation tests. |
| FIN-003 | Duplicate payment submissions cannot post twice. | P0 | PASS (slice) | Idempotency key unique constraint and repeat-request test. |
| FIN-004 | Reversal, refund, adjustment, cash session, and correction workflows. | P0 | NOT IMPLEMENTED | Planned finance phase; no destructive delete is exposed in the slice. |
| SEC-001 | Server-enforced RBAC and password hashing. | P0 | PASS (slice) | `permissions.js`, scrypt hash, bearer session tests. Production account lifecycle pending. |
| SEC-002 | Audit log for consequential actions. | P0 | PASS (slice) | `audit_logs` plus mutation records; before/after coverage needs expansion. |
| LIC-001 | Signed offline branch license; private key never in customer app. | P0 | PASS (primitive) | Ed25519 module and tamper tests; production key custody pending. |
| LIC-002 | Recovery request/response without data destruction. | P0 | PASS (primitive) | Recovery format primitives/tests; import workflow and UI pending. |
| BAK-001 | Nightly/manual consistent backup, 30-day retention, external destination. | P0 | NOT IMPLEMENTED | `docs/BACKUP_AND_RECOVERY.md` defines the acceptance plan. |
| UI-001 | Bengali-only normal user-facing screens. | P1 | PASS (slice) | Bengali UI harness; WPF resource system and language QA pending. |
| DOC-001 | Bengali PDF shaping and printing inspected. | P0 | NOT RUN | No approved PDF library/Windows renderer available. |
| IMP-001 | Validated CSV/XLSX import with dry run and error report. | P1 | NOT IMPLEMENTED | Planned after core persistence. |
| RPT-001 | Permission-aware accurate reports/exports. | P1 | NOT IMPLEMENTED | Dashboard is the only current reporting surface. |
| OPS-001 | Windows installer and upgrade preservation. | P0 | BLOCKED | No Windows/.NET toolchain in current environment. |
| QA-001 | PostgreSQL, Windows, restore, performance, and security tests. | P0 | BLOCKED / NOT RUN | See `docs/TEST_STRATEGY.md` and status report. |

## Current vertical-slice acceptance criteria

- A caller without a bearer session cannot list or mutate records.
- A valid local administrator can create a Bengali student and retrieve it through the API.
- The service persists the student in a real temporary database.
- A student can have a separate enrollment and multiple fee items.
- A payment can allocate amounts to more than one fee item.
- Over-allocation fails without changing fee balances.
- Repeating an idempotency key returns the original payment rather than posting a second one.
- License payload mutation or wrong branch is rejected.
- `npm test` and `npm run check` complete successfully in the inspected environment.

## Out of scope for the current development slice

All unimplemented catalog modules remain on the roadmap. They must not be represented as available product functionality until their service, persistence, UI, authorization, and tests exist.
