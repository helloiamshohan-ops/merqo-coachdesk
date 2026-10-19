# MERQO CoachDesk project status

**As-of:** 2026-10-19 (UTC)
**Branch:** `arena/01db4208-merqo-coachdesk`
**Release classification:** **Development Build**
**Product version:** `0.1.0-dev`

## Executive status

The repository began as a one-line README with no application source, solution, test project, migration, workflow, or release configuration. A working development vertical slice has now been added. It proves a central service/API path, actual persistence, a Bengali-first UI harness, authentication/authorization foundations, student and enrollment records, fee items, transactional partial-payment allocation, idempotency, audit records, and Ed25519 license primitives.

This is **not production-ready**. The target Windows/.NET/PostgreSQL application remains a staged implementation. The current environment cannot verify the required Windows desktop or PostgreSQL deliverables.

## Repository and environment inspection

| Check | Status | Observed fact |
|---|---|---|
| Repository checkout | PASS | `/home/user/merqo-coachdesk` is a Git checkout on the required branch. |
| Git working branch | PASS | `arena/01db4208-merqo-coachdesk`; no branch switch was performed. |
| GitHub remote | PASS | `https://github.com/helloiamshohan-ops/merqo-coachdesk.git`. |
| GitHub access | PASS | `gh repo view` confirmed a public repository and `ADMIN` viewer permission. No remote write/release was performed. |
| Initial repository state | PASS | Initial commit `1ced149` contained only `README.md`. |
| Operating system | PASS | Debian GNU/Linux 12 (bookworm). |
| Node.js | PASS | Node.js `v22.22.3`; npm `10.9.8`. |
| .NET SDK | BLOCKED | `dotnet` is not installed. No WPF/ASP.NET Core build could be run. |
| PostgreSQL client/server | BLOCKED | `psql`, `postgres`, `pg_dump`, and `initdb` are not installed. |
| Windows build host | BLOCKED | Current host is Linux; no Windows runner is available inside this turn. |
| Docker | BLOCKED | Docker executable is not installed. |
| Installer tool | NOT RUN | Inno Setup or another Windows installer tool is not available on this host. |
| Browser automation | NOT RUN | No browser automation runner is installed; UI source and HTTP endpoints were inspected, but visual/manual acceptance is pending. |
| Outbound package policy | PASS | Work used the already available Node runtime and standard library; no external npm package was added. |

## Implemented and verified in this phase

| Area | Status | Evidence |
|---|---|---|
| Central application service | PASS | `src/api/server.js` exposes versioned HTTP endpoints and serves the local UI. |
| Database-backed persistence | PASS | `src/infrastructure/sqlite/repository.js` persists to a temporary SQLite database in tests. |
| Production database direction | PASS | PostgreSQL schema baseline is in `database/migrations/001_initial.sql`; SQLite is explicitly development-only. |
| Bengali-first UI harness | PASS | `src/api/public/` contains Bengali navigation, login, dashboard, and student workflow. Browser visual acceptance is still NOT RUN. |
| Authentication | PASS | Local password hash using Node `scrypt`, bearer sessions, failed-login rate limit. Development bootstrap only. |
| Server authorization | PASS | Role/permission checks are performed in the API, not only in the UI. |
| Student master profile | PASS | Create, search, list, and detail API behavior is implemented and tested. |
| Enrollment history | PASS | Separate enrollment records and duplicate guard are implemented and tested. |
| Operational finance slice | PASS | Fee items, partial payment, manual multi-item allocation, outstanding balance, and idempotency are implemented and tested. |
| Audit trail | PASS | Mutating vertical-slice operations create audit rows; audit API is permission-gated. |
| License primitive | PASS | Ed25519 issue/verify and recovery request/response primitives have tamper tests. |
| Automated tests | PASS | `npm test`: 6 tests passed. |
| Syntax/quality check | PASS | `npm run check`: 15 JavaScript files passed `node --check`. |
| CI configuration | PASS | `.github/workflows/ci.yml` is prepared for the executable development slice. |

## Not yet verified or implemented

- .NET LTS solution, ASP.NET Core production service, EF Core migrations, and WPF desktop client: **BLOCKED / NOT IMPLEMENTED**.
- PostgreSQL execution, migration upgrade, concurrent transaction behavior, and `pg_dump` restore: **BLOCKED**.
- Full student, academic, attendance, examination, staff, timetable, CRM, task, attachment, import/export, reporting, and notification modules: **NOT RUN / NOT IMPLEMENTED**.
- Production authentication/account recovery, LAN TLS/network policy, and Windows service hosting: **NOT RUN**.
- Production private-key custody and License Generator operational controls: **BLOCKED**; no production key exists in the repository.
- Automatic nightly backup, external-drive rotation, encrypted backup, and verified restore: **NOT IMPLEMENTED**.
- Bengali PDF shaping, font embedding, printing, and XLSX rendering: **NOT RUN**.
- Windows publish, installer, code signing, clean install, upgrade, uninstall data preservation: **BLOCKED**.
- Performance benchmark at 10,000 students: **NOT RUN**.
- Full dependency vulnerability/license review: **NOT APPLICABLE to the no-dependency slice; required when the .NET stack is added**.

## Gate summary

| Release gate | Status | Note |
|---|---|---|
| Working vertical slice | PASS | Real API and persistence path is tested. |
| Unit/business rules | PASS | Current slice tests finance and licensing rules; coverage is incomplete. |
| PostgreSQL migrations | NOT RUN | SQL baseline exists but cannot be executed here. |
| Windows build | BLOCKED | No .NET SDK/Windows environment. |
| Installer | BLOCKED | No Windows installer tool/host. |
| Bengali PDF | NOT RUN | No rendering library or inspection environment. |
| Offline core operation | PASS | Current slice uses local service and local SQLite without network dependencies; this is not proof of the final Windows product. |
| Backup/restore | NOT IMPLEMENTED | See `docs/BACKUP_AND_RECOVERY.md`. |
| Branch license model | PASS | Pure Ed25519 format test passed; branch LAN deployment is NOT RUN. |
| Security review | NOT RUN | Foundational controls exist; formal review is pending. |
| Production readiness | FAIL | Multiple P0/P1 release gates are incomplete. |

## Next actions

1. Provision a supported .NET LTS SDK and Windows CI runner; create the solution boundaries without changing the locked architecture.
2. Implement ASP.NET Core + EF Core against PostgreSQL and port the tested domain rules.
3. Replace the browser harness with WPF while retaining the API boundary.
4. Add PostgreSQL integration tests, backup/restore tests, and Windows installation tests.
5. Finish Bengali document rendering and operational modules before considering a release candidate.
