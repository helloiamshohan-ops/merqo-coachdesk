# Known limitations

This list is intentionally explicit for the `0.1.0-dev` Development Build.

1. The executable service is Node.js 22, not the approved production ASP.NET Core/.NET service.
2. The executable persistence path is `node:sqlite`, not PostgreSQL. It must not be used as a shared LAN database or customer production database.
3. The UI is a browser harness, not a WPF Windows desktop application.
4. The development administrator/bootstrap password is intentionally unsuitable for a customer installation.
5. Sessions are in memory and are lost on service restart.
6. Only a subset of student/academic/finance behavior exists. Guardians, attendance, exams, reports, expenses, cash sessions, refunds, reversals, import/export, attachments, and notifications are not implemented.
7. No scheduled or manual backup/restore feature exists yet.
8. The license library is tested, but production public-key provisioning, key custody, durable license records, and recovery UI are incomplete.
9. No Bengali PDF rendering or print output has been inspected.
10. No Windows build, WPF validation, installer, code signing, upgrade, or uninstall preservation test has run.
11. No PostgreSQL integration/concurrency/restore test has run.
12. No LAN firewall/TLS/network deployment test has run.
13. No formal dependency vulnerability scan or threat-model review has run for the future .NET stack.
14. Browser CSS currently favors installed system fonts; a production Bengali font embedding and rendering policy is pending.
15. The current GitHub workflow validates the available Node slice only; it is not a Windows product build workflow.

These limitations are release blockers where marked in `docs/PROJECT_STATUS.md`; they are not hidden behind UI labels.
