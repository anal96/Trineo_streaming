import admin from "firebase-admin";

let firebaseApp = null;
let messaging = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    firebaseApp = admin.app();
  }

  messaging = admin.messaging(firebaseApp);

  console.log("[Firebase] Firebase Admin initialized successfully.");
} catch (err) {
  console.error("[Firebase] Failed to initialize Firebase Admin:", err);
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
