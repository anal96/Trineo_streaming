import nodemailer from 'nodemailer';

/**
 * Sends a welcome email containing credentials to a new student.
 * If SMTP environment variables are not present, it falls back to console logging.
 *
 * @param {string} name - Student name
 * @param {string} email - Student email
 * @param {string} temporaryPassword - The generated temporary password
 */
export async function sendStudentWelcomeEmail(name, email, temporaryPassword) {
  const subject = 'Welcome to Trineo Stream';
  const body = `Hello ${name},

Your Trineo Stream account has been created.

Email:
${email}

Temporary Password:
${temporaryPassword}

Login URL:
https://stream.trineo.in/login

For security reasons, you will be asked to change your password after your first login.

Regards,
Trineo Team`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Trineo Team" <noreply@trineo.in>',
        to: email,
        subject: subject,
        text: body
      });

      console.log(`Welcome email successfully sent to ${email} via SMTP.`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${email} via SMTP:`, error);
      console.log(`[EMAIL FALLBACK] To: ${email}\nSubject: ${subject}\n\n${body}`);
    }
  } else {
    console.log(`[EMAIL FALLBACK] To: ${email}\nSubject: ${subject}\n\n${body}`);
  }
}
