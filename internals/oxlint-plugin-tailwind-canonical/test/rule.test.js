/**
 * Integration tests: rule + sync design-system bridge against a real
 * Tailwind v4 stylesheet. These boot the Tailwind compiler in a synckit
 * worker once, so they get a generous timeout.
 */
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalClassNames } from "../src/rule.js";
import {
  canonicalizeTokens,
  ensureDesignSystem,
  resolveCssPath,
} from "../src/design-system.js";
import { uniqueTokens } from "../src/candidates.js";

const FIXTURE_CSS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "stylesheet.css",
);

function canonicalizeList(value, rem = 16) {
  const key = ensureDesignSystem(FIXTURE_CSS);
  const tokens = uniqueTokens(value);
  return canonicalizeTokens(key, tokens, rem);
}

describe(
  "design-system bridge",
  () => {
    test("resolves the default stylesheet relative to cwd", () => {
      expect(resolveCssPath(undefined, "/repo")).toBe(
        path.join("/repo", "apps/web/src/styles.css"),
      );
      expect(resolveCssPath("./a/b.css", "/repo")).toBe(path.join("/repo", "a/b.css"));
      expect(resolveCssPath("/abs/a.css", "/repo")).toBe("/abs/a.css");
    });

    test("canonicalizes against the real Tailwind compiler", () => {
      const map = canonicalizeList("mt-[16px] [color:red]/50 [@media_print]:flex flex p-4");
      // Same suggestions the language server / `tailwindcss canonicalize` give.
      expect(map.get("mt-[16px]")).toBe("mt-4");
      expect(map.get("[color:red]/50")).toBe("text-[red]/50");
      expect(map.get("[@media_print]:flex")).toBe("print:flex");
      // Already-canonical classes are untouched.
      expect(map.get("flex")).toBe("flex");
      expect(map.get("p-4")).toBe("p-4");
    });

    test("unknown classes pass through unchanged", () => {
      const map = canonicalizeList("my-custom-class not-a-class:flex");
      expect(map.get("my-custom-class")).toBe("my-custom-class");
      expect(map.get("not-a-class:flex")).toBe("not-a-class:flex");
    });
  },
  { timeout: 60_000 },
);

/** Minimal stub of the ESLint/oxlint rule context. */
function runRule(jsxValueNode, expressionNode, options) {
  const reports = [];
  // `createOnce` must not touch `context.*` in its body; per-file setup
  // happens in `before()`, which the harness calls explicitly like oxlint.
  const visitor = canonicalClassNames.createOnce({
    options: [options],
    sourceCode: {
      text: "class className cn",
      getText: (node) =>
        node === jsxValueNode || node === expressionNode ? `"${node.rawText}"` : "unknown",
    },
    report: (r) => reports.push(r),
  });
  if (visitor.before() === false) return reports;

  if (jsxValueNode) {
    visitor.JSXAttribute({
      type: "JSXAttribute",
      name: { type: "JSXIdentifier", name: "className" },
      value: jsxValueNode,
    });
  }
  if (expressionNode) {
    visitor.CallExpression({
      type: "CallExpression",
      callee: { type: "Identifier", name: "cn" },
      arguments: [expressionNode],
    });
  }
  return reports;
}

const ruleOpts = { cssPath: FIXTURE_CSS, rootFontSize: 16 };

describe(
  "canonical-class-names rule",
  () => {
    test("reports and fixes a non-canonical JSX string literal", () => {
      const literal = {
        type: "Literal",
        value: "mt-[16px] flex",
        rawText: "mt-[16px] flex",
        range: [0, 18],
      };
      const reports = runRule(literal, null, ruleOpts);
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe("nonCanonical");

      const fix = reports[0].fix({
        replaceText: (node, text) => ({ range: node.range, text }),
      });
      expect(fix).toEqual({ range: [0, 18], text: '"mt-4 flex"' });
    });

    test("silent when classes are already canonical", () => {
      const literal = {
        type: "Literal",
        value: "flex p-4",
        rawText: "flex p-4",
        range: [0, 10],
      };
      expect(runRule(literal, null, ruleOpts)).toHaveLength(0);
    });

    test("checks cn()/clsx() string arguments", () => {
      const literal = {
        type: "Literal",
        value: "[@media_print]:flex",
        rawText: "[@media_print]:flex",
        range: [0, 22],
      };
      const reports = runRule(null, literal, ruleOpts);
      expect(reports).toHaveLength(1);
      const fix = reports[0].fix({
        replaceText: (node, text) => ({ range: node.range, text }),
      });
      expect(fix.text).toBe('"print:flex"');
    });

    test("reports cssNotFound for a missing stylesheet", () => {
      const literal = {
        type: "Literal",
        value: "mt-[16px]",
        rawText: "mt-[16px]",
        range: [0, 12],
      };
      const reports = runRule(literal, null, { cssPath: "/does/not/exist.css" });
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe("cssNotFound");
      expect(reports[0].fix).toBeUndefined();
    });

    test("before() skips files that cannot contain a class list", () => {
      const reports = [];
      const visitor = canonicalClassNames.createOnce({
        options: [{ cssPath: FIXTURE_CSS }],
        sourceCode: {
          text: "export const answer = 42;\n",
          getText: () => "",
        },
        report: (r) => reports.push(r),
      });
      expect(visitor.before()).toBe(false);
      expect(reports).toHaveLength(0);
    });
  },
  { timeout: 60_000 },
);

describe("plugin entry", () => {
  test("eslintCompatPlugin exposes an ESLint-compatible create", async () => {
    const { default: plugin } = await import("../src/plugin.js");
    expect(plugin.meta.name).toBe("tailwind-canonical");
    const rule = plugin.rules["canonical-class-names"];
    // Added by `eslintCompatPlugin` (delegates to `createOnce`); this is
    // what makes the rule loadable in plain ESLint as well as oxlint.
    expect(typeof rule.createOnce).toBe("function");
    expect(typeof rule.create).toBe("function");
  });
});
