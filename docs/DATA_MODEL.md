# Data model

## Modeling rules

- A student is a master identity. Enrollments are historical, separate records.
- User accounts and staff/teacher records are different concepts.
- Money is `numeric(12,2)` in PostgreSQL; no floating point money is permitted. The development adapter uses integer minor units to preserve the same arithmetic rule.
- Identifiers such as phone numbers, student IDs, roll numbers, and payment references are text.
- Internal timestamps are UTC `timestamptz` in PostgreSQL; UI rendering uses the configured institution locale.
- Posted financial records are not silently deleted. Corrections reference the original record.

## Current development schema

`src/infrastructure/sqlite/schema.sql` contains the executable slice:

```text
users ──< students ──< enrollments >── batches >── courses
                         │
                         └──< fee_items ──< payment_allocations >── payments

users ──< audit_logs
```

The development schema includes required uniqueness and foreign-key checks for student IDs, course/batch codes, enrollment identity, payment idempotency keys, and one allocation per payment/fee-item pair.

## Production migration baseline

`database/migrations/001_initial.sql` is a PostgreSQL baseline for the core identity, academic, finance, audit, and system records. It intentionally does not seed fake customer data. The next migrations will add attendance, exams, staff assignments, attachments, backups, imports, and configurable settings as each module is implemented.

Core production entities:

- Organization: `institutions`, `branches`, `settings`
- Security: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `audit_logs`
- Academic: `academic_years`, `courses`, `subjects`, `batches`, `students`, `guardians`, `student_guardians`, `enrollments`
- Finance: `fee_types`, `fee_plans`, `fee_plan_items`, `fee_assignments`, `invoices`, `invoice_items`, `payments`, `payment_allocations`, `refunds`, `adjustments`, `expense_categories`, `expenses`, `cash_sessions`
- System: `schema_migrations`

## Lifecycle and retention

| Entity | Lifecycle rule |
|---|---|
| Student | Archive/withdraw with history preserved; do not delete if referenced. |
| Enrollment | Active, completed, withdrawn, or cancelled; prior enrollment remains visible. |
| Invoice/payment | Posted records remain immutable; correction is linked reversal/refund/adjustment. |
| Audit log | Append-only for ordinary users; retention policy must be approved before release. |
| Attachment | Controlled storage root, access checked by record permission, included in backup plan. |
| User | Deactivate instead of deleting a user who acted in audit history. |

## Future integrity requirements

- Add PostgreSQL exclusion/overlap checks or service-level conflict checks for timetable resources.
- Add transaction-safe allocation and row locking for concurrent payments.
- Add migration smoke tests from every supported prior schema.
- Add tenant/branch scoping to every customer-owned query before LAN release.
- Add explicit soft-delete/archive policy and data export/retention tooling.
