import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  message: z.string().trim().min(1, 'Message is required').max(4000),
});

const SUPPORT_INBOX = process.env.SUPPORT_EMAIL || 'cpsdeliverygh@gmail.com';

router.post('/', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { name, email, message } = parsed.data;

  const contactMessage = await prisma.contactMessage.create({
    data: { name, email, message },
  });

  await sendEmail(
    SUPPORT_INBOX,
    `New contact message from ${name}`,
    `From: ${name} <${email}>\n\n${message}`
  );

  res.status(201).json({ id: contactMessage.id });
});

export default router;
