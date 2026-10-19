# Architecture

## Locked target

MERQO CoachDesk is designed as an offline-first Windows product with a central application service from the beginning:

```text
WPF desktop client(s)
        │ authenticated HTTP/API calls
        ▼
ASP.NET Core application service
        │ use cases, authorization, transactions, validation
        ▼
Domain/application layers
        ▼
EF Core / PostgreSQL infrastructure
        ▼
PostgreSQL + managed attachments/backups
```

A single-PC installation may host the service and desktop client together. A later same-branch LAN deployment uses the same service boundary. The WPF client must never connect directly to PostgreSQL. PostgreSQL must not be replaced by a shared SQLite file in production.

## Current executable slice

The current host lacks the .NET SDK, PostgreSQL, and Windows. To prove a real vertical slice without silently changing the production decision, the repository contains a clearly isolated development compatibility path:

```text
Browser Bengali harness
        │ relative HTTP /api/v1
        ▼
Node.js 22 local service (`src/api/server.js`)
        │ repository/use-case boundary
        ▼
Node standard-library development adapter (`node:sqlite`)
```

The development adapter is useful for tests and local UX inspection only. It is not a LAN database, not a PostgreSQL substitute, and not evidence that the Windows product is complete. The canonical PostgreSQL schema is maintained separately in `database/migrations/`.

## Responsibilities

### Presentation

- Current: Bengali browser harness under `src/api/public/`.
- Target: WPF MVVM shell with a Bengali resource catalogue, validation state, keyboard navigation, print/report launchers, and API-only data access.
- Must not implement financial authorization or persistence rules locally.

### API/application service

- Versioned routes under `/api/v1`.
- JSON error envelope with request ID.
- Authentication and server-side permission checks.
- Input validation independent of UI validation.
- Transaction boundaries around payment persistence and audit rows.
- Pagination on list endpoints.
- No secret values in error messages or logs.

### Domain

- Money parsing and allocation validation.
- Enrollment uniqueness and capacity validation.
- Student lifecycle rules.
- License signature verification.
- Future: attendance, grading, refund/reversal, cash close, and import rules.

### Persistence

- Current development adapter: `SqliteDevelopmentRepository`.
- Target: EF Core PostgreSQL provider with migrations, indexes, FK constraints, numeric money types, and transaction isolation appropriate to payment posting.
- Attachments must be stored under a controlled root and never from arbitrary customer paths.

### Licensing

- Customer application contains only the public verification key and verification code.
- The private issuing tool is a separate boundary under `tools/`; no private key is committed.
- Branch identity is part of the signed payload. Invalid licensing state must not delete, lock, or corrupt customer data.

## API contract conventions in the slice

Success:

```json
{"data": {"...": "..."}, "requestId": "..."}
```

List success additionally includes `meta` with page, size, and total. Errors:

```json
{"error":{"code":"VALIDATION_ERROR","message":"বাংলা বার্তা"},"requestId":"..."}
```

The API is versioned so a future WPF client and future LAN clients can be upgraded deliberately.

## Concurrency and integrity

The current adapter uses a SQLite write transaction for the vertical slice. The production implementation must use PostgreSQL transactions and re-check fee-item balances inside the transaction. A payment idempotency key is unique per branch/application scope. Posted financial rows are append-oriented; corrections will be reversals/refunds/adjustments, not silent updates or deletes.

## Deployment topology

1. **Single PC:** PostgreSQL and ASP.NET Core service run locally; WPF uses loopback/service endpoint with authenticated requests.
2. **Same-branch LAN:** service binds to the configured branch interface, firewall rule is explicit, clients authenticate to the service, PostgreSQL remains private to the service host.
3. **No internet:** licensing, authentication, business operations, and backups have local paths. Optional integrations are disabled unless separately approved.

## Significant deviations and resolution

| Deviation | Reason | Resolution |
|---|---|---|
| Node development service instead of ASP.NET Core | .NET SDK is absent in the current Debian environment. | Keep it isolated and tested as a temporary slice; port the behavior to ASP.NET Core once a .NET-capable runner is available. |
| `node:sqlite` instead of PostgreSQL during local tests | No PostgreSQL server/client/Docker is installed. | Maintain the PostgreSQL migration baseline and require real PostgreSQL integration tests before RC. |
| Browser shell instead of WPF | No Windows/WPF build host exists. | Use browser harness only to prove API/UI interaction; final desktop shell remains a P0 deliverable. |
