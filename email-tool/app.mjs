import nodemailer from 'nodemailer';

// Env
const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

// One transporter for all invocations in a container
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass },
  // Reasonable timeouts for Lambda
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000
});

// Shared helpers
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const badReq = (msg) => ({ statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: msg }) });
const serverErr = (msg) => ({ statusCode: 502, headers: cors, body: JSON.stringify({ ok: false, error: msg }) });

export const handler = async (event) => {
  // Preflight for browsers
  if ((event.httpMethod || '').toUpperCase() === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }

  // Basic safety checks
  if (!user || !pass) return serverErr('Missing Gmail credentials');

  // Parse body
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return badReq('Invalid JSON');
  }

  // Inputs (allow string or array for to/cc/bcc)
  const to = Array.isArray(body.to) ? body.to : (body.to ? [body.to] : []);
  const cc = Array.isArray(body.cc) ? body.cc : (body.cc ? [body.cc] : []);
  const bcc = Array.isArray(body.bcc) ? body.bcc : (body.bcc ? [body.bcc] : []);

  if (!to.length) return badReq('"to" is required');
  const subject = body.subject || 'Automatic Email Tool';
  // Your requested default message text:
  const text = body.text || 'this is a test email to check spam filter bypass';
  const html = body.html; // optional

  // Build message
  const mail = {
    from: user,
    to: to.join(','),
    cc: cc.length ? cc.join(',') : undefined,
    bcc: bcc.length ? bcc.join(',') : undefined,
    subject,
    text,
    html,
    replyTo: body.replyTo || user
  };

  try {
    const info = await transporter.sendMail(mail);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, messageId: info.messageId || null })
    };
  } catch (err) {
    // Common causes: bad app password, Gmail rate limits, recipient issues
    return serverErr(err?.message || 'Send failed');
  }
};
