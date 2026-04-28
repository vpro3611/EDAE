import crypto from 'crypto';
import { InfraEncryptionInterface } from './infra.encryption.interface';

export class InfraCryptoAesImplementation implements InfraEncryptionInterface {
    private readonly key: Buffer;

    constructor(hexKey: string) {
        const key = Buffer.from(hexKey, 'hex');
        if (key.length !== 32) {
            throw new Error(`Encryption key must be 32 bytes (256 bits), got ${key.length} bytes`);
        }
        this.key = key;
    }

    static create(hexKey: string): InfraCryptoAesImplementation {
        return new InfraCryptoAesImplementation(hexKey);
    }

    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(ciphertext: string): string {
        const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
    }
}
