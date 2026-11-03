import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: root });
export default [
  { ignores: ['**/.next*/**', '**/node_modules/**', 'graphify-out/**'] },
  ...compat.extends('next/core-web-vitals'),
  { settings: { next: { rootDir: root } } },
];
