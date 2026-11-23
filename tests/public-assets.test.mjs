import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const publicDir = new URL('../public/', import.meta.url);

test('public/ holds no leftover static-site build output', async () => {
	const names = await readdir(publicDir);
	assert.ok(!names.includes('index.html'), 'public/index.html would shadow the server-rendered home page');
	const scripts = names.filter((name) => name.endsWith('.js'));
	assert.deepEqual(scripts, [], `unexpected scripts in public/: ${scripts.join(', ')}`);
	const gatsby = names.filter((name) => /\.LICENSE\.txt$|^(chunk-map|webpack\.stats)\.json$|^_redirects$|^page-data$/.test(name));
	assert.deepEqual(gatsby, [], `Gatsby leftovers in public/: ${gatsby.join(', ')}`);
});

test('web manifest icons exist', async () => {
	const manifest = JSON.parse(await readFile(new URL('site.webmanifest', publicDir), 'utf8'));
	for (const icon of manifest.icons) await readFile(new URL(`.${icon.src}`, publicDir));
});
