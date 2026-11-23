// public/ is for static assets only. A Gatsby build output (index.html, *.js
// bundles) left there would be served by Workers static assets ahead of the
// Astro routes and silently replace the CMS-driven page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';

const publicDir = new URL('../public/', import.meta.url);

test('public/index.html does not exist', () => {
  assert.equal(existsSync(new URL('index.html', publicDir)), false);
});

test('no JavaScript files at the top level of public/', () => {
  const files = existsSync(publicDir) ? readdirSync(publicDir) : [];
  assert.deepEqual(files.filter(name => /\.(m|c)?js$/i.test(name)), []);
});
