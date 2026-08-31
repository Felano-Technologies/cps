let warned = false;

export async function sendSms(to: string, message: string): Promise<void> {
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
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[sms] mNotify request failed (${res.status}):`, text);
    }
  } catch (err) {
    console.error('[sms] Failed to send SMS:', err instanceof Error ? err.message : err);
  }
}
