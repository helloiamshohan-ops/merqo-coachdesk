#!/usr/bin/env node
/**
 * MERQO private License Generator boundary.
 *
 * This tool is deliberately not imported by the customer service. Keep the
 * private key outside the repository and invoke this tool from a protected
 * MERQO workstation. The current tool documents the boundary and can inspect
 * the supported format; production key custody still requires an approved
 * operational procedure.
 */
import { generateKeyPairSync } from 'node:crypto';
import { issueLicense, verifyLicense } from '../src/licensing/license.js';

function help() {
  console.log(`MERQO CoachDesk private license tool\n\nUsage:\n  node tools/license-generator.mjs --help\n\nThe tool source provides issueLicense() and verifyLicense() primitives. Do not\nplace a private key in this repository or in customer application artifacts.\nKey provisioning, secure storage, issuance records, and recovery approvals\nremain an operational step documented in docs/LICENSING.md.`);
}

if (process.argv.includes('--help') || process.argv.length === 2) help();

// Keep a small executable self-check without creating a key file or license file.
if (process.argv.includes('--self-check')) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const { issueLicense } = await import('../src/licensing/license.js');
  const license = issueLicense({ institution: 'পরীক্ষা প্রতিষ্ঠান', branchId: 'branch-test' }, privateKey);
  console.log(JSON.stringify(verifyLicense(license, publicKey, { branchId: 'branch-test' }), null, 2));
}
