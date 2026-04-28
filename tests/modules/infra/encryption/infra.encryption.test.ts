import { InfraCryptoAesImplementation } from '../../../../src/modules/infra/encryption/infra.encryption_aes.implementation';

describe('InfraCryptoAesImplementation', () => {
    const KEY = 'a'.repeat(64); // 32 bytes expressed as 64 hex chars

    let enc: InfraCryptoAesImplementation;

    beforeEach(() => {
        enc = InfraCryptoAesImplementation.create(KEY);
    });

    it('round-trips plaintext through encrypt → decrypt', () => {
        const plain = '{"provider":"telegram","bot_token":"tok","chat_id":"123"}';
        expect(enc.decrypt(enc.encrypt(plain))).toBe(plain);
    });

    it('produces a different ciphertext each call (random IV)', () => {
        const c1 = enc.encrypt('hello');
        const c2 = enc.encrypt('hello');
        expect(c1).not.toBe(c2);
    });

    it('throws when the ciphertext is tampered', () => {
        const parts = enc.encrypt('hello').split(':');
        parts[2] = parts[2].slice(0, -2) + 'ff';
        expect(() => enc.decrypt(parts.join(':'))).toThrow();
    });
});
