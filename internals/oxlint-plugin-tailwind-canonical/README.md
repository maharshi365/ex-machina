# `@ex-machina/oxlint-plugin-tailwind-canonical`

Oxlint JS plugin that enforces **canonical Tailwind CSS class spellings** with
`--fix` support. It surfaces the same suggestions as the Tailwind language
server's `suggestCanonicalClasses` diagnostic (the _"The class `X` can be
written as `Y`"_ quick-fixes in your editor), but applied repo-wide via
`bun run lint:fix` instead of one click at a time.

| Non-canonical              | Canonical        |
| -------------------------- | ---------------- |
| `mt-[16px]`                | `mt-4`           |
| `[color:red]/50`           | `text-[red]/50`  |
| `[@media_print]:flex`      | `print:flex`     |

## How it works (and why it doesn't spawn the LSP)

Oxlint rules are **synchronous** (`create(context)` + sync `fix(fixer)`), so a
rule cannot speak the language server's async LSP/stdio protocol. That is fine,
because the LSP is a thin wrapper here: its `suggestCanonicalClasses`
diagnostic calls `designSystem.canonicalizeCandidates()` from the Tailwind v4
compiler — the same function the `tailwindcss canonicalize` CLI uses.

This plugin calls that exact API:

1. The entry CSS (e.g. `apps/web/src/styles.css`) is loaded once per process
   with `@tailwindcss/node`'s `__unstable__loadDesignSystem`. The load is
   async, so it runs inside a `synckit` worker (`src/worker.js`); every
   per-file call afterwards is a synchronous `canonicalizeCandidates()` call.
2. The rule (`tailwind-canonical/canonical-class-names`) visits JSX
   `class`/`className` attributes and string arguments of class helpers
   (`cn`, `clsx`, `cva`, …), canonicalizes each candidate 1:1, and reports +
   fixes spelling differences.

Deliberately **out of scope** — owned by the formatter (oxfmt
`sortTailwindcss`): class ordering, whitespace normalization, de-duplication,
and multi-utility collapsing (`mt-2 mr-2 mb-2 ml-2` → `m-2`). The fixer only
rewrites the spelling of individual candidates and preserves separators
byte-for-byte.

## Configuration

In `oxlint.config.ts`:

```ts
export default defineConfig({
  jsPlugins: ["./internals/oxlint-plugin-tailwind-canonical/src/plugin.js"],
  rules: {
    "tailwind-canonical/canonical-class-names": [
      "warn",
      { cssPath: "./apps/web/src/styles.css", rootFontSize: 16 },
    ],
  },
});
```

Options (all optional):

- `cssPath` — Tailwind v4 entry CSS. Absolute, or relative to the working
  directory. Defaults to `apps/web/src/styles.css`.
- `rootFontSize` — root font size in px for `rem` ↔ `px` normalization
  (`mt-[16px]` → `mt-4`). Default `16`.
- `attributes` — JSX attribute names treated as class lists. Default
  `["class", "className"]`.
- `calleeFunctions` — helper names whose string arguments are treated as
  class lists. Default
  `["cn", "clsx", "cva", "twMerge", "tw", "classNames", "cx"]`.

Notes:

- Template literals containing `${}` interpolations are skipped (a replacement
  could shift expression boundaries); plain strings and static templates are
  fixed.
- Requires Tailwind CSS v4 (`canonicalizeCandidates` does not exist in v3).
