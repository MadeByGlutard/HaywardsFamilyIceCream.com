import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, passwordProblem, verifyPassword } from '../src/auth/password/hash.ts';
import { password } from '../src/auth/password/index.mjs';

test('a password verifies only against its own hash', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', hash), true);
  assert.equal(await verifyPassword('correct horse batterz', hash), false);
  assert.notEqual(hash, await hashPassword('correct horse battery'));
  assert.ok(!hash.includes('correct'));
});

test('a missing or malformed hash never verifies', async () => {
  for (const stored of [null, undefined, '', 'plain', 'md5$1$2$3$4$5']) assert.equal(await verifyPassword('anything at all', stored), false);
});

test('password length rules', () => {
  assert.ok(passwordProblem('short'));
  assert.ok(passwordProblem('x'.repeat(129)));
  assert.ok(passwordProblem(undefined));
  assert.equal(passwordProblem('x'.repeat(12)), null);
});

test('changing passwords and making reset links are not public routes', () => {
  const { publicRoutes } = password();
  for (const route of ['change', 'reset-link']) assert.ok(!publicRoutes.some((path) => path.endsWith(`/${route}`)));
  assert.ok(!publicRoutes.some((path) => path.endsWith('/')));
});
