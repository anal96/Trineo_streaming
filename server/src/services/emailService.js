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

// ─── Onboarding & SaaS Billing Emails ────────────────────────────────────────

function buildOnboardingSubmittedHtml({ name, planName }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Application Received – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="logo-text">🎓 Trineo Stream</p>
        <p class="logo-sub">SaaS Application Center</p>
      </div>
      <div class="body">
        <h1 class="title">Application Received! 📝</h1>
        <p class="subtitle">Thank you for registering your institute with Trineo Stream.</p>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Contact Person</span>
            <span class="info-value">${name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Selected Plan</span>
            <span class="info-value font-semibold text-violet-400">${planName}</span>
          </div>
        </div>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
          Our platform owner is review processing your registration details. You will receive an email immediately once your application is approved and your 14-day trial is active.
        </p>
      </div>
      <div class="footer">
        <p>Trineo Stream SaaS platform onboarding center</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOnboardingSubmittedEmail(email, name, planName) {
  const subject = 'Trineo Stream Onboarding Application Received';
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Plan: ${planName}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildOnboardingSubmittedHtml({ name, planName })
    });
  } catch (err) {
    console.error(`[Resend] Onboarding submit email error:`, err.message);
  }
}

function buildOnboardingApprovedHtml({ name, instituteCode, email, temporaryPassword }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Application Approved – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="logo-text">🎓 Trineo Stream</p>
        <p class="logo-sub">SaaS Activation Center</p>
      </div>
      <div class="body">
        <h1 class="title">Welcome to Trineo Stream! 🎉</h1>
        <p class="subtitle">Your institute has been approved and your 14-day free trial is now active.</p>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Institute Code</span>
            <span class="info-value mono">${instituteCode}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Administrator User</span>
            <span class="info-value">${email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Temporary Password</span>
            <span class="info-value mono">${temporaryPassword}</span>
          </div>
        </div>
        <a href="${CLIENT_URL()}/login" class="cta-btn">Access Your Console Now →</a>
        <div class="notice">
          <p>
            <strong>💡 Next Steps:</strong> Log in using the details above. Enter your <strong>Institute Code</strong> and credentials to setup your brand, add courses, and onboard faculty.
          </p>
        </div>
      </div>
      <div class="footer">
        <p>Trineo Stream SaaS platform activation center</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOnboardingApprovedEmail(email, name, instituteCode, temporaryPassword) {
  const subject = 'Your Trineo Stream SaaS Onboarding Application Has Been Approved!';
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Code: ${instituteCode} | Temp Password: ${temporaryPassword}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildOnboardingApprovedHtml({ name, instituteCode, email, temporaryPassword })
    });
  } catch (err) {
    console.error(`[Resend] Onboarding approval email error:`, err.message);
  }
}

function buildOnboardingRejectedHtml({ name, reason }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Application Status – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
        <p class="logo-text">🎓 Trineo Stream</p>
        <p class="logo-sub">Application Review</p>
      </div>
      <div class="body">
        <h1 class="title">Application Update</h1>
        <p class="subtitle">Thank you for your interest in Trineo Stream.</p>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          After reviewing your onboarding request, our team has declined your registration at this time.
        </p>
        <div class="info-card" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
          <span class="info-label" style="color: #f87171;">Reason for rejection:</span>
          <p style="color: #ffffff; font-size: 14px; font-weight: 500; margin: 8px 0 0;">${reason || 'Details incomplete or did not meet onboarding requirements.'}</p>
        </div>
        <p style="color: rgba(255,255,255,0.5); font-size: 13px;">
          If you have questions, please reach out to our platform administrators.
        </p>
      </div>
      <div class="footer">
        <p>Trineo Stream SaaS platform onboarding center</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOnboardingRejectedEmail(email, name, reason) {
  const subject = 'Update Regarding Your Trineo Stream Application';
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Reason: ${reason}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildOnboardingRejectedHtml({ name, reason })
    });
  } catch (err) {
    console.error(`[Resend] Onboarding rejection email error:`, err.message);
  }
}

function buildBillingInvoiceHtml({ name, invoiceNumber, amount, dueDate }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Invoice – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="logo-text">🎓 Trineo Stream</p>
        <p class="logo-sub">Billing Department</p>
      </div>
      <div class="body">
        <h1 class="title">SaaS Invoice Generated 💳</h1>
        <p class="subtitle">An invoice has been generated for your institute subscription.</p>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Invoice Number</span>
            <span class="info-value mono">${invoiceNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Amount Due</span>
            <span class="info-value font-bold text-violet-400">$${amount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Due Date</span>
            <span class="info-value font-semibold text-amber-400">${new Date(dueDate).toLocaleDateString()}</span>
          </div>
        </div>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
          Please complete your payment via cash, bank transfer, or UPI, and share the receipt with your account manager. Your administrator can then record the payment manually to renew the subscription.
        </p>
      </div>
      <div class="footer">
        <p>Trineo Stream Billing Support</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendBillingInvoiceEmail(email, name, invoiceNumber, amount, dueDate) {
  const subject = `Invoice ${invoiceNumber} Due – Trineo Stream Subscription`;
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Invoice: ${invoiceNumber} | Amount: $${amount} | Due: ${dueDate}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildBillingInvoiceHtml({ name, invoiceNumber, amount, dueDate })
    });
  } catch (err) {
    console.error(`[Resend] Billing invoice email error:`, err.message);
  }
}

function buildGracePeriodHtml({ name, amount, graceEndDate }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Subscription Grace Period – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        <p class="logo-text">⚠️ Trineo Stream</p>
        <p class="logo-sub">Grace Period Active</p>
      </div>
      <div class="body">
        <h1 class="title">Grace Period Initiated</h1>
        <p class="subtitle">Your subscription invoice of $${amount} remains unpaid.</p>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Your institute has entered a 2-day grace period. Access will remain active temporarily, but will be suspended automatically if payment is not logged by the grace period end date.
        </p>
        <div class="info-card" style="border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05);">
          <div class="info-row">
            <span class="info-label" style="color: #fbbf24;">Grace Ends On</span>
            <span class="info-value font-bold text-red-400">${new Date(graceEndDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>Trineo Stream Billing Support</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendGracePeriodEmail(email, name, amount, graceEndDate) {
  const subject = 'Warning: Trineo Stream Subscription Grace Period Active';
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    console.log(`Amount: $${amount} | Grace Ends: ${graceEndDate}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildGracePeriodHtml({ name, amount, graceEndDate })
    });
  } catch (err) {
    console.error(`[Resend] Grace period email error:`, err.message);
  }
}

function buildSuspensionHtml({ name }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Subscription Suspended – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%);">
        <p class="logo-text">🚫 Trineo Stream</p>
        <p class="logo-sub">Subscription Suspended</p>
      </div>
      <div class="body">
        <h1 class="title">Access Suspended</h1>
        <p class="subtitle">Your institute subscription has been suspended due to non-payment.</p>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          All student logins, administrator portals, streaming capabilities, and curriculum controls are currently disabled. Please contact your platform owner to resolve the outstanding invoice and restore access.
        </p>
      </div>
      <div class="footer">
        <p>Trineo Stream Billing Support</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendSuspensionEmail(email, name) {
  const subject = 'Alert: Trineo Stream Institute Subscription Suspended';
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildSuspensionHtml({ name })
    });
  } catch (err) {
    console.error(`[Resend] Suspension email error:`, err.message);
  }
}

function buildReactivationHtml({ name }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Subscription Restored – Trineo Stream</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #064e3b 100%);">
        <p class="logo-text">✅ Trineo Stream</p>
        <p class="logo-sub">Subscription Restored</p>
      </div>
      <div class="body">
        <h1 class="title">Subscription Restored! 🚀</h1>
        <p class="subtitle">Your payment has been recorded and full platform access is restored.</p>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Thank you for your payment. Your institute dashboard, student portals, and video services are fully operational again.
        </p>
        <a href="${CLIENT_URL()}/login" class="cta-btn" style="background: linear-gradient(135deg, #10b981, #059669);">Go to Console Now →</a>
      </div>
      <div class="footer">
        <p>Trineo Stream Billing Support</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendReactivationEmail(email, name) {
  const subject = 'Success: Trineo Stream Subscription Restored';
  if (!isResendConfigured()) {
    console.log(`[EMAIL FALLBACK — RESEND NOT CONFIGURED]`);
    console.log(`To: ${email} | Subject: ${subject}`);
    return;
  }
  try {
    await getResend().emails.send({
      from: EMAIL_FROM(),
      to: [email],
      subject,
      html: buildReactivationHtml({ name })
    });
  } catch (err) {
    console.error(`[Resend] Reactivation email error:`, err.message);
  }
}

