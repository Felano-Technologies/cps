import type { UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { sendEmail } from './mailer';
import { sendSms } from './sms';
import { pushToUser } from './ws';

export async function notify(
  userId: string,
  type: string,
  title: string,
  message: string,
  shipmentId?: string
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, shipmentId },
  });

  pushToUser(userId, { type: 'notification', notification });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  if (user) {
    sendEmail(user.email, title, message).catch(() => {});
    if (user.phone) {
      sendSms(user.phone, `${title}: ${message}`).catch(() => {});
    }
  }

  return notification;
}

export async function notifyRoles(
  roles: UserRole[],
  type: string,
  title: string,
  message: string,
  shipmentId?: string
) {
  const users = await prisma.user.findMany({ where: { role: { in: roles } }, select: { id: true } });
  await Promise.all(users.map(u => notify(u.id, type, title, message, shipmentId)));
}
