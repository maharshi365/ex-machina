import { defineConfig, type OxfmtConfig } from "oxfmt";
import baseJson from "./packages/configs/oxfmt.base.json" with { type: "json" };

// JSON imports widen literals to `string`, so assert the shape explicitly.
const base: OxfmtConfig = baseJson as OxfmtConfig;

export default defineConfig({
  ...base,
  // Uncomment to override locally:
  // printWidth: 80,
});
