import { createHmac, timingSafeEqual } from 'crypto';

/** Wrong entries allowed before the shipment locks and ops must override. */
export const MAX_DELIVERY_CODE_ATTEMPTS = 5;

export const DELIVERY_CODE_PATTERN = /^\d{4,8}$/;

/**
 * Delivery codes are short (4–8 digits), so a plain hash could be brute-forced
 * by anyone who sees it in an API response. Keying the hash with a server
 * secret makes the stored value useless without that secret.
 */
function secret() {
  return process.env.DELIVERY_CODE_SECRET || process.env.JWT_SECRET || 'dev-delivery-code-secret';
}

export function hashDeliveryCode(trackingCode: string, code: string): string {
  return createHmac('sha256', secret()).update(`${trackingCode}:${code.trim()}`).digest('hex');
}

export function deliveryCodeMatches(trackingCode: string, code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashDeliveryCode(trackingCode, code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
