# MERQO CoachDesk

**বাংলা-প্রথম, অফলাইন-প্রথম কোচিং সেন্টার ব্যবস্থাপনা সফটওয়্যারের ভিত্তি।**

MERQO CoachDesk is intended to become a commercially distributable Windows desktop product for coaching centres in Bangladesh. The repository currently contains a verified, executable **development vertical slice**: a local application service, a Bengali-first browser shell used as a temporary UI harness, a transactional local persistence adapter, a finance allocation path, an audit trail, and licensing primitives.

> **Honest status:** this is a Development Build, not a production release. The current environment has Node.js 22 but no .NET SDK, Windows runner, PostgreSQL server/client, or Windows installer tool. The approved production decisions are preserved in the documentation and PostgreSQL schema. The SQLite adapter and browser shell are explicitly development-only compatibility paths; they do not replace PostgreSQL or WPF in the production architecture.

## Quick start in the current environment

Requirements: Node.js 22 or later.

```bash
npm test
npm run check
npm run dev
```

Then open `http://localhost:4310`. The development-only login is:

- ব্যবহারকারী: `admin`
- পাসওয়ার্ড: `local-development-only`

The service creates local data under `var/development/`. That directory is ignored by Git. The server binds to `0.0.0.0` so the application can be inspected through a sandbox preview. Do not expose this development password or SQLite store to a customer LAN.

Useful commands:

```bash
COACHDESK_DATA_DIR=/tmp/coachdesk-data COACHDESK_DEV_PASSWORD='another-local-password' npm start
npm run license:help
```

## What the vertical slice proves

1. The browser UI calls the application service; it does not access the database.
2. The service authenticates a local user, applies role checks, validates input, and records audit events.
3. Students, courses, batches, enrollments, fee items, and payments are persisted.
4. A payment can be allocated across multiple fee items and repeated submissions are idempotent.
5. Payment mutations are transactional and use integer minor units in the development adapter. The production PostgreSQL model uses `numeric(12,2)` as documented.
6. License payloads can be signed and verified with Ed25519 without shipping a private key.
7. Tests exercise real persistence and HTTP requests against a temporary local database.

## Repository map

```text
src/
  api/                 Central HTTP application service and Bengali web harness
  application/         Use-case validation and permission policy
  domain/              Finance and identity business rules
  infrastructure/      Development SQLite adapter and schema
  licensing/           Public-key license primitives
  shared/              API errors, serialization, and validation helpers
tests/                 Native Node test suite
 database/migrations/  Canonical PostgreSQL production schema baseline
tools/                 Private-tool boundary; no production key material
 docs/                  Requirements, architecture, operations, QA, and status
 scripts/               Repository checks
```

## Production direction

The locked target remains a C#/.NET LTS WPF desktop application calling an ASP.NET Core service backed by PostgreSQL. The implementation plan, deviations, release gates, and blocked verification items are maintained in [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Security and data handling

Never commit customer data, database files, private signing keys, passwords, recovery responses, or production license material. Read [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/LICENSING.md`](docs/LICENSING.md) before extending the system.

## License

MERQO CoachDesk is proprietary software. See [`LICENSE`](LICENSE) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
