import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_PASSPHRASE_MIN_LENGTH,
  decryptBackupText,
  encryptBackupText,
  isEncryptedBackupText,
  SECURE_BACKUP_FORMAT,
} from './secureBackup';

const passphrase = 'correct horse battery staple';

 test('encrypted backup round-trip hides plaintext and restores it exactly', async () => {
  const plaintext = JSON.stringify({ app: 'ShasthoNote AI', sensitive: 'patient information', count: 3 });
  const encrypted = await encryptBackupText(plaintext, passphrase);
  assert.equal(isEncryptedBackupText(encrypted), true);
  assert.equal(encrypted.includes('patient information'), false);
  assert.equal(await decryptBackupText(encrypted, passphrase), plaintext);
});

test('encryption refuses a short passphrase', async () => {
  await assert.rejects(
    () => encryptBackupText('{"safe":true}', 'short'),
    new RegExp(String(BACKUP_PASSPHRASE_MIN_LENGTH)),
  );
});

test('decryption rejects wrong passphrases and tampered ciphertext', async () => {
  const encrypted = await encryptBackupText('{"value":"private"}', passphrase);
  await assert.rejects(() => decryptBackupText(encrypted, 'a different long passphrase'), /incorrect or the encrypted backup/);
  const envelope = JSON.parse(encrypted) as Record<string, unknown>;
  const ciphertext = String(envelope.ciphertext);
  envelope.ciphertext = `${ciphertext.slice(0, -4)}AAAA`;
  await assert.rejects(() => decryptBackupText(JSON.stringify(envelope), passphrase));
});

test('encrypted backup format and metadata are validated before decryption', async () => {
  assert.equal(isEncryptedBackupText('{"format":"other"}'), false);
  const malformed = JSON.stringify({ format: SECURE_BACKUP_FORMAT, schemaVersion: 99 });
  await assert.rejects(() => decryptBackupText(malformed, passphrase), /unsupported format/);
  await assert.rejects(() => decryptBackupText('not json', passphrase), /valid encrypted/);
});
