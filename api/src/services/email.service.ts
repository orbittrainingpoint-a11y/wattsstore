/** Nodemailer SMTP transport. Used by the email worker to actually send rendered emails. */
import nodemailer from 'nodemailer';
import { renderTemplate } from './template.service';
import { presignedDownload } from '../config/minio';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export const emailService = {
  async send(params: {
    template: string;
    recipient: string;
    subject: string;
    data: Record<string, unknown>;
    attachments?: { filename: string; objectKey: string }[];
  }) {
    const html = renderTemplate(params.template, params.data);
    const attachments = params.attachments
      ? await Promise.all(
          params.attachments.map(async (a) => ({ filename: a.filename, href: await presignedDownload(a.objectKey) })),
        )
      : undefined;

    return transporter.sendMail({
      from: env.MAIL_FROM,
      to: params.recipient,
      subject: params.subject,
      html,
      attachments,
    });
  },
};
