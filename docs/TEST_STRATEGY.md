# Test strategy

## Status vocabulary

Use only `PASS`, `FAIL`, `NOT RUN`, `BLOCKED`, and `NOT APPLICABLE`. An existing test file is not evidence of a passing test until the command is executed and inspected.

## Commands currently verified

```bash
npm test       # PASS: 6 tests
npm run check  # PASS: 15 JavaScript files
```

The current tests use a real temporary SQLite file through the development repository, not an in-memory fake. They exercise real HTTP requests for the API path.

## Current test coverage

- public health endpoint and unauthenticated denial,
- Bengali student creation/search/dashboard,
- course, batch, enrollment, fee-item persistence,
- multi-item manual allocation,
- partial second payment,
- duplicate idempotency key,
- over-allocation rollback/no balance mutation,
- Ed25519 signature, branch, tamper, and recovery request checks,
- money parser precision and zero/three-decimal rejection.

## Required unit tests before RC

- enrollment lifecycle, capacity, transfer, withdrawal, re-enrollment,
- fee plans, concessions, late fee rules, historical invoice preservation,
- full/partial/multi-item/unallocated/overpayment handling,
- reversal, partial/full refund, adjustment, cash reconciliation,
- attendance percentages and correction audit,
- grading/ranking/tie/missing-mark rules,
- permission matrix and cross-branch scope,
- license malformed/wrong-key/reinstall/same-branch cases,
- backup retention and restore validation.

## Required PostgreSQL integration tests

Use a genuine supported PostgreSQL instance in CI or a controlled test environment. Do not replace all PostgreSQL tests with SQLite.

- migrations from empty schema and previous supported schema,
- constraints/indexes and decimal calculations,
- transaction rollback,
- concurrent payment allocation and idempotency,
- API authorization and branch isolation,
- import staging and export encoding,
- backup creation and clean restore,
- attachment path/backup behavior.

Status: **BLOCKED** in the current environment because PostgreSQL is not installed.

## UI/localization tests

- Bengali display, input, Unicode normalization, copy/paste, search and sorting,
- keyboard focus and shortcuts,
- long names/table pagination,
- permission-restricted fields,
- loading/error/empty/success states,
- Bengali PDF shaping, embedded fonts, mixed text, page breaks, print output.

Current browser visual/manual test: **NOT RUN**.

## Windows installation tests

On a Windows runner/VM:

1. Clean install and first admin setup.
2. Start/restart service and client.
3. Upgrade with existing data.
4. Failed migration recovery.
5. Uninstall preserving customer data.
6. Installer metadata/code-signing status.
7. Offline operation and branch-LAN client behavior.

Current status: **BLOCKED** because no Windows host or .NET SDK is available.

## Performance tests

Record environment and actual numbers for:

- startup,
- paginated student search,
- dashboard queries,
- 10,000-student fixture import,
- report generation,
- backup/restore,
- concurrent service requests.

A 10,000-row test is a benchmark scenario and must not be marketed as a capacity guarantee.
