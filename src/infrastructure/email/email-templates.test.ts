import { describe, expect, it } from 'vitest';

import { emailTemplates } from './email-templates';

describe('emailTemplates.emailCode', () => {
  it('should put the code in the subject-specific mail for email verification', () => {
    const mail = emailTemplates.emailCode('ada@example.com', 'email-verification', '123456', 10);
    expect(mail.to).toBe('ada@example.com');
    expect(mail.subject).toBe('Confirm your email');
    expect(mail.text).toContain('123456');
    expect(mail.text).toContain('10 minutes');
    expect(mail.html).toContain('123456');
  });

  it('should use reset wording for forget-password codes', () => {
    const mail = emailTemplates.emailCode('ada@example.com', 'forget-password', '654321', 1);
    expect(mail.subject).toBe('Your password reset code');
    expect(mail.text).toContain('1 minute.');
  });

  it('should escape html in the code', () => {
    const mail = emailTemplates.emailCode('ada@example.com', 'email-verification', '<b>', 5);
    expect(mail.html).not.toContain('<b>');
  });
});
