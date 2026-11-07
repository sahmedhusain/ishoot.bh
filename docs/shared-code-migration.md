# Codebase Isolation & Shared Code Migration

## Architecture Isolation Principles
1. **Frontend Isolation**:
   - Each Next.js application (`apps/web`, `apps/admin`, `apps/it`) is completely self-contained.
   - Frontends must **never** import source code or libraries directly from another frontend (e.g. `import ... from "../../apps/admin/..."` is strictly prohibited).
   - Frontends must **never** import Go backend source files or internal backend packages (`cmd/` or `backend/`).

2. **Per-App API Contracts**:
   - Instead of a single shared directory, each frontend maintains its own independent copy of the TypeScript API contracts under `apps/<app>/contracts/api.ts`.
   - The contracts are generated deterministically from the unified OpenAPI specification (`docs/api/combined-openapi.yaml`) using the contract generator script:
   ```bash
   npm run gen:contracts
   ```
   - All three copies are verified to be identical using `diff -qr` in isolation checks and CI.

3. **Automated Enforcement**:
   - Run the isolation scan:
   ```bash
   npm run check:isolation
   ```
   - Checks performed by `scripts/check-isolation.ts`:
     - Verifies contract directories exist and are identical copies.
     - Confirms all test files reside strictly in their respective app folder.
     - Scans for illegal cross-app or backend imports using git-tracked files.
