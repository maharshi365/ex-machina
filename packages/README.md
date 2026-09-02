# packages

Shared libraries and packages for the monorepo.

Each package should be in its own directory:

```
packages/
  my-package/
    package.json # { "name": "@ex-machina/my-package" }
    src/
      index.ts
    tsconfig.json
```

Create a new package:

```sh
mkdir -p packages/my-package/src
bun init --cwd packages/my-package
```
