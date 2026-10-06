import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX = 'cps_live_';
/** Characters of the key kept in plain text so owners can tell keys apart. */
const DISPLAY_PREFIX_LENGTH = KEY_PREFIX.length + 6;

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Creates a new secret API key. Only the hash and display prefix are stored. */
export function generateApiKey() {
  const key = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
  return { key, prefix: key.slice(0, DISPLAY_PREFIX_LENGTH), keyHash: hashApiKey(key) };
}

export function looksLikeApiKey(value: string) {
  return value.startsWith(KEY_PREFIX);
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}
