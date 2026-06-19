/**
 * Generates a secure temporary password matching the pattern Trineo@XXXX.
 * Output has minimum 8 characters (actually 11), includes uppercase, lowercase,
 * number, and special character.
 */
export function generateTemporaryPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Trineo@${digits}`;
}
