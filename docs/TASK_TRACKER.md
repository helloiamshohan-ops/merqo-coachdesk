# Task tracker

| Task ID | Description | Priority | Dependency | Status | Implementation / test reference |
|---|---|---:|---|---|---|
| FOUNDATION-001 | Inspect repository and runtime capabilities | P0 | none | PASS | `docs/PROJECT_STATUS.md` |
| FOUNDATION-002 | Establish versioned API and error envelope | P0 | FOUNDATION-001 | PASS | `src/api/server.js`, `src/shared/http.js` |
| FOUNDATION-003 | Add development persistence and migration baseline | P0 | FOUNDATION-001 | PASS (development) | `src/infrastructure/sqlite/`, `database/migrations/` |
| FOUNDATION-004 | Add automated vertical-slice tests | P0 | FOUNDATION-002/003 | PASS | `tests/vertical-slice.test.js`, `npm test` |
| STUDENT-001 | Student master record create/search/detail | P1 | FOUNDATION | PASS (slice) | `repository.js`, API routes, tests |
| ACADEMIC-001 | Course/batch/enrollment records | P1 | STUDENT-001 | PASS (slice) | API routes, tests |
| FINANCE-001 | Fee item and partial multi-allocation | P0 | ACADEMIC-001 | PASS (slice) | `src/domain/finance.js`, repository, tests |
| FINANCE-002 | Refund/reversal/adjustment/cash session | P0 | FINANCE-001 | NOT IMPLEMENTED | Roadmap phase 4 |
| SECURITY-001 | Password hashing, sessions, server RBAC | P0 | FOUNDATION | PASS (slice) | `permissions.js`, server, tests |
| SECURITY-002 | Branch scoping and production account recovery | P0 | .NET/PostgreSQL foundation | NOT IMPLEMENTED | Required before RC |
| LICENSING-001 | Signed license and recovery primitives | P0 | FOUNDATION | PASS (primitive) | `src/licensing/license.js`, tests |
| LICENSING-002 | Secure production key custody and customer recovery UI | P0 | operational decision | BLOCKED | No production key/tooling approval yet |
| BACKUP-001 | Consistent backup, retention, restore | P0 | PostgreSQL foundation | NOT IMPLEMENTED | `docs/BACKUP_AND_RECOVERY.md` |
| WINDOWS-001 | WPF client and Windows installer | P0 | .NET/Windows runner | BLOCKED | Environment limitation |
| REPORT-001 | Bengali PDF/XLSX reports and printing | P0 | WPF/reporting library | NOT IMPLEMENTED | Requires rendering validation |
| QA-001 | PostgreSQL, Windows, LAN, restore, performance gates | P0 | all core modules | BLOCKED / NOT RUN | `docs/TEST_STRATEGY.md` |
