/**
 * Password-protected backups for sensitive ShasthoNote records.
 *
 * Encryption is performed entirely in the browser with Web Crypto:
 * PBKDF2-SHA-256 derives an AES-256-GCM key from a user-supplied passphrase.
 * The passphrase is never persisted or sent to the server.
 */

export const SECURE_BACKUP_FORMAT = 'shasthonote-encrypted-backup';
export const SECURE_BACKUP_VERSION = 1;
export const BACKUP_PASSPHRASE_MIN_LENGTH = 12;
export const BACKUP_PBKDF2_ITERATIONS = 310_000;
export const MAX_SECURE_BACKUP_BYTES = 38 * 1024 * 1024;
const MAX_PLAINTEXT_BYTES = 25 * 1024 * 1024;
const AAD = 'ShasthoNote AI encrypted backup v1';

interface SecureBackupEnvelope {
  format: typeof SECURE_BACKUP_FORMAT;
  schemaVersion: typeof SECURE_BACKUP_VERSION;
  cipher: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: typeof BACKUP_PBKDF2_ITERATIONS;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function getSubtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure backup encryption requires a modern browser with Web Crypto (HTTPS or localhost).');
  }
  return globalThis.crypto.subtle;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function fromBase64(value: unknown, maxBytes: number): Uint8Array {
  if (typeof value !== 'string' || value.length === 0 || value.length > Math.ceil(maxBytes * 4 / 3) + 8) {
    throw new Error('The encrypted backup file is invalid or too large.');
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('The encrypted backup file contains invalid data.');
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error('The encrypted backup file contains invalid data.');
  }
  if (binary.length > maxBytes) throw new Error('The encrypted backup file is too large.');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const material = await subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: BACKUP_PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function isEncryptedBackupText(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as { format?: unknown };
    return parsed?.format === SECURE_BACKUP_FORMAT;
  } catch {
    return false;
  }
}

export async function encryptBackupText(plaintext: string, passphrase: string): Promise<string> {
  if (typeof plaintext !== 'string' || encoder.encode(plaintext).byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error('The backup is too large to encrypt (25 MB limit).');
  }
  if (typeof passphrase !== 'string' || passphrase.length < BACKUP_PASSPHRASE_MIN_LENGTH || passphrase.length > 1024) {
    throw new Error(`Use a backup passphrase with at least ${BACKUP_PASSPHRASE_MIN_LENGTH} characters.`);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await getSubtleCrypto().encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: encoder.encode(AAD), tagLength: 128 },
    key,
    encoder.encode(plaintext),
  );

  const envelope: SecureBackupEnvelope = {
    format: SECURE_BACKUP_FORMAT,
    schemaVersion: SECURE_BACKUP_VERSION,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: BACKUP_PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(envelope);
}

export async function decryptBackupText(encryptedText: string, passphrase: string): Promise<string> {
  if (typeof passphrase !== 'string' || passphrase.length < BACKUP_PASSPHRASE_MIN_LENGTH || passphrase.length > 1024) {
    throw new Error(`Enter the passphrase used to protect this backup (at least ${BACKUP_PASSPHRASE_MIN_LENGTH} characters).`);
  }
  if (typeof encryptedText !== 'string' || encryptedText.length > MAX_SECURE_BACKUP_BYTES) {
    throw new Error('The encrypted backup file is too large.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(encryptedText);
  } catch {
    throw new Error('This is not a valid encrypted ShasthoNote backup.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This is not a valid encrypted ShasthoNote backup.');
  }
  const envelope = parsed as Partial<SecureBackupEnvelope>;
  if (
    envelope.format !== SECURE_BACKUP_FORMAT ||
    envelope.schemaVersion !== SECURE_BACKUP_VERSION ||
    envelope.cipher !== 'AES-256-GCM' ||
    envelope.kdf !== 'PBKDF2-SHA-256' ||
    envelope.iterations !== BACKUP_PBKDF2_ITERATIONS
  ) {
    throw new Error('This encrypted backup uses an unsupported format or security setting.');
  }

  const salt = fromBase64(envelope.salt, 16);
  const iv = fromBase64(envelope.iv, 12);
  const ciphertext = fromBase64(envelope.ciphertext, MAX_PLAINTEXT_BYTES + 16);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) {
    throw new Error('The encrypted backup file is incomplete or damaged.');
  }

  try {
    const key = await deriveKey(passphrase, salt);
    const decrypted = await getSubtleCrypto().decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: encoder.encode(AAD), tagLength: 128 },
      key,
      toArrayBuffer(ciphertext),
    );
    const plaintext = decoder.decode(decrypted);
    if (encoder.encode(plaintext).byteLength > MAX_PLAINTEXT_BYTES) {
      throw new Error('The decrypted backup exceeds the supported size.');
    }
    return plaintext;
  } catch (error) {
    if (error instanceof Error && error.message.includes('exceeds the supported size')) throw error;
    throw new Error('The passphrase is incorrect or the encrypted backup has been changed or damaged.');
  }
}
