import { defineConfig } from "oxfmt";
import base from "./packages/configs/oxfmt.base.json" with { type: "json" };

export default defineConfig({
  ...base,
  // Uncomment to override locally:
  // printWidth: 80,
});
