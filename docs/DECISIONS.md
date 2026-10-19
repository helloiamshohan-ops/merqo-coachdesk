# Architecture and product decisions

| ID | Date | Decision | Reason / consequence |
|---|---|---|---|
| ADR-001 | 2026-10-19 | Retain a central application service boundary. | Enables single-PC now and same-branch LAN later; clients never connect directly to PostgreSQL. |
| ADR-002 | 2026-10-19 | PostgreSQL remains the production database. | Required for robust concurrent service operation and clear production architecture. Current SQLite adapter is development-only because PostgreSQL is unavailable in the host. |
| ADR-003 | 2026-10-19 | Use a Node standard-library vertical slice temporarily. | The environment has Node 22 but no .NET SDK/Windows/PostgreSQL. This provides verifiable behavior without pretending a WPF build exists. It must be ported, not promoted to the production stack. |
| ADR-004 | 2026-10-19 | Use integer minor units in the development finance adapter and `numeric(12,2)` in PostgreSQL. | Prevent floating-point money errors while keeping a simple migration path. |
| ADR-005 | 2026-10-19 | Payment writes require a caller-supplied idempotency key. | Prevents accidental repeated payment submissions and supports safe retries. |
| ADR-006 | 2026-10-19 | Posted financial history is append-oriented. | Reversals, refunds, and adjustments preserve traceability instead of silently deleting history. |
| ADR-007 | 2026-10-19 | Ed25519 signed licenses with a private-tool boundary. | Public verification can ship to customers; private issuance material must never ship or enter Git. |
| ADR-008 | 2026-10-19 | No fake seed customer data. | Development tests use clearly scoped temporary fixtures; normal startup creates only a development administrator. |
| ADR-009 | 2026-10-19 | Bengali is the normal user-facing language. | Product requirement for Bangladesh market; user-entered Bengali/English values are both supported. |
| ADR-010 | 2026-10-19 | Release classification is Development Build until evidence supports more. | Missing Windows, PostgreSQL, installer, backup/restore, PDF, and full-module verification must not be concealed. |

## Locked decisions preserved from product direction

- Offline-first core operation; no mandatory cloud/login/telemetry/online license check.
- One branch license covers authorized LAN clients in that branch.
- Student master profile and separate enrollment records.
- Partial payments and authorized manual allocations.
- Financial corrections must be traceable/reversible, not destructive.
- Automatic/manual backup with 30-day default retention and external destination support.
- Bengali-first UI and document requirement.
- Private License Generator separate from customer application.
