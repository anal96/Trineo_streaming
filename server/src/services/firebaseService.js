import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firebaseApp = null;
let messaging = null;

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      firebaseApp = admin.app();
    }
    messaging = admin.messaging(firebaseApp);
    console.log('[Firebase] Successfully initialized Firebase Admin SDK from environment JSON');
  } catch (error) {
    console.error('[Firebase] ERROR: Failed to parse or initialize Firebase Admin from JSON env:', error);
  }
} else if (serviceAccountPath) {
  try {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      if (admin.apps.length === 0) {
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        firebaseApp = admin.app();
      }
      messaging = admin.messaging(firebaseApp);
      console.log(`[Firebase] Successfully initialized Firebase Admin SDK from file ${resolvedPath}`);
    } else {
      console.warn(`[Firebase] WARNING: Service account file not found at path: ${resolvedPath}`);
    }
  } catch (error) {
    console.error('[Firebase] ERROR: Failed to initialize Firebase Admin SDK from file path:', error);
  }
} else {
  console.warn('[Firebase] WARNING: Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FIREBASE_SERVICE_ACCOUNT environment variable is defined');
}

// Test hook to allow overriding messaging.send in tests
let mockSendFn = null;
export const setMockSendFn = (fn) => {
  mockSendFn = fn;
};

/**
 * Sends a notification using Firebase Cloud Messaging
 * @param {object} message FCM message payload
 * @returns {Promise<string>} Firebase response containing the message ID
 */
export const sendFCMNotification = async (message) => {
  if (mockSendFn) {
    return await mockSendFn(message);
  }

  if (!messaging) {
    // If not initialized, try to see if we can get it or if we are under tests
    if (admin.apps.length > 0) {
      messaging = admin.messaging(admin.apps[0]);
    }
  }

  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized. Check service account configurations.');
  }

  return await messaging.send(message);
};

export { firebaseApp, messaging };
