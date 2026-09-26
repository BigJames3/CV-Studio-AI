#!/usr/bin/env node
/**
 * Workspace packages export their TypeScript sources (consumed as-is by Next.js and ts-jest).
 * Plain Node needs the compiled JS, so before running the built API (`node dist/main.js`)
 * point these packages at `dist/`. Same rewrite as apps/api/Dockerfile.
 *
 * Run after `pnpm build`. It edits package.json files in place: use it in CI or Docker only.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packages = ['packages/shared-types', 'packages/shared-utils', 'packages/ai-service'];

for (const dir of packages) {
  const file = path.join(root, dir, 'package.json');
  if (!fs.existsSync(file)) continue;
  if (!fs.existsSync(path.join(root, dir, 'dist', 'index.js'))) {
    console.error(`${dir}/dist/index.js is missing: run pnpm build first`);
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  pkg.main = './dist/index.js';
  pkg.types = './dist/index.d.ts';
  pkg.exports = {
    '.': { types: './dist/index.d.ts', require: './dist/index.js', default: './dist/index.js' },
  };
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${dir} -> dist/index.js`);
}
