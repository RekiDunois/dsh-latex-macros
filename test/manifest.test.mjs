import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async name => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));

test('manifest keeps plugin metadata but declares no DSH version requirement', async()=>{
 const pkg = await read('package.json');
 assert.equal(pkg.engines.dsh, undefined);
 assert.equal(pkg.engines.node, '>=22.19.0');
 assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
 assert.equal(pkg.dsh.client.platform, 'web');
 assert.deepEqual(pkg.dsh.client.inject, []);
 assert.equal(pkg.exports['./client'], './lib/client.js');
});

test('lockfile root entry mirrors the unlocked engines', async()=>{
 const lock = await read('package-lock.json');
 assert.equal(lock.packages[''].engines.dsh, undefined);
 assert.equal(lock.packages[''].engines.node, '>=22.19.0');
});

test('built entries are committed beside src so a git install can load them', async()=>{
 const pkg = await read('package.json');
 // A `dsh plugin add github:...` install receives the repository, not a packed
 // tarball, and pnpm blocks install-time build scripts by default. `main` must
 // therefore point at a file that exists in the repository itself.
 for (const entry of [pkg.main, pkg.exports['./client'], pkg.dsh.bundle.patch]) {
  const text = await readFile(new URL(`../${entry}`, import.meta.url), 'utf8');
  assert.notEqual(text.trim(), '', `${entry} must ship non-empty`);
 }
});
