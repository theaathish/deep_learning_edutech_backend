import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config';

const resendApiKey = config.email.resendApiKey;
const resendFrom = config.email.from;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const transporter = config.email.user
  ? nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // TLS for port 587
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      connectionTimeout: 5000,
      socketTimeout: 5000,
    })
  : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Try Resend first if configured
  if (resendClient && resendFrom) {
    try {
      await resendClient.emails.send({
        from: resendFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return;
    } catch (error) {
      console.error('Error sending email via Resend:', error);
      // fall through to SMTP fallback
    }
  }

  if (!transporter) {
    console.error('Email not sent: SMTP not configured and Resend failed or missing.');
    return;
  }

  try {
    await transporter.sendMail({
      from: `EduTech Platform <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw - email failures should not block user operations
    // Log but continue gracefully
  }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const html = `
    <h1>Welcome to EduTech Platform!</h1>
    <p>Hi ${name},</p>
    <p>Thank you for joining our educational platform. We're excited to have you on board!</p>
    <p>Start exploring courses and enhance your learning journey.</p>
    <p>Best regards,<br>EduTech Team</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to EduTech Platform',
    html,
  });
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationLink: string
): Promise<void> => {
  const html = `
    <h1>Verify Your Email</h1>
    <p>Hi ${name},</p>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verificationLink}">Verify Email</a>
    <p>If you didn't create an account, please ignore this email.</p>
    <p>Best regards,<br>EduTech Team</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetLink: string
): Promise<void> => {
  const html = `
    <h1>Reset Your Password</h1>
    <p>Hi ${name},</p>
    <p>You requested to reset your password. Click the link below to proceed:</p>
    <a href="${resetLink}">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>EduTech Team</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
  });
};
