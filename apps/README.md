# apps

Application workspaces for the monorepo.

Each app should be in its own directory:

```
apps/
  web/
    package.json # { "name": "@ex-machina/web" }
    src/
      index.ts
```

Create a new app:

```sh
mkdir -p apps/web/src
bun init --cwd apps/web
```
