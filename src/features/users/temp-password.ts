import { randomInt } from "node:crypto";

// No 0/O, 1/l/I: the password is read aloud or copied by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** ~91 bits of entropy; replaced by the user at first login. */
export function generateTemporaryPassword(length = 16): string {
  return Array.from(
    { length },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join("");
}
