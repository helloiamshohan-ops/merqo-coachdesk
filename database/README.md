# Database migrations

`migrations/001_initial.sql` is the initial PostgreSQL production schema baseline. It is intentionally not executed automatically by the current Node development service. The current environment has no PostgreSQL executable.

Production migration requirements:

1. Run migrations through the application/deployment process using a least-privilege migration credential.
2. Back up before risky upgrades.
3. Record the schema version.
4. Never delete customer rows to force a migration through.
5. Run PostgreSQL integration and clean-restore tests before a release candidate.

The development adapter has a separate schema at `src/infrastructure/sqlite/schema.sql` and must not be used as a shared LAN database.
