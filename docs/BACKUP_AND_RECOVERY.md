# Backup and recovery

## Policy

The approved product policy is automatic and manual backup, a configurable nightly schedule, default 30-day retention, external-drive support, backup history/status, failure reporting, integrity validation, and a controlled restore workflow. A same-disk copy alone is not sufficient disaster recovery.

## Current status

**NOT IMPLEMENTED.** The current development SQLite file is ignored by Git and is not a supported customer backup. No backup operation may be reported as successful until a recoverability test has restored a clean database and verified attachments.

## Target design

- PostgreSQL-consistent logical or physical backup selected after testing on supported versions; never copy live database files casually.
- Application-managed attachments included in a manifest or separately backed up with checksums.
- Temporary file plus fsync/atomic rename so an interrupted operation is not recorded as complete.
- Backup record with start/end time, destination, size, schema version, checksum, result, and failure reason.
- Retention job protects the newest usable backup and never silently removes the last recoverable copy.
- Destination can be local removable/external storage; the UI clearly warns if destination is the same physical volume.
- Optional encryption only after a maintained, verified mechanism and separate key-custody procedure are selected.

## Restore workflow acceptance criteria

1. Authorized user selects a listed backup.
2. Service validates format, checksum, schema compatibility, attachment manifest, and available space.
3. UI displays source, date, version, and consequences.
4. Service creates a safety backup of the current state where feasible.
5. Explicit confirmation is required.
6. Restore occurs in a controlled maintenance state.
7. Schema, representative records, balances, audit rows, and attachments are verified.
8. Result is recorded; failure leaves the previous state recoverable and displays next steps.

## Test matrix

| Scenario | Status |
|---|---|
| Manual backup | NOT RUN |
| Nightly scheduling | NOT RUN |
| 30-day retention | NOT RUN |
| External drive unavailable | NOT RUN |
| Insufficient space | NOT RUN |
| Interrupted/corrupt artifact | NOT RUN |
| Clean-environment restore | NOT RUN |
| Attachment recovery | NOT RUN |
| Restore failure and safety backup | NOT RUN |
| Encrypted backup key loss behavior | NOT APPLICABLE until encryption is implemented |

## Operational guidance today

Do not use the development SQLite file for customer data or treat it as a disaster-recovery solution. Until the PostgreSQL backup module exists, the only honest status is `NOT IMPLEMENTED`.
