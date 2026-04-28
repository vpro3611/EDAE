export interface InfraEncryptionInterface {
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
