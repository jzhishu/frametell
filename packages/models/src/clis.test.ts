import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLI_DEFS, cliModelInfo, cliModels, cliSearchDirs, findCli } from './clis.js';

test('every CLI definition is well-formed and ids are unique', () => {
  assert.equal(new Set(CLI_DEFS.map((d) => d.id)).size, CLI_DEFS.length);
  for (const d of CLI_DEFS) {
    assert.ok(d.command && d.versionArgs.length);
    assert.ok(d.models.includes('default'));
    assert.ok(/^https?:\/\//.test(d.site));
  }
});

test('findCli searches PATH first, then the toolchain dirs; only executable files count', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frametell-cli-'));
  const extra = fs.mkdtempSync(path.join(os.tmpdir(), 'frametell-cli-extra-'));
  try {
    fs.writeFileSync(path.join(dir, 'madeup-cli'), '#!/bin/sh\n', { mode: 0o755 });
    fs.writeFileSync(path.join(extra, 'other-cli'), '#!/bin/sh\n', { mode: 0o755 });
    fs.writeFileSync(path.join(extra, 'not-exec'), '#!/bin/sh\n', { mode: 0o644 });
    assert.equal(findCli('madeup-cli', dir, []), path.join(dir, 'madeup-cli'));
    assert.equal(findCli('other-cli', '', [extra]), path.join(extra, 'other-cli'));
    assert.equal(findCli('not-exec', '', [extra]), undefined);
    assert.equal(findCli('madeup-cli', '', []), undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(extra, { recursive: true, force: true }); }
});

test('the search dirs cover the install locations a packaged app does not inherit', () => {
  const dirs = cliSearchDirs('/home/u');
  assert.ok(dirs.includes('/home/u/.local/bin'));
  assert.ok(dirs.includes('/opt/homebrew/bin'));
  assert.ok(dirs.some((d) => d.includes('pnpm')));
});

test('CLI model rows: default first, typed-in ids marked added', () => {
  const def = CLI_DEFS[0];
  const rows = cliModels([{ def, bin: '/bin/x', auth: 'ok' }], { [def.id]: ['my-model'] });
  assert.equal(rows[0].provider, def.id);
  assert.equal(rows[0].id, def.models[0]);
  const mine = rows.find((r) => r.id === 'my-model');
  assert.ok(mine?.added);
  assert.equal(cliModelInfo(def).vision, def.vision);
});
