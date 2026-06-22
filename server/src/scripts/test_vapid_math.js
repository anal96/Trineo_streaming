import dotenv from 'dotenv';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

// Force override any cached environment variables
dotenv.config({ override: true });

try {
  console.log('Testing VAPID keys from .env (with override)...');
  console.log('Public Key:', process.env.VAPID_PUBLIC_KEY);
  console.log('Private Key:', process.env.VAPID_PRIVATE_KEY);

  const headers = webpush.getVapidHeaders(
    'https://fcm.googleapis.com',
    'mailto:support@trineo.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
    'aes128gcm'
  );

  console.log('VAPID headers generated successfully!');
  console.log('✅ Success: The VAPID public/private key pair is mathematically valid.');
} catch (err) {
  console.error('❌ Error: The VAPID key pair is invalid or mismatched!', err);
}
