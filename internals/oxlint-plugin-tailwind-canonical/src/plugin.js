/**
 * oxlint/ESLint JS plugin entry.
 *
 * The plugin uses oxlint's alternative (`createOnce`) API for performance
 * and is wrapped in `eslintCompatPlugin`, which adds an ESLint-compatible
 * `create` delegating to `createOnce` — so the same plugin runs in both
 * oxlint (fast path) and ESLint. `@oxlint/plugins` is a runtime dependency
 * (not dev) for exactly this reason.
 *
 * Usage in `oxlint.config.ts`:
 *
 * ```ts
 * export default defineConfig({
 *   jsPlugins: ["./internals/oxlint-plugin-tailwind-canonical/src/plugin.js"],
 *   rules: {
 *     "tailwind-canonical/canonical-class-names": ["warn", {
 *       cssPath: "./apps/web/src/styles.css",
 *     }],
 *   },
 * });
 * ```
 */
import { eslintCompatPlugin } from "@oxlint/plugins";
import { canonicalClassNames, PLUGIN_NAME, RULE_ID } from "./rule.js";

const plugin = eslintCompatPlugin({
  meta: { name: PLUGIN_NAME },
  rules: { [RULE_ID]: canonicalClassNames },
});

export default plugin;
