# ex-machina

Bun monorepo with `packages/*` and `apps/*` workspaces, powered by [oxlint](https://oxc.rs/docs/guide/usage/linter) + [oxfmt](https://oxc.rs/docs/guide/usage/formatter).

All shared configs live in `packages/configs` and the root extends from that package.

## Structure

```
.
├── apps/                 # applications (e.g. web, api, cli)
├── packages/
│   ├── configs/          # shared configs (oxlint, oxfmt, tsconfig)
│   │   ├── oxlint.base.json
│   │   ├── oxfmt.base.json
│   │   ├── tsconfig.base.json
│   │   └── package.json  # @ex-machina/configs
│   └── ...               # other shared libraries
├── oxlint.config.ts      # extends from @ex-machina/configs
├── oxfmt.config.ts       # extends via spread from @ex-machina/configs
├── tsconfig.json         # extends ./packages/configs/tsconfig.base.json
└── package.json          # bun workspaces: ["packages/*", "apps/*"]
```

## Getting Started

```sh
bun install          # install deps (links workspaces)
bun run check        # lint + format check
bun run check:fix    # lint --fix + format
```

## Workspaces

- **Bun workspaces**: `package.json:7` → `["packages/*", "apps/*"]`
- Create a new package: `mkdir -p packages/my-lib && bun init --cwd packages/my-lib`
- Create a new app: `mkdir -p apps/my-app && bun init --cwd apps/my-app`

Use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@ex-machina/configs": "workspace:*",
    "@ex-machina/my-lib": "workspace:*"
  }
}
```

### Using shared configs in a new package/app

**TypeScript:**

```jsonc
// packages/my-lib/tsconfig.json
{
  "extends": "@ex-machina/configs/tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"],
}
```

Or via relative path: `"extends": "../../packages/configs/tsconfig.base.json"`

**Oxlint (JSON – file path):**

```jsonc
// packages/my-lib/.oxlintrc.json
{
  "extends": ["../../packages/configs/oxlint.base.json"],
}
```

**Oxlint (TS – package import, recommended):**

```ts
// packages/my-lib/oxlint.config.ts
import { defineConfig } from "oxlint";
import base from "@ex-machina/configs/oxlint" with { type: "json" };
export default defineConfig({ extends: [base] });
```

**Oxfmt (TS – spread, recommended; oxfmt has no `extends`):**

```ts
// packages/my-lib/oxfmt.config.ts
import { defineConfig } from "oxfmt";
import base from "@ex-machina/configs/oxfmt" with { type: "json" };
export default defineConfig({ ...base });
```

## Code Quality

| Command                | Description                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `bun run lint`         | Run oxlint (via `packages/configs/oxlint.base.json`) – handles parallelism itself       |
| `bun run lint:fix`     | Run oxlint with --fix                                                                   |
| `bun run format`       | Format with oxfmt (via `packages/configs/oxfmt.base.json`) – handles parallelism itself |
| `bun run format:check` | Check formatting                                                                        |
| `bun run check`        | lint + format check                                                                     |
| `bun run check:fix`    | lint fix + format                                                                       |

Lint/format run directly via oxlint/oxfmt (they parallelize internally – no Turbo needed).

Configs:

- `packages/configs/oxlint.base.json` – base linter rules (extended by root `oxlint.config.ts`)
- `packages/configs/oxfmt.base.json` – base formatter options (extended by root `oxfmt.config.ts`)
- `packages/configs/tsconfig.base.json` – base TS options (extended by root `tsconfig.json`)

## Turborepo – Typecheck & Test

Only `typecheck` and `test` are orchestrated by [Turborepo](https://turbo.build) (`turbo.json`).

```sh
bun run typecheck   # turbo run typecheck – tsc --noEmit in each workspace
bun run test        # turbo run test – bun test --pass-with-no-tests in each workspace
turbo run typecheck # direct
turbo run test      # direct
```

Each workspace (`packages/*`, `apps/*`) must have:

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test --pass-with-no-tests",
  },
}
```

- `typecheck` uses the shared `tsconfig.base.json` (`extends: "../configs/tsconfig.base.json"` or `../../packages/configs/tsconfig.base.json`).
- `test` uses `bun test --pass-with-no-tests` so packages with no `*.test.ts` files still pass (exit 0). Example:

```
packages/utils – no *.test.ts → "No tests found!" → exit 0 (pass)
apps/web       – no *.test.ts → pass
```

`turbo.json` is minimal:

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "typecheck": { "outputs": [] },
    "test": { "outputs": [], "cache": false }
  }
}

## Requirements

- Bun >=1.0.0 (`bun --version`)
- Node >=22.18 (for `oxlint.config.ts` / `oxfmt.config.ts` with `with { type: "json" }` import)
```
