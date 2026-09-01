let warned = false;

interface SendSmsOptions {
  /** Marks this send as an OTP blast per mNotify's sms_type field (billed separately). */
  isOtp?: boolean;
}

export async function sendSms(to: string, message: string, options: SendSmsOptions = {}): Promise<void> {
  const { MNOTIFY_API_KEY, MNOTIFY_SENDER_ID } = process.env;

  if (!MNOTIFY_API_KEY || !MNOTIFY_SENDER_ID) {
    if (!warned) {
      console.warn('[sms] MNOTIFY_API_KEY/MNOTIFY_SENDER_ID not set — SMS sending is disabled.');
      warned = true;
    }
    return;
  }

  try {
    const res = await fetch(`https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: [to],
        sender: MNOTIFY_SENDER_ID,
        message,
        is_schedule: false,
        ...(options.isOtp ? { sms_type: 'otp' } : {}),
      }),
    });

    type MnotifyResponse = { status?: string; summary?: { credit_left?: number } };
    const body = await res.json().catch(() => null) as MnotifyResponse | null;
    if (!res.ok || body?.status !== 'success') {
      console.error(`[sms] mNotify request failed (${res.status}):`, JSON.stringify(body));
    } else {
      console.log(`[sms] Sent to ${to} — credits left: ${body?.summary?.credit_left ?? 'n/a'}`);
    }
  } catch (err) {
    console.error('[sms] Failed to send SMS:', err instanceof Error ? err.message : err);
  }
}
