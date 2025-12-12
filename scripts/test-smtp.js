#!/usr/bin/env node
/*
SMTP Readiness Test for VM (Gmail)
- Verifies connectivity to smtp.gmail.com on ports 587 (TLS) and 465 (SSL)
- Attempts to authenticate and send a test message (optional)
- Prints clear diagnostics and recommendations

Usage:
  EMAIL_USER="your@gmail.com" EMAIL_PASSWORD="your_app_password" node scripts/test-smtp.js [recipient_email]
*/

const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const RECIPIENT = process.argv[2] || EMAIL_USER; // default send to self

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.error('❌ Missing EMAIL_USER or EMAIL_PASSWORD env vars.');
  console.error('Set them and re-run, e.g.:');
  console.error('  EMAIL_USER="your@gmail.com" EMAIL_PASSWORD="your_app_password" node scripts/test-smtp.js you@example.com');
  process.exit(1);
}

const tests = [
  { host: 'smtp.gmail.com', port: 587, secure: false, label: 'Gmail SMTP TLS (587)' },
  { host: 'smtp.gmail.com', port: 465, secure: true, label: 'Gmail SMTP SSL (465)' },
];

async function runTest({ host, port, secure, label }) {
  console.log(`\n=== Testing ${label} ===`);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
    connectionTimeout: 8000,
    socketTimeout: 8000,
    greetingTimeout: 8000,
  });

  try {
    // Verify connection and auth
    await transporter.verify();
    console.log('✅ SMTP verify succeeded');
  } catch (err) {
    console.error('❌ SMTP verify failed');
    printError(err, { host, port, secure });
    return { ok: false };
  }

  // Attempt a test send (optional)
  try {
    const info = await transporter.sendMail({
      from: `SMTP Test <${EMAIL_USER}>`,
      to: RECIPIENT,
      subject: `SMTP Test: ${label}`,
      text: `This is a test email from ${label}. If you received this, SMTP is working.`,
    });
    console.log('📧 Test email sent:', info.messageId);
    return { ok: true };
  } catch (err) {
    console.error('❌ Sending test email failed');
    printError(err, { host, port, secure });
    return { ok: false };
  }
}

function printError(err, meta) {
  const code = err && err.code;
  const msg = err && err.message;
  console.error('Error details:', { message: msg, code, ...meta });
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
    console.error('- Likely outbound SMTP blocked by firewall or provider.');
    console.error('- Ask provider to allow outbound to smtp.gmail.com on ports 587 and 465.');
  }
  if (msg && /Invalid login|Authentication/.test(msg)) {
    console.error('- Authentication failed. Ensure you use a Gmail App Password (not account password).');
    console.error('- Generate at https://myaccount.google.com/apppasswords (2FA required).');
  }
}

(async () => {
  console.log('SMTP readiness test starting...');
  console.log(`Using EMAIL_USER=${EMAIL_USER}, recipient=${RECIPIENT}`);
  const results = [];
  for (const t of tests) {
    // eslint-disable-next-line no-await-in-loop
    const r = await runTest(t);
    results.push({ label: t.label, ...r });
  }

  const ok = results.some(r => r.ok);
  console.log('\nSummary:');
  for (const r of results) {
    console.log(`- ${r.label}: ${r.ok ? '✅ OK' : '❌ FAILED'}`);
  }

  if (!ok) {
    console.error('\nOverall: ❌ SMTP not reachable.');
    console.error('Recommendations:');
    console.error('- Open outbound ports 587 (TLS) and 465 (SSL) to smtp.gmail.com.');
    console.error('- Use Gmail App Password, not your normal password.');
    console.error('- If your provider blocks SMTP, consider HTTP email APIs (SES, Mailgun, Postmark).');
    process.exit(2);
  } else {
    console.log('\nOverall: ✅ SMTP reachable.');
    process.exit(0);
  }
})();
