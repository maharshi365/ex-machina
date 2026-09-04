import { defineConfig, type OxlintConfig } from "oxlint";
import baseJson from "./packages/configs/oxlint.base.json" with { type: "json" };

// JSON imports widen literals to `string`, so assert the shape explicitly.
const base = baseJson as OxlintConfig;

export default defineConfig({
  extends: [base],
  rules: {
    // MongoDB's canonical primary-key field — not a style choice, allow it.
    "no-underscore-dangle": ["warn", { allow: ["_id"] }],
  },
});
