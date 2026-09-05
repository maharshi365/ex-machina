# @ex-machina/configs

Shared configuration package for the monorepo.

## Exports

- `tsconfig.base.json` – base TypeScript config (`@ex-machina/configs/tsconfig`)
- `oxlint.base.json` – base Oxlint config (`@ex-machina/configs/oxlint`)
- `oxfmt.base.json` – base Oxfmt config (`@ex-machina/configs/oxfmt`)

## Usage

### TypeScript

```jsonc
// tsconfig.json
{
  "extends": "@ex-machina/configs/tsconfig.base.json",
  // or relative:
  // "extends": "./packages/configs/tsconfig.base.json"
}
```

### Oxlint (TypeScript config – recommended)

`oxlint` JSON `extends` only resolves file paths, not package names. Use `oxlint.config.ts`:

```ts
// oxlint.config.ts
import { defineConfig } from 'oxlint';
import base from './packages/configs/oxlint.base.json' with { type: 'json' };
// or from workspace package after install:
// import base from "@ex-machina/configs/oxlint" with { type: "json" };

export default defineConfig({
  extends: [base],
});
```

JSON alternative (file-path extends):

```jsonc
// .oxlintrc.json
{
  "extends": ["./packages/configs/oxlint.base.json"],
}
```

### Oxfmt (TypeScript config – recommended)

`oxfmt` has no `extends` key. Use `oxfmt.config.ts` with spread:

```ts
// oxfmt.config.ts
import { defineConfig } from 'oxfmt';
import base from './packages/configs/oxfmt.base.json' with { type: 'json' };

export default defineConfig({
  ...base,
});
```
