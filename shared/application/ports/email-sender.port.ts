export interface EmailAttachment {
  filename: string;
  contentType: string;
  /** Base64 encoded content. */
  content: string;
  /** Set for inline images, referenced from the HTML as `cid:<contentId>`. */
  contentId?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  /** Extra headers, e.g. List-Unsubscribe for notification mail. */
  headers?: Record<string, string>;
}

/** Outgoing mail: transactional (verification, password reset, 2FA codes) and notifications. */
export interface IEmailSender {
  /** False for fallbacks that cannot actually deliver mail; the UI hides mail-based flows then. */
  readonly canDeliver: boolean;
  send(message: EmailMessage): Promise<void>;
}
