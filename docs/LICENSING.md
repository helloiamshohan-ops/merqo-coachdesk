# Offline licensing and recovery

## Locked commercial model

- One purchased license authorizes a branch.
- Authorized LAN clients in that same branch are covered by the branch license; no per-PC commercial activation is required.
- The license is designed for lifetime offline use subject to agreed version terms.
- No mandatory cloud login, online activation, recurring online check, telemetry, or remote API is part of core operation.
- Invalid/missing/damaged license state must never delete, lock, corrupt, or make business data inaccessible.

## Signed format in the development slice

`src/licensing/license.js` uses Ed25519 with canonical JSON. The signed payload includes:

- `licenseId`
- `productId`
- `institution`
- `branchId`
- `issueDate`
- `licenseType`
- `versionPolicy`
- optional capabilities

The customer-side verifier receives a public key and validates the product and branch. The private key is an argument to the separate `tools/license-generator.mjs` boundary only. No real key or license file is committed.

## Private generator boundary

The current tool exposes a help/self-check entry point and imports the signing primitive outside the customer service. Before commercial use MERQO must decide and document:

- secure private-key storage (prefer OS-backed/HSM-controlled storage where available),
- authorized issuer roles and approval record,
- issuance/replacement/revocation record policy,
- backup and recovery of the private key,
- separation between development and production keys,
- secure transfer channel for Recovery Request/Response files.

A production private key must not be placed in this repository, installer, customer application, or public release artifact.

## Offline recovery protocol

1. Customer application identifies the issue without blocking data access.
2. It creates a Recovery Request containing request ID, branch identity, installation context, and reason; it contains no password or private key.
3. Customer transfers the file to authorized MERQO support through an approved channel.
4. The private generator validates the request and approval.
5. Generator issues a signed Recovery Response bound to the request ID and branch.
6. Customer imports the response locally.
7. Application validates signature, product, branch, request ID, and format version.
8. Application records recovery activity and updates only license metadata.

The current module tests valid signatures, modified payloads, wrong branch, corrupt signature, and wrong request ID. File import/export UI and durable recovery records are pending.

## Version policy

`versionPolicy` is signed rather than inferred from a machine clock. Major-version licensing and support terms remain a product-owner decision. Do not implement expiry using the machine clock as the only protection for lifetime licensing.

## Release gates

Before a release candidate: run malformed/modified/wrong-key/replay tests; verify recovery after reinstall; verify same-branch multi-client behavior in a real LAN; inspect that the installer contains no private key; and document the public-key fingerprint.
