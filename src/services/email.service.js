import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { escapeHtml, formatDateTime, formatProducts } from '../utils/format.js';

const BRAND_SIGNATURE = 'Savira Systek\nIndustrial Automation & Material Handling Solutions';

let transporter = null;

const isConfigured = () => Boolean(env.smtp.host && env.smtp.from);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporter;
}

/** Checks the SMTP connection at startup so misconfiguration shows up in the logs early. */
export async function verifyEmailTransport() {
  if (!isConfigured()) {
    logger.warn('SMTP not configured (SMTP_HOST / SMTP_FROM missing). Emails will be skipped.');
    return;
  }
  try {
    await getTransporter().verify();
    logger.info(`SMTP connection verified (${env.smtp.host}:${env.smtp.port})`);
  } catch (err) {
    logger.error(`SMTP verification failed: ${err.message}`);
  }
}

/**
 * Sends an email. Never throws.
 * @returns {Promise<'sent'|'failed'|'skipped'>}
 */
async function send({ to, subject, text, html, replyTo }, label) {
  if (!isConfigured()) {
    logger.warn(`Email skipped (${label}): SMTP not configured`);
    return 'skipped';
  }
  try {
    await getTransporter().sendMail({ from: env.smtp.from, to, subject, text, html, replyTo });
    logger.info(`Email sent (${label}) to ${to}`);
    return 'sent';
  } catch (err) {
    logger.error(`Email failed (${label}) to ${to}: ${err.message}`);
    return 'failed';
  }
}

const layout = (body) => `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#0b2545;padding:20px 24px;border-bottom:4px solid #f5b800;">
      <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">SAVIRA <span style="color:#3b8cff;">SYSTEK</span></span>
    </td></tr>
    <tr><td style="padding:24px;font-size:15px;line-height:1.6;">${body}</td></tr>
  </table>
</body></html>`;

export function sendVisitorThankYou(enquiry) {
  const text = `Dear ${enquiry.name},

Thank you for visiting Savira Systek and for showing interest in our automation solutions.

We have received your enquiry successfully.

Our team will review your requirements and connect with you very soon.

Your enquiry reference number is: ${enquiry.enquiryId}

Regards,

${BRAND_SIGNATURE}`;

  const html = layout(`
    <p>Dear ${escapeHtml(enquiry.name)},</p>
    <p>Thank you for visiting Savira Systek and for showing interest in our automation solutions.</p>
    <p>We have received your enquiry successfully.</p>
    <p>Our team will review your requirements and connect with you very soon.</p>
    <p style="margin:24px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #f5b800;">
      Your enquiry reference number is: <strong>${escapeHtml(enquiry.enquiryId)}</strong>
    </p>
    <p>Regards,</p>
    <p><strong>Savira Systek</strong><br/>Industrial Automation &amp; Material Handling Solutions</p>`);

  return send(
    {
      to: enquiry.email,
      subject: 'Thank You for Your Interest in Savira Systek',
      text,
      html,
      replyTo: env.adminNotificationEmail || undefined,
    },
    `thank-you ${enquiry.enquiryId}`,
  );
}

export function sendAdminNotification(enquiry) {
  if (!env.adminNotificationEmail) return Promise.resolve('skipped');

  const rows = [
    ['Enquiry ID', enquiry.enquiryId],
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Contact Number', enquiry.contactNumber],
    ['Company Name', enquiry.companyName],
    ['Company Location', enquiry.companyLocation],
    ['Interested Products', formatProducts(enquiry)],
    ['Demo/Trial Interest', enquiry.interestedInDemo ? 'Yes' : 'No'],
    ['Expected Demo/Trial Timeline', enquiry.demoTimeline || '-'],
    ['Additional Requirements', enquiry.additionalMessage || '-'],
    ['Submission Date/Time', formatDateTime(enquiry.createdAt)],
  ];

  const text = `New exhibition enquiry received.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`;
  const html = layout(`
    <p style="margin-top:0;"><strong>New exhibition enquiry received.</strong></p>
    <table cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      ${rows
        .map(
          ([k, v]) => `<tr>
            <td style="border-bottom:1px solid #e2e8f0;color:#475569;width:40%;vertical-align:top;">${k}</td>
            <td style="border-bottom:1px solid #e2e8f0;white-space:pre-wrap;">${escapeHtml(v)}</td>
          </tr>`,
        )
        .join('')}
    </table>`);

  return send(
    {
      to: env.adminNotificationEmail,
      subject: `New Exhibition Enquiry - ${enquiry.companyName}`,
      text,
      html,
      replyTo: enquiry.email,
    },
    `admin-notification ${enquiry.enquiryId}`,
  );
}
