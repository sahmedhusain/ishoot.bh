import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: root });
export default [
  { ignores: ['**/.next*/**', '**/node_modules/**', 'packages/database/prisma/generated/**', 'graphify-out/**', 'ishoot/**', '.agents/**'] },
  ...compat.extends('next/core-web-vitals'),
  { settings: { next: { rootDir: [path.join(root, 'apps/admin'), path.join(root, 'apps/web')] } } },
];
