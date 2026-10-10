import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { sendSms } from './sms';

// No look-alike characters (0/O, 1/l/I) so it's easy to type from an SMS.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A readable temporary password, e.g. "Cps-7hQ2kP9m". */
export function generateTempPassword(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `Cps-${s}`;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

const SIGN_IN_URL = `${(process.env.FRONTEND_URL || 'https://www.cpsdeliverygh.com').replace(/\/+$/, '')}/signin`;

/**
 * Texts someone the login details for an account operations created for them.
 * Fire-and-forget (sendSms never throws); OTP-tagged so it arrives quickly.
 */
export function sendLoginDetails(phone: string, opts: { name: string; accountLabel: string; password: string }) {
  const message =
    `CPS Delivery: Hi ${opts.name}, your ${opts.accountLabel} account is ready. ` +
    `Sign in at ${SIGN_IN_URL} with phone ${phone} and password ${opts.password}. ` +
    'Please change your password after signing in.';
  void sendSms(phone, message, { isOtp: true });
}
