import type { UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { sendEmail } from './mailer';
import { sendSms } from './sms';
import { pushToUser } from './ws';

export interface NotifyChannels {
  /** Also send an email (default true). */
  email?: boolean;
  /** Also send an SMS (default true). */
  sms?: boolean;
}

export async function notify(
  userId: string,
  type: string,
  title: string,
  message: string,
  shipmentId?: string,
  channels: NotifyChannels = {}
) {
  const { email = true, sms = true } = channels;

  const notification = await prisma.notification.create({
    data: { userId, type, title, message, shipmentId },
  });

  pushToUser(userId, { type: 'notification', notification });

  if (!email && !sms) return notification;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  if (user) {
    if (email) sendEmail(user.email, title, message).catch(() => {});
    if (sms && user.phone) {
      // Tagged sms_type: "otp" — mNotify only delivers non-tagged "quick"
      // SMS at low priority (observed ~10min delay); OTP-tagged sends go
      // out near-instantly. Billed from the OTP wallet like verification codes.
      sendSms(user.phone, `${title}: ${message}`, { isOtp: true }).catch(() => {});
    }
  }

  return notification;
}

/**
 * Broadcasts to every user with one of `roles`. Staff alerts are in-app +
 * websocket only by default: texting and emailing every ops/admin user on each
 * order event costs SMS credits and buries the alerts that matter.
 */
export async function notifyRoles(
  roles: UserRole[],
  type: string,
  title: string,
  message: string,
  shipmentId?: string,
  channels: NotifyChannels = { email: false, sms: false }
) {
  const users = await prisma.user.findMany({ where: { role: { in: roles } }, select: { id: true } });
  await Promise.all(users.map(u => notify(u.id, type, title, message, shipmentId, channels)));
}
