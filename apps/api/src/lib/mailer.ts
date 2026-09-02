export interface MailerMessage {
  to: string;
  token: string;
  applicationName: string;
}

// Services depend on this interface and never on a provider, so a real
// transport (Resend behind a BullMQ worker) can be introduced later without
// touching a single service.
export interface Mailer {
  sendVerificationEmail(message: MailerMessage): Promise<void>;
  sendPasswordResetEmail(message: MailerMessage): Promise<void>;
}

// Development transport. It prints the token, which is exactly what makes it
// useful locally and exactly why it must never be the production transport:
// anything that can read the logs can take over an account.
export const consoleMailer: Mailer = {
  async sendVerificationEmail({ to, token, applicationName }) {
    console.log(`[mailer] verification for ${to} (${applicationName}): ${token}`);
  },
  async sendPasswordResetEmail({ to, token, applicationName }) {
    console.log(`[mailer] password reset for ${to} (${applicationName}): ${token}`);
  },
};
