import { randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/l/I) — temp passwords are read aloud/typed.
const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Crypto-random temporary password (16 chars ≈ 92 bits). Never log it. */
export function generateTempPassword(length = 16): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}
