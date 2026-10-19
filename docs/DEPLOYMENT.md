# Deployment guide

## Current development slice

### Requirements

- Node.js 22 or later.
- A local writable data directory.
- No internet connection is required after Node is available.

### Run

```bash
npm test
npm run check
COACHDESK_DATA_DIR=/path/to/local-data \
COACHDESK_DEV_PASSWORD='use-a-local-development-password' \
COACHDESK_PORT=4310 \
npm start
```

Open `http://localhost:4310`. The service binds to `0.0.0.0` for sandbox preview compatibility. Do not expose this development service on a customer LAN: it uses a temporary SQLite adapter, an in-memory session store, and a development bootstrap account.

### Local data

`coachdesk-development.sqlite` is created below `COACHDESK_DATA_DIR`. It is ignored by Git. Stop the service before moving or deleting the development directory. There is no supported backup/restore workflow for this development file.

## Approved production deployment target

The intended target is a Windows PC with:

1. PostgreSQL supported by the selected .NET/EF Core release.
2. ASP.NET Core application service installed as a controlled local Windows service or managed process.
3. WPF desktop client installed separately from customer data.
4. Configured institution and branch identity.
5. First administrator creation through a secure first-run flow.
6. Service bound to loopback by default; LAN binding is explicit and firewall-controlled.
7. Database credentials stored outside source and installer artifacts.
8. Scheduled backup destination configured before normal operation.
9. Public license verification key installed; private generator never installed on customer PCs.

The above is a target procedure, not a claim that the installer exists today.

## Upgrade requirements

- Back up before migrations.
- Run versioned EF/PostgreSQL migrations in a controlled maintenance state.
- Preserve customer data and attachments.
- Verify schema version, login, student lookup, finance balances, and a sample report after upgrade.
- Keep the previous application binaries available for documented rollback where safe.
- Never delete the database during uninstall or upgrade without explicit, verified authorization.

## LAN readiness checklist

- Service host and branch identity confirmed.
- PostgreSQL is not exposed to clients.
- Firewall allows only the configured service port.
- Client authentication succeeds.
- Wrong-branch license is rejected without data loss.
- Concurrent payment tests pass.
- Network interruption produces a recoverable error and no duplicate post.
- Backup destination is external or otherwise independently recoverable.

Status: **BLOCKED / NOT RUN** until a Windows/PostgreSQL environment is available.
