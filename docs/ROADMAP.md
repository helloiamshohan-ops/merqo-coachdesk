# Roadmap

## Phase 0 — Audit and specification

**Status: PASS for current turn.** Repository/environment inspection, locked-decision record, requirements matrix, architecture, test strategy, and status report are present.

## Phase 1 — Production foundation

**Status: IN PROGRESS / BLOCKED by environment.**

- [x] Executable development service boundary.
- [x] Error envelope, validation, permissions, audit conventions.
- [x] Development persistence and initial PostgreSQL schema baseline.
- [x] Native tests and CI for available runtime.
- [ ] .NET solution and LTS version selection on a provisioned .NET runner.
- [ ] ASP.NET Core service, EF Core, PostgreSQL migrations.
- [ ] WPF project and API client.

## Phase 2 — Desktop foundation

**Status: NOT IMPLEMENTED.** Port the Bengali shell to WPF/MVVM, resource localization, keyboard navigation, real service configuration, loading/error states, and secure first-run setup.

## Phase 3 — Identity and academic modules

**Status: PARTIAL.** Slice has student/course/batch/enrollment persistence. Add guardians, staff, subjects, academic years, timetable conflict checks, attendance, exams/results, duplicate-review workflow, and reports.

## Phase 4 — Finance

**Status: PARTIAL.** Slice has fee items, partial payment, manual allocation, idempotency, outstanding balance, and audit. Add fee plans/invoices, discounts/concessions, unallocated/overpayment policy, reversal/refund/adjustment records, expenses, cash sessions, reconciliation, and financial reports.

## Phase 5 — Operations

**Status: NOT IMPLEMENTED.** Enquiries/follow-ups, tasks, global permission-aware search, custom fields, notifications, controlled attachments, CSV/XLSX import/export.

## Phase 6 — Licensing

**Status: PRIMITIVE PASS; product workflow pending.** Finish private key custody, issuance records, recovery UI, durable license metadata, reinstall and same-branch LAN verification.

## Phase 7 — Backup and recovery

**Status: NOT IMPLEMENTED.** PostgreSQL-consistent backup, retention, external destinations, validation, attachments, restore safety workflow, and clean restore tests.

## Phase 8 — Reports and documents

**Status: NOT IMPLEMENTED.** Select and license a PDF library after Bengali shaping inspection; add receipts, attendance sheets, result cards, ledgers, XLSX/CSV exports, and print tests.

## Phase 9 — LAN and packaging

**Status: BLOCKED.** Windows service/client topology, firewall/configuration, installer, upgrade/uninstall preservation, code-signing disclosure, checksums, and release artifacts.

## Phase 10 — Hardening and release

**Status: NOT RUN.** Security review, dependency review, performance, PostgreSQL concurrency, restore, Windows install/upgrade, documentation, and release gates.

## Priorities

P0 data integrity/security/architecture and release blockers come before visual enhancements. No feature should be marked complete until service behavior, persistence, authorization, UI path, and tests exist.
