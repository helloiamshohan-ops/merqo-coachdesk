# Developer guide

## Local commands

```bash
npm test
npm run check
npm run dev
node tools/license-generator.mjs --self-check
```

No `node_modules` directory or external npm package is required for the current slice. Use Node.js 22 or later because `node:sqlite` is used by the development adapter.

## Boundaries

- `src/api/` — HTTP transport and temporary UI harness.
- `src/application/` — permission policy and future use cases.
- `src/domain/` — business rules independent of transport.
- `src/infrastructure/sqlite/` — development-only persistence.
- `src/licensing/` — format and cryptographic verification.
- `tests/` — real temporary persistence and HTTP tests.
- `database/migrations/` — PostgreSQL production baseline.

Do not add customer-specific fixtures to normal startup. Tests create temporary records under the OS temporary directory.

## Adding a mutation

1. Validate at the API boundary and again in the application/domain rule.
2. Require a permission on the server.
3. Use a repository transaction for multi-row state changes.
4. Preserve posted financial history.
5. Add an audit row in the same transaction.
6. Return a stable versioned response and Bengali user message.
7. Add a test that exercises persistence and an unauthorized/failure path.
8. Update requirements/status documentation.

## Production porting plan

Port domain rules first to C# projects targeting the selected .NET LTS. Keep the HTTP contract and PostgreSQL schema explicit. Add genuine PostgreSQL integration tests before removing the development adapter from local verification. Build WPF only after the API use cases are functional.
