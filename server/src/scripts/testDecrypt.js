import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const encrypted = '04e95072c4949391c306d8d0:a85136a502954b2ff47809dfd065d2ac:ff46ceeb2f0674d37e726a78ae33678ad547628a13d1a08c0f6161b71e31ebb3826f9c28be655c8d3f214df5f0c2a2bebd3209b072cae280659549a33928c3cc2c4014c0cbcb560b9e43b733314e101f1f20af545d00959181eeeaae027dd574307bab548341d6';
const keys = [
  process.env.JWT_SECRET,
  'eduverse_premium_saas_crm_lms_secret_key_2026_xyz',
  'trineo_youtube_token_secret',
  'trineo_youtube_state_secret',
  'trineo_youtube_token_secret'
];
const [ivHex, tagHex, encryptedHex] = encrypted.split(':');
const fromHex = (v) => Buffer.from(v, 'hex');

for (const k of keys) {
  if (!k) continue;
  try {
    const key = crypto.createHash('sha256').update(k).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, fromHex(ivHex));
    decipher.setAuthTag(fromHex(tagHex));
    const decrypted = Buffer.concat([decipher.update(fromHex(encryptedHex)), decipher.final()]);
    console.log('Success with key:', k, '->', decrypted.toString('utf8'));
  } catch (err) {
    console.log('Failed with key:', k, '->', err.message);
  }
}
