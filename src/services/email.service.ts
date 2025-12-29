import nodemailer from 'nodemailer';
import { CreateEmailOptions, Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config()

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Using Resend (recommended)
const resend = new Resend(process.env.RESEND_API_KEY);

// Fallback to nodemailer
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: EmailOptions) => {
  const emailOptions: CreateEmailOptions = {
    from: options.from ?? process.env.EMAIL_FROM ?? 'royalbirdstudios',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    // Try Resend first
    if (process.env.RESEND_API_KEY) {
      const data = await resend.emails.send(emailOptions);
      return data;
    }
    
    // Fallback to nodemailer
    if (process.env.SMTP_HOST) {
      const transporter = createTransporter();
      await transporter.sendMail(emailOptions);
      return { success: true };
    }
    
    // Log email in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Email would be sent:', emailOptions);
      return { success: true, devMode: true };
    }
    
    throw new Error('No email service configured');
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};