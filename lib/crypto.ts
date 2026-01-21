import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer | null {
    const keyHex = process.env.ENCRYPTION_KEY || "";
    if (!keyHex || keyHex.length !== 64) {
        // Warn only once or rely on callers to handle
        return null;
    }
    return Buffer.from(keyHex, 'hex');
}

export function encrypt(text: string): string {
    const key = getKey();
    if (!text || !key) {
        if (!key) console.warn("WARNING: ENCRYPTION_KEY is missing/invalid during encrypt");
        return text;
    }

    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, key as unknown as crypto.CipherKey, iv as any);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        // Format: IV:AuthTag:EncryptedData
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error("Encryption failed:", error);
        return text;
    }
}

export function decrypt(text: string): string {
    const key = getKey();
    if (!text || !key) return text;

    // Check if text is in our expected format (IV:AuthTag:EncryptedData)
    const parts = text.split(':');
    if (parts.length !== 3) {
        // Assume it's plain text (backward compatibility)
        return text;
    }

    try {
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, key as unknown as crypto.CipherKey, iv as any);
        decipher.setAuthTag(authTag as unknown as Uint8Array);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        // If decryption fails, it might be plain text or corrupted. Return original.
        // In highly secure envs, verify why it failed. Here we fallback for safety/checking.
        console.warn("Decryption failed, returning original text.");
        return text;
    }
}
