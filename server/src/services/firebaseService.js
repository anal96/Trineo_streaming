import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let firebaseApp = null;
let messaging = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  console.log("=== SERVICE ACCOUNT CHECK ===");
  console.log({
    type: serviceAccount.type,
    projectId: serviceAccount.project_id,
    hasPrivateKey: !!serviceAccount.private_key,
    privateKeyLength: serviceAccount.private_key?.length,
    clientEmail: serviceAccount.client_email
  });
  console.log("=== END SERVICE ACCOUNT CHECK ===");

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  const apps = getApps();
  if (apps.length === 0) {
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    firebaseApp = apps[0];
  }

  messaging = getMessaging(firebaseApp);

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
    const apps = getApps();
    if (apps.length > 0) {
      messaging = getMessaging(apps[0]);
    }
  }

  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized. Check service account configurations.');
  }

  const maskedMessage = { ...message };
  if (maskedMessage.token) {
    maskedMessage.token = maskedMessage.token.substring(0, 20) + (maskedMessage.token.length > 20 ? '...' : '');
  }
  console.log("FCM Payload:", JSON.stringify(maskedMessage, null, 2));

  console.log("Sending FCM...");
  try {
    const response = await messaging.send(message);
    console.log("Firebase Message ID:", response);
    return response;
  } catch (error) {
    console.error(error);
    console.error(error.code);
    console.error(error.message);
    console.error(error.stack);
    throw error;
  }
};

export { firebaseApp, messaging };
