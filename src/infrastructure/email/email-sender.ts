import 'server-only';

import type { EmailMessage, IEmailSender } from '@shared/application/ports/email-sender.port';
import { SITE_URL } from '@/config/deployment.config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Resend over plain HTTPS; no SDK needed for a single endpoint. */
export class ResendEmailSender implements IEmailSender {
  readonly canDeliver = true;

  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
        attachments: message.attachments?.map(({ filename, contentType, content, contentId }) => ({
          filename,
          content,
          content_type: contentType,
          content_id: contentId,
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`resend responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
  }
}

/** Development and "not configured yet" fallback: logs instead of sending. */
export class LogEmailSender implements IEmailSender {
  readonly canDeliver = false;

  async send(message: EmailMessage): Promise<void> {
    const preview = process.env.NODE_ENV === 'production' ? '[redacted]' : message.text;
    console.warn(JSON.stringify({ level: 'warn', msg: 'email_not_delivered', to: message.to, subject: message.subject, preview }));
  }
}

/**
 * Env values pasted through clipboards or Windows shells can carry a byte-order mark or stray
 * whitespace, which makes fetch reject the Authorization header. Strip them once here.
 */
export function cleanEnvValue(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/[﻿​\u0000-\u001F]/g, '').trim();
  return cleaned || undefined;
}

let sender: IEmailSender | null = null;

export function getEmailSender(): IEmailSender {
  if (sender) return sender;
  const apiKey = cleanEnvValue(process.env.RESEND_API_KEY);
  sender = apiKey
    ? new ResendEmailSender(apiKey, cleanEnvValue(process.env.EMAIL_FROM) ?? `Wizard Party <noreply@${new URL(SITE_URL).hostname}>`)
    : new LogEmailSender();
  return sender;
}
