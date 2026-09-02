import type { Mailer, MailerMessage } from "../../src/lib/mailer.js";

export interface SentEmail extends MailerMessage {
  kind: "verification" | "password-reset";
}

export function createFakeMailer(): { mailer: Mailer; sent: SentEmail[] } {
  const sent: SentEmail[] = [];
  return {
    sent,
    mailer: {
      async sendVerificationEmail(message) {
        sent.push({ kind: "verification", ...message });
      },
      async sendPasswordResetEmail(message) {
        sent.push({ kind: "password-reset", ...message });
      },
    },
  };
}
