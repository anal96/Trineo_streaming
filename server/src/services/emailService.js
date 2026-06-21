import { Resend } from 'resend';

// Lazy getter — avoids instantiating Resend at module load time before dotenv runs
const EMAIL_FROM = () => process.env.EMAIL_FROM || 'no-reply@stream.trineo.in';
const CLIENT_URL = () => process.env.CLIENT_URL || 'https://stream.trineo.in';

const isResendConfigured = () =>
  process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY !== 're_your_resend_api_key_here';

const getResend = () => new Resend(process.env.RESEND_API_KEY);

// ─── Shared brand styles ────────────────────────────────────────────────────
const baseStyles = `
  body { margin: 0; padding: 0; background-color: #0f0a1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 16px; }
  .card { background: linear-gradient(145deg, #1a1030 0%, #120d28 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 20px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 36px 40px 32px; text-align: center; }
  .logo-text { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
  .logo-sub { color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .body { padding: 40px; }
  .title { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px; }
  .subtitle { color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 32px; }
  .info-card { background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .info-label { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { color: #ffffff; font-size: 14px; font-weight: 600; }
  .info-value.mono { font-family: 'Courier New', monospace; background: rgba(139,92,246,0.15); padding: 4px 10px; border-radius: 6px; font-size: 15px; color: #c4b5fd; letter-spacing: 1px; }
  .cta-btn { display: block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; margin: 28px 0; }
  .notice { background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 10px; padding: 16px 20px; margin-top: 16px; }
  .notice p { color: rgba(255,255,255,0.6); font-size: 13px; line-height: 1.6; margin: 0; }
  .notice strong { color: #fbbf24; }
  .footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 24px 40px; text-align: center; }
  .footer p { color: rgba(255,255,255,0.3); font-size: 12px; margin: 0; line-height: 1.6; }
`;

// ─── Welcome Email HTML ─────────────────────────────────────────────────────
function buildWelcomeEmailHtml({ name, email, temporaryPassword }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="logo-text">🎓 Trineo Stream</p>
        <p class="logo-sub">Learning Management System</p>
      </div>
      <div class="body">
        <h1 class="title">Welcome, ${name}! 👋</h1>
        <p class="subtitle">Your student account has been created by your institute admin.</p>

        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Full Name</span>
            <span class="info-value">${name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email Address</span>
            <span class="info-value">${email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Temporary Password</span>
            <span class="info-value mono">${temporaryPassword}</span>
          </div>
        </div>

        <a href="${CLIENT_URL()}/login" class="cta-btn">Sign In to Trineo Stream →</a>

        <div class="notice">
          <p>
            <strong>⚠️ Security Notice:</strong> This is a temporary password. 
            You will be asked to set a new password immediately after your first login. 
            Never share your credentials with anyone.
          </p>
        </div>
      </div>
      <div class="footer">
        <p>This email was sent by Trineo Stream on behalf of your institute.<br>
        If you did not expect this email, please contact your institute administrator.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Password Reset Email HTML ──────────────────────────────────────────────
function buildResetEmailHtml({ name, resetLink }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password – Trineo Stream</title>
  <style>${baseStyles}
    .expiry-badge { display: inline-block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 20px; }
    .link-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 18px; margin-top: 20px; word-break: break-all; }
    .link-box p { color: rgba(255,255,255,0.4); font-size: 11px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .link-box a { color: #c4b5fd; font-size: 12px; text-decoration: none; font-family: monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="logo-text">🔐 Trineo Stream</p>
        <p class="logo-sub">Password Reset Request</p>
      </div>
      <div class="body">
        <h1 class="title">Reset Your Password</h1>
        <p class="subtitle">We received a request to reset the password for <strong style="color:#c4b5fd">${name || 'your account'}</strong>.</p>

        <span class="expiry-badge">⏱ Expires in 30 minutes</span>

        <a href="${resetLink}" class="cta-btn">Reset My Password &rarr;</a>

        <div class="notice">
          <p>
            <strong>🔒 Didn't request this?</strong> If you did not request a password reset, 
            you can safely ignore this email. Your account will remain secure and 
            this link will expire automatically.
          </p>
        </div>

        <div class="link-box">
          <p>Or copy this link into your browser</p>
          <a href="${resetLink}">${resetLink}</a>
        </div>
      </div>
      <div class="footer">
        <p>This reset link will expire in 30 minutes for your security.<br>
        Trineo Stream · stream.trineo.in</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Sends a welcome email with login credentials to a new student.
 * @param {string} name
 * @param {string} email
 * @param {string} temporaryPassword
 */
export async function sendStudentWelcomeEmail(name, email, temporaryPassword) {
  const subject = 'Welcome to Trineo Stream – Your Account Has Been Created';

  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Name: ${name} | Temp Password: ${temporaryPassword}`);
    return;
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildWelcomeEmailHtml({ name, email, temporaryPassword })
    });

    if (error) {
      console.error(`[Resend] Failed to send welcome email to ${email}:`, error);
    } else {
      console.log(`[Resend] Welcome email sent to ${email} (id: ${data?.id})`);
    }
  } catch (err) {
    console.error(`[Resend] Exception sending welcome email to ${email}:`, err.message);
  }
}

/**
 * Sends a password reset email with a secure reset link.
 * @param {string} name
 * @param {string} email
 * @param {string} resetToken - Raw reset token (not hashed)
 */
export async function sendPasswordResetEmail(name, email, resetToken) {
  const resetLink = `${CLIENT_URL()}/login?resetToken=${resetToken}`;
  const subject = 'Reset Your Trineo Stream Password';

  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Reset Link: ${resetLink}`);
    return;
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildResetEmailHtml({ name, email, resetLink })
    });

    if (error) {
      console.error(`[Resend] Failed to send reset email to ${email}:`, error);
    } else {
      console.log(`[Resend] Password reset email sent to ${email} (id: ${data?.id})`);
    }
  } catch (err) {
    console.error(`[Resend] Exception sending reset email to ${email}:`, err.message);
  }
}
