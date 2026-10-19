#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const ignored = new Set(['node_modules', 'var', '.git']);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extname(path) === '.js' || extname(path) === '.mjs') files.push(path);
  }
}
await walk(root);
const failures = [];
for (const file of files) {
  const result = await new Promise((resolveResult) => {
    const child = spawn(process.execPath, ['--check', file], { stdio: 'pipe' });
    let stderr = '';
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('close', (code) => resolveResult({ code, stderr }));
  });
  if (result.code !== 0) failures.push(`${file}\n${result.stderr}`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`JavaScript syntax check passed for ${files.length} files.`);
