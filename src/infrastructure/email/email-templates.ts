import type { EmailMessage } from '@shared/application/ports/email-sender.port';

import { TEXT_SIGNATURE, button, codeBlock, emailLayout, paragraph, smallPrint } from './email-layout';

const IGNORE_NOTE = 'If you did not request this, you can safely ignore this email. Nothing changes on your account.';

function actionMail(to: string, subject: string, intro: string, cta: string, url: string, preheader = intro): EmailMessage {
  return {
    to,
    subject,
    text: `${intro}\n\n${cta}: ${url}\n\n${IGNORE_NOTE}\n\n${TEXT_SIGNATURE}`,
    html: emailLayout({ heading: subject, preheader, body: `${paragraph(intro)}${button(cta, url)}${smallPrint(IGNORE_NOTE)}` }),
  };
}

/** Purposes a one-time email code is sent for (mirrors Better Auth's email-otp types). */
export type EmailCodePurpose = 'email-verification' | 'forget-password' | 'sign-in' | 'change-email';

const CODE_COPY: Record<EmailCodePurpose, { subject: string; heading: string; intro: string }> = {
  'email-verification': { subject: 'Confirm your email', heading: 'Welcome, wizard!', intro: 'Enter this code to confirm your email address and finish creating your account:' },
  'forget-password': { subject: 'Your password reset code', heading: 'Reset your password', intro: 'Someone asked to reset the password of your Wizard Party account. Enter this code to choose a new one:' },
  'sign-in': { subject: 'Your sign-in code', heading: 'Your sign-in code', intro: 'Use this code to sign in to Wizard Party:' },
  'change-email': { subject: 'Confirm your new email', heading: 'Confirm your new email', intro: 'Enter this code to confirm the new email address of your Wizard Party account:' },
};

function codeMail(to: string, purpose: EmailCodePurpose, code: string, expiresInMinutes: number): EmailMessage {
  const { subject, heading, intro } = CODE_COPY[purpose];
  const expiry = `The code expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}.`;
  return {
    to,
    subject,
    text: `${intro}\n\n${code}\n\n${expiry} ${IGNORE_NOTE}\n\n${TEXT_SIGNATURE}`,
    html: emailLayout({
      heading,
      preheader: `${code} is your Wizard Party code. ${expiry}`,
      body: `${paragraph(intro)}${codeBlock(code)}${smallPrint(`${expiry} ${IGNORE_NOTE}`)}`,
    }),
  };
}

export const emailTemplates = {
  /** 6-digit code for email verification, password reset and other email-otp flows. */
  emailCode: codeMail,
  resetPassword: (to: string, url: string) =>
    actionMail(to, 'Reset your password', 'Someone asked to reset the password of your Wizard Party account. Use the button below to choose a new one.', 'Choose a new password', url),
  twoFactorCode: (to: string, code: string): EmailMessage => codeMail(to, 'sign-in', code, 5),
  /** Someone signed up with an email that already has an account; no code is sent. */
  existingAccount: (to: string, url: string) =>
    actionMail(
      to,
      'You already have an account',
      'Someone tried to create a Wizard Party account with this email, but it already belongs to your account. If that was you, sign in instead, or use “Forgot password” on the sign-in page to choose a new password.',
      'Sign in',
      url
    ),
  deleteAccount: (to: string, url: string) =>
    actionMail(to, 'Confirm account deletion', 'You asked to delete your Wizard Party account and all of its data: stats, achievements, settings and uploaded sounds. This cannot be undone.', 'Delete my account', url),
};
