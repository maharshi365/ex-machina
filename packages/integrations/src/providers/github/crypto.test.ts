import { describe, expect, test } from "bun:test";
import {
  decryptPkceVerifier,
  encryptPkceVerifier,
  generatePkcePair,
  generateRandomState,
  hashState,
} from "./crypto.js";

describe("GitHub setup crypto", () => {
  test("creates random states and deterministic non-reversible hashes", () => {
    const first = generateRandomState();
    const second = generateRandomState();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(43);
    expect(hashState(first)).toBe(hashState(first));
    expect(hashState(first)).not.toContain(first);
  });

  test("creates an S256 PKCE pair", () => {
    const pair = generatePkcePair();
    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(pair.challenge).toBe(hashState(pair.verifier));
  });

  test("encrypts the verifier with authenticated encryption", () => {
    const secret = "a sufficiently long application secret";
    const verifier = generatePkcePair().verifier;
    const encrypted = encryptPkceVerifier(verifier, secret);
    expect(encrypted).not.toContain(verifier);
    expect(decryptPkceVerifier(encrypted, secret)).toBe(verifier);
    expect(() => decryptPkceVerifier(encrypted, `${secret}!`)).toThrow(
      "Unable to decrypt PKCE verifier"
    );
  });
});
