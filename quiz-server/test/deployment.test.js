import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const blueprintPath = fileURLToPath(new URL('../../render.yaml', import.meta.url));

test('Render blueprint deploys the quiz server from main on the free Frankfurt service', () => {
  assert.equal(existsSync(blueprintPath), true, 'render.yaml should exist at the repository root');

  const blueprint = parse(readFileSync(blueprintPath, 'utf8'));
  assert.deepEqual(blueprint, {
    services: [{
      type: 'web',
      runtime: 'node',
      name: 'dtb-c1-quiz',
      plan: 'free',
      region: 'frankfurt',
      branch: 'main',
      rootDir: 'quiz-server',
      buildCommand: 'npm ci --omit=dev',
      startCommand: 'npm start',
      healthCheckPath: '/',
      autoDeployTrigger: 'commit'
    }]
  });
});
