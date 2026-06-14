import { BrevoClient } from '@getbrevo/brevo';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

let client: BrevoClient | null = null;

if (env.BREVO_API_KEY) {
  client = new BrevoClient({ apiKey: env.BREVO_API_KEY });
}

export const EmailService = {
  async sendPasswordReset(email: string, name: string, token: string) {
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    if (!client) {
      logger.warn(`No BREVO_API_KEY provided. Simulated sending password reset to ${email}. Token: ${token}, Link: ${resetLink}`);
      return;
    }
    
    try {
      await client.transactionalEmails.sendTransacEmail({
        subject: "Password Reset Link",
        htmlContent: `<html><body><h1>Password Reset</h1><p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 1 hour.</p></body></html>`,
        sender: { email: env.BREVO_SENDER_EMAIL || 'noreply@smartcare.local', name: 'SmartCare' },
        to: [{ email, name }]
      });
      logger.info(`Password reset email sent to ${email}`);
    } catch (err) {
      logger.error({ err }, 'Failed to send password reset email');
    }
  },

  async sendVerificationEmail(email: string, name: string, token: string) {
    const verifyLink = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    if (!client) {
      logger.warn(`No BREVO_API_KEY provided. Simulated sending verification email to ${email}. Token: ${token}, Link: ${verifyLink}`);
      return;
    }
    
    try {
      await client.transactionalEmails.sendTransacEmail({
        subject: "Verify your SmartCare Account",
        htmlContent: `<html><body><h1>Email Verification</h1><p>Click <a href="${verifyLink}">here</a> to verify your email address. This link is valid for 24 hours.</p></body></html>`,
        sender: { email: env.BREVO_SENDER_EMAIL || 'noreply@smartcare.local', name: 'SmartCare' },
        to: [{ email, name }]
      });
      logger.info(`Verification email sent to ${email}`);
    } catch (err) {
      logger.error({ err }, 'Failed to send verification email');
    }
  }
};
