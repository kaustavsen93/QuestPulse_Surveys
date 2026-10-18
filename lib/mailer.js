/* Sends QuestPulse's emails (only password-reset links so far) through any SMTP account: Gmail with an app password,
   Brevo, Zoho and so on. Set SMTP_HOST, SMTP_USER and SMTP_PASS (and SMTP_PORT, 465 by default, and MAIL_FROM).

   Links in emails start with PUBLIC_URL, the address people use to open the site. They never take the address from
   the incoming request, which anyone can fake to make a reset email point at their own site.
   Running locally with no SMTP set up, emails aren't sent: they're printed in the server log, so password reset can
   still be tried. On a deployed server (Cloud Run or App Engine) with no SMTP set up, email features are off. */
const nodemailer = require('nodemailer');

const env = name => String(process.env[name] || '').trim();
const deployed = Boolean(process.env.K_SERVICE || process.env.GAE_SERVICE);
const smtp = env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS');
const port = Number(env('SMTP_PORT')) || 465;
const transport = smtp ? nodemailer.createTransport({
    host: env('SMTP_HOST'), port, secure: port === 465, auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') }
}) : null;
const publicUrl = (env('PUBLIC_URL') || (deployed ? '' : `http://localhost:${process.env.PORT || 8080}`)).replace(/\/+$/, '');

// Whether emails can go out (or, locally, be printed instead).
const ready = Boolean(publicUrl && (transport || !deployed));
if (deployed && !ready) console.warn('Email is off: set SMTP_HOST, SMTP_USER, SMTP_PASS and PUBLIC_URL to turn on password reset.');

async function send({ to, subject, text, html }) {
    if (!ready) throw new Error('Email is not set up on this server.');
    if (!transport) {
        console.log(`\n[email not sent: no SMTP set up] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
        return;
    }
    await transport.sendMail({ from: env('MAIL_FROM') || `QuestPulse <${env('SMTP_USER')}>`, to, subject, text, html });
}

module.exports = { ready, publicUrl, send };
