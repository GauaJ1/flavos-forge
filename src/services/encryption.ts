import crypto from "crypto";
import { config } from "../config/index.js";

const ALGORITHM = "aes-256-gcm";

// Validate and load the 32-byte encryption key
const keyBuffer = Buffer.from(config.JOURNAL_ENC_KEY, "hex");

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns the encrypted content, IV, and GCM authentication tag as Buffers.
 */
export function encryptJournal(text: string): { contentEnc: Buffer; iv: Buffer; authTag: Buffer } {
  // Generate a random 12-byte IV for GCM (required to prevent reuse)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  const contentEnc = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return { contentEnc, iv, authTag };
}

/**
 * Decrypts AES-256-GCM encrypted content.
 * Verifies authenticity using the GCM auth tag.
 */
export function decryptJournal(contentEnc: Buffer, iv: Buffer, authTag: Buffer): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(contentEnc),
    decipher.final()
  ]);
  
  return decrypted.toString("utf8");
}
