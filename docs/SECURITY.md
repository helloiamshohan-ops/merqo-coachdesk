# Security model

## Current controls

- Passwords are hashed with Node's `scryptSync` and a random salt; plaintext passwords are never stored or logged.
- Login returns an in-memory bearer session with an eight-hour expiry. Failed login attempts are rate limited per source address in the development service.
- Route handlers call server-side permission checks. The UI is not a security boundary.
- API bodies are JSON-only and capped at 1 MiB.
- Validation rejects malformed dates, phone numbers, text lengths, and money values.
- Payment idempotency keys and database constraints prevent repeated posting.
- Audit rows are written within the same transaction as vertical-slice mutations.
- Error responses expose request IDs and Bengali-safe messages, not stack traces or SQL.
- Private license keys are not part of the application code or test fixtures.

## Roles in the slice

- `administrator`: all current slice permissions.
- `cashier`: read students/academics/finance and post payments; cannot configure academic or fee records.
- `viewer`: read students and academics; finance metrics are withheld.

The production role catalogue will be configurable and will add institution owner, manager, admission officer, teacher, finance officer, report viewer, and granular approve/reverse/refund/export/restore permissions.

## Required production controls before release

1. Replace in-memory sessions with a reviewed ASP.NET Core authentication/session design and secure local secret storage.
2. Use least-privilege PostgreSQL credentials; never expose PostgreSQL directly to client PCs.
3. Add login lockout/recovery workflow without a hidden master account.
4. Add TLS or an explicit trusted local transport policy for LAN exposure, firewall documentation, and service binding controls.
5. Scope every query to institution and branch; test cross-branch access denial.
6. Add CSRF/origin policy as appropriate to the WPF/API transport and LAN deployment.
7. Audit all sensitive reads/exports as well as writes; redact personal information not needed in the audit record.
8. Validate import files, prevent CSV formula injection, limit spreadsheet size, and stage imports before commit.
9. Constrain attachment paths to a configured root; do not execute uploaded files.
10. Scan dependencies and generated artifacts; run secret detection before release.
11. Protect backup files and document encryption-key custody if encryption is offered.
12. Perform a manual authorization review with modified-client tests.

## Threats explicitly not solved by the current slice

- A compromised local administrator can access local application data; Windows account, disk, and PostgreSQL hardening are deployment responsibilities still pending.
- The development bootstrap password is unsuitable for customers.
- In-memory sessions are lost on restart and are not a finished account-management design.
- The browser shell is not a hardened Windows desktop client.
- No production key custody, code signing, Windows service identity, or LAN certificate policy is configured.

## Incident principles

- Preserve the database and audit trail first; do not delete evidence.
- Disable a compromised account or service binding, then take a safety backup.
- Use the offline recovery protocol for licensing; never ship a bypass key.
- Record incident actions without recording passwords, private keys, or unnecessary student data.
