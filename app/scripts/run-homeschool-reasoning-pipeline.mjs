import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { build } from 'rolldown';

const appRoot = process.cwd();
const entryPoint = path.join(appRoot, 'scripts', 'homeschoolReasoningPipelineRunner.ts');
const tempDir = path.join(appRoot, 'node_modules', '.tmp');
const outfile = path.join(tempDir, `iternest-homeschool-reasoning-pipeline-${Date.now()}.mjs`);

await mkdir(tempDir, { recursive: true });

const bundle = await build({
  input: entryPoint,
  platform: 'node',
  write: false,
  output: {
    format: 'esm',
  },
});
const outputChunk = bundle.output.find((output) => output.type === 'chunk');

if (!outputChunk) {
  throw new Error('Homeschool reasoning pipeline bundle did not produce an executable chunk.');
}

await writeFile(outfile, outputChunk.code, 'utf8');

const result = spawnSync(process.execPath, [outfile, ...process.argv.slice(2)], {
  cwd: appRoot,
  stdio: 'inherit',
});

await rm(outfile, { force: true });

process.exit(result.status ?? 1);
