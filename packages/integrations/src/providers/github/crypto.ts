import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PKCE_AAD = Buffer.from("ex-machina:github-pkce:v1", "utf8");
const PKCE_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

function encryptionKey(applicationSecret: string): Buffer {
  if (Buffer.byteLength(applicationSecret, "utf8") < 32) {
    throw new Error("Application secret must be at least 32 bytes");
  }
  return createHash("sha256")
    .update("ex-machina:github-pkce-key:v1\0", "utf8")
    .update(applicationSecret, "utf8")
    .digest();
}

export function generateRandomState(): string {
  return randomBytes(32).toString("base64url");
}

export function hashState(state: string): string {
  if (!state) throw new Error("State is required");
  return createHash("sha256").update(state, "utf8").digest("base64url");
}

export type PkcePair = { verifier: string; challenge: string };

export function generatePkcePair(): PkcePair {
  const verifier = randomBytes(64).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier, "ascii").digest("base64url"),
  };
}

export function encryptPkceVerifier(verifier: string, applicationSecret: string): string {
  if (!PKCE_PATTERN.test(verifier)) throw new Error("Invalid PKCE verifier");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(applicationSecret), iv);
  cipher.setAAD(PKCE_AAD);
  const ciphertext = Buffer.concat([cipher.update(verifier, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function decryptPkceVerifier(value: string, applicationSecret: string): string {
  try {
    const [version, ivValue, ciphertextValue, tagValue, extra] = value.split(".");
    if (version !== "v1" || !ivValue || !ciphertextValue || !tagValue || extra !== undefined) {
      throw new Error("invalid envelope");
    }
    const iv = Buffer.from(ivValue, "base64url");
    const tag = Buffer.from(tagValue, "base64url");
    if (iv.length !== 12 || tag.length !== 16) throw new Error("invalid envelope");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(applicationSecret), iv);
    decipher.setAAD(PKCE_AAD);
    decipher.setAuthTag(tag);
    const verifier = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    if (!PKCE_PATTERN.test(verifier)) throw new Error("invalid plaintext");
    return verifier;
  } catch {
    throw new Error("Unable to decrypt PKCE verifier");
  }
}
