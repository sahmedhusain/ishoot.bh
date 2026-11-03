import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: root, resolvePluginsRelativeTo: path.dirname(require.resolve('eslint-config-next/package.json')) });
export default [
  { ignores: ['**/.next*/**', '**/node_modules/**', 'apps/admin/prisma/generated/**', 'graphify-out/**', 'ishoot/**', '.agents/**'] },
  ...compat.extends('next/core-web-vitals'),
  { settings: { next: { rootDir: [path.join(root, 'apps/admin'), path.join(root, 'apps/web'), path.join(root, 'apps/it')] } } },
];
