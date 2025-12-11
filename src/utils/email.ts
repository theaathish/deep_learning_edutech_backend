import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  connectionTimeout: 10000, // 10 seconds
  socketTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  logger: process.env.NODE_ENV === 'development',
  debug: process.env.NODE_ENV === 'development',
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    // Verify connection before sending
    const verified = await transporter.verify();
    if (!verified) {
      throw new Error('SMTP connection verification failed');
    }

    await transporter.sendMail({
      from: `EduTech Platform <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    // Log detailed error info
    if (error instanceof Error) {
      console.error('Email error details:', {
        message: error.message,
        code: (error as any).code,
        host: config.email.host,
        port: config.email.port,
      });
    }
    throw new Error('Failed to send email');
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
