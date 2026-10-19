# Licensing boundary

`license.js` implements the signed document format used by the development slice. It uses Ed25519 and canonical JSON. The customer side only needs the public key; the private key is an input to the separately located `tools/license-generator.mjs` boundary and is never stored here.

No real MERQO key, customer license, recovery response, or bypass secret belongs in this repository. Production key custody, issuance approvals, branch identity policy, and recovery handling must be completed before a commercial release.
