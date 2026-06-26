import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firebaseApp = null;
let messaging = null;

let serviceAccountPath = path.resolve('server/config/firebase-service-account.json');
if (process.cwd().endsWith('server') || (fs.existsSync('package.json') && JSON.parse(fs.readFileSync('package.json', 'utf8')).name === 'eduverse-api')) {
  serviceAccountPath = path.resolve('config/firebase-service-account.json');
}

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      firebaseApp = admin.app();
    }
    messaging = admin.messaging(firebaseApp);
    console.log(`[Firebase] Successfully initialized Firebase Admin SDK from file ${serviceAccountPath}`);
  } else {
    console.error(`[Firebase] STARTUP ERROR: Firebase Service Account file is missing at expected path: ${serviceAccountPath}. Please place the firebase-service-account.json file in the server/config/ directory.`);
  }
} catch (error) {
  console.error(`[Firebase] STARTUP ERROR: Failed to initialize Firebase Admin SDK from ${serviceAccountPath}:`, error.message);
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
