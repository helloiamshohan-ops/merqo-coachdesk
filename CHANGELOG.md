# Changelog

All notable changes to MERQO CoachDesk are documented here.

## [0.1.0-dev] — 2026-10-19

Status: **Development Build**. This is the first executable vertical slice, not a production release.

### Added

- Central local application service with Bengali-first browser shell.
- Versioned HTTP API for authentication, students, courses, batches, enrollments, fee items, payments, dashboard metrics, and audit entries.
- Development-only SQLite adapter to make the service executable in the current environment; PostgreSQL remains the production database decision.
- Transactional partial-payment allocation with integer minor units, idempotency keys, and audit records.
- Ed25519 license signing and verification library with an external-key boundary.
- Native Node test suite covering auth, persistence, enrollment, payment allocation, duplicate submission protection, and license tampering.
- Initial product, architecture, security, data-model, backup, deployment, testing, roadmap, and limitation documentation.

### Not included yet

- Verified .NET/WPF build, PostgreSQL runtime, Windows installer, Bengali PDF shaping verification, LAN deployment verification, and production key provisioning.

[0.1.0-dev]: https://github.com/helloiamshohan-ops/merqo-coachdesk/commits/arena/01db4208-merqo-coachdesk
