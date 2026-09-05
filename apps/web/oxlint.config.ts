import { fileURLToPath } from 'node:url';
import { defineConfig, type OxlintConfig } from 'oxlint';
import baseJson from '../../packages/configs/oxlint.base.json' with { type: 'json' };

// JSON imports widen literals to `string`, so assert the shape explicitly.
const base = baseJson as OxlintConfig;

// Absolute stylesheet path: immune to whichever cwd oxlint is invoked from.
const stylesheet = fileURLToPath(new URL('./src/styles.css', import.meta.url));

export default defineConfig({
  extends: [base],
  // Resolved relative to this config file.
  jsPlugins: ['../../internals/oxlint-plugin-tailwind-canonical/src/plugin.js'],
  rules: {
    // MongoDB's canonical primary-key field — mirrors the root config so
    // files under apps/web keep the same behavior when this nested config
    // takes precedence.
    'no-underscore-dangle': ['warn', { allow: ['_id'] }],
    'tailwind-canonical/canonical-class-names': ['warn', { cssPath: stylesheet, rootFontSize: 16 }],
  },
});
