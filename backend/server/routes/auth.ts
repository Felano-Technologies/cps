import { randomUUID } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { clearSessionCookie, setSessionCookie, signToken } from '../lib/auth';
import { requireAuth } from '../middleware/auth';
import { sendSms } from '../lib/sms';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  password: z.string().min(8),
});

function toPublicUser(user: { id: string; name: string; email: string; role: string; phone: string | null; phoneVerified: boolean }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone ?? undefined, phoneVerified: user.phoneVerified };
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { name, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this phone number already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email: `${phone.replace(/[^0-9]/g, '')}@phone.cps.local`,
      phone,
      passwordHash,
      role: 'customer',
    },
  });

  res.status(201).json(toPublicUser(user));
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid phone/email or password' });
  }
  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid phone/email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid phone/email or password' });
  }

  const token = signToken({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
  res.json(toPublicUser(user));
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(toPublicUser(user));
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.patch('/password', requireAuth, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.status(204).send();
});

const OTP_TTL_MS = 5 * 60 * 1000;

router.post('/phone/verify/request', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!user.phone) {
    return res.status(400).json({ error: 'No phone number on file for this account' });
  }
  if (user.phoneVerified) {
    return res.status(400).json({ error: 'Phone number is already verified' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.phoneOtp.create({ data: { phone: user.phone, code, expiresAt } });

  sendSms(user.phone, `Your CPS Delivery verification code is ${code}. It expires in 5 minutes.`).catch(() => {});

  res.status(204).send();
});

const confirmPhoneSchema = z.object({ code: z.string().length(6) });

router.post('/phone/verify/confirm', requireAuth, async (req, res) => {
  const parsed = confirmPhoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid 6-digit code is required' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!user.phone) {
    return res.status(400).json({ error: 'No phone number on file for this account' });
  }

  const otp = await findValidOtp(user.phone, parsed.data.code);
  if (!otp) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });

  res.json(toPublicUser(updated));
});

const phoneSchema = z.object({ phone: z.string().min(7) });

router.post('/phone/request-otp', async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  const { phone } = parsed.data;

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.phoneOtp.create({ data: { phone, code, expiresAt } });

  sendSms(phone, `Your CPS Delivery verification code is ${code}. It expires in 5 minutes.`).catch(() => {});

  res.status(204).send();
});

async function findValidOtp(phone: string, code: string) {
  return prisma.phoneOtp.findFirst({
    where: { phone, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
}

const verifyOtpSchema = z.object({ phone: z.string().min(7), code: z.string().length(6) });

router.post('/phone/verify-otp', async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid phone number and code are required' });
  }
  const { phone, code } = parsed.data;

  const otp = await findValidOtp(phone, code);
  if (!otp) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    // Leave the OTP unconsumed — /phone/signup consumes it once the profile is completed.
    return res.json({ exists: false });
  }

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  const token = signToken({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
  res.json({ exists: true, user: toPublicUser(user) });
});

const phoneSignupSchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6),
  name: z.string().min(1),
  role: z.enum(['customer', 'operations', 'admin', 'rider']),
});

router.post('/phone/signup', async (req, res) => {
  const parsed = phoneSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { phone, code, name, role } = parsed.data;

  const otp = await findValidOtp(phone, code);
  if (!otp) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this phone number already exists' });
  }

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), 10);
  const user = await prisma.user.create({
    data: {
      name,
      email: `${phone.replace(/[^0-9]/g, '')}@phone.cps.local`,
      passwordHash,
      role,
      phone,
      ...(role === 'rider' ? { riderProfile: { create: {} } } : {}),
    },
  });

  const token = signToken({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
  res.status(201).json(toPublicUser(user));
});

export default router;
