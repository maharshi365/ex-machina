import { defineConfig } from "oxlint";
import base from "./packages/configs/oxlint.base.json" with { type: "json" };

export default defineConfig({
  extends: [base],
  // Uncomment to override locally:
  // rules: {
  //   "no-console": "warn",
  // },
});
