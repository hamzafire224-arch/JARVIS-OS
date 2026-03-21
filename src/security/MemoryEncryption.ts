/**
 * JARVIS End-to-End Memory Encryption
 *
 * Implements AES-256-GCM encryption/decryption for the memory store.
 * Ensures that persistent memories (facts, projects, context) are
 * encrypted at rest on disk.
 */

import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { logger } from '../utils/logger.js';

// Configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a 32-byte key from a password or phrase.
 */
function deriveKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Gets the encryption key from environment.
 * If not set, returns null (encryption disabled).
 */
export function getEncryptionKey(): string | null {
    return process.env['JARVIS_MEMORY_KEY'] || null;
}

/**
 * Determines if memory encryption is enabled.
 */
export function isEncryptionEnabled(): boolean {
    return !!getEncryptionKey();
}

/**
 * Encrypts a plaintext string (e.g., JSON memory store) using AES-256-GCM.
 * The output format is: salt (16 bytes) | iv (12 bytes) | auth_tag (16 bytes) | ciphertext
 * 
 * @param plaintext The data to encrypt
 * @param password The master password or key
 * @returns A base64-encoded encrypted payload
 */
export function encryptMemory(plaintext: string, password: string): string {
    try {
        const salt = randomBytes(SALT_LENGTH);
        const key = deriveKey(password, salt);
        const iv = randomBytes(IV_LENGTH);

        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
        
        let ciphertext = cipher.update(plaintext, 'utf8');
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        
        const authTag = cipher.getAuthTag();

        // Concatenate everything into a single buffer
        const payload = Buffer.concat([salt, iv, authTag, ciphertext]);
        
        return payload.toString('base64');
    } catch (err) {
        logger.error('Failed to encrypt memory', { error: err instanceof Error ? err.message : String(err) });
        throw new Error('Memory encryption failed');
    }
}

/**
 * Decrypts a base64-encoded payload created by `encryptMemory`.
 * 
 * @param payloadBase64 The base64 encrypted payload
 * @param password The master password or key
 * @returns The decrypted plaintext
 */
export function decryptMemory(payloadBase64: string, password: string): string {
    try {
        const payload = Buffer.from(payloadBase64, 'base64');
        
        // Extract components
        let offset = 0;
        const salt = payload.subarray(offset, offset + SALT_LENGTH);
        offset += SALT_LENGTH;
        
        const iv = payload.subarray(offset, offset + IV_LENGTH);
        offset += IV_LENGTH;
        
        const authTag = payload.subarray(offset, offset + AUTH_TAG_LENGTH);
        offset += AUTH_TAG_LENGTH;
        
        const ciphertext = payload.subarray(offset);

        // Derive key and decrypt
        const key = deriveKey(password, salt);
        const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let plaintext = decipher.update(ciphertext, undefined, 'utf8');
        plaintext += decipher.final('utf8');
        
        return plaintext;
    } catch (err) {
        logger.error('Failed to decrypt memory', { error: err instanceof Error ? err.message : String(err) });
        throw new Error('Memory decryption failed - invalid key or corrupted data');
    }
}
