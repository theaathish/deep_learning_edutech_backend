#!/usr/bin/env node
/*
Resend API Test
- Sends a test email via Resend using RESEND_API_KEY
- Uses EMAIL_FROM as sender
- Recipient: arg[0] or EMAIL_TO or EMAIL_FROM

Usage:
  RESEND_API_KEY="..." EMAIL_FROM="noreply@example.com" node scripts/test-resend.js recipient@example.com
*/

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const to = process.argv[2] || process.env.EMAIL_TO || from;

if (!apiKey) {
  console.error('❌ Missing RESEND_API_KEY');
  process.exit(1);
}
if (!from) {
  console.error('❌ Missing EMAIL_FROM');
  process.exit(1);
}
if (!to) {
  console.error('❌ Missing recipient (pass arg or set EMAIL_TO)');
  process.exit(1);
}

const resend = new Resend(apiKey);

(async () => {
  console.log('Resend test starting...');
  console.log(`From: ${from}`);
  console.log(`To:   ${to}`);
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'Resend API Test',
      html: '<strong>If you received this, Resend is working.</strong>',
      text: 'If you received this, Resend is working.',
    });
    if (error) {
      console.error('❌ Resend error:', error);
      process.exit(2);
    }
    console.log('✅ Sent via Resend. Message ID:', data && data.id);
    process.exit(0);
  } catch (err) {
    console.error('❌ Exception sending via Resend:', err);
    process.exit(2);
  }
})();
