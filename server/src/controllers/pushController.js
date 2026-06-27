import { User } from '../models/User.js';

/**
 * Registers/updates the FCM token for the authenticated user
 * POST /api/push/fcm/register
 */
export const registerFCM = async (req, res) => {
  console.log("========== FCM REGISTER ==========");
  console.log("Time:", new Date().toISOString());
  console.log("User:", req.user?._id);
  console.log("Authenticated:", !!req.user);
  console.log("Method:", req.method);
  console.log("Original URL:", req.originalUrl);
  console.log("Body:", req.body);
  console.log("Cookies:", req.headers?.cookie);
  console.log("Authorization:", req.headers?.authorization);
  console.log("==================================");
  try {
    const { token, platform, deviceName, appVersion, osVersion } = req.body;

    if (!token) {
      console.log("Returning HTTP 400");
      return res.status(400).json({ message: 'token is required' });
    }

    const userId = req.user._id;
    const tokenPreview = token ? (token.substring(0, 20) + (token.length > 20 ? '...' : '')) : 'none';

    console.log(`[FCM REGISTER]\nUser: ${userId}\nToken: ${tokenPreview}`);

    // Disassociate this token from any other user to prevent duplicate dispatches
    await User.updateMany(
      { fcmToken: token, _id: { $ne: userId } },
      {
        $set: {
          fcmToken: '',
          devicePlatform: '',
          deviceName: '',
          appVersion: '',
          osVersion: '',
          fcmUpdatedAt: null
        }
      }
    );

    // Update the current user
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[FCM REGISTER]\nUser: ${userId}\nToken: ${tokenPreview}\nSaved: false (User not found)`);
      console.log("Returning HTTP 404");
      return res.status(404).json({ message: 'User not found' });
    }

    user.fcmToken = token;
    user.devicePlatform = platform || '';
    user.deviceName = deviceName || '';
    user.appVersion = appVersion || '';
    user.osVersion = osVersion || '';
    user.fcmUpdatedAt = new Date();

    await user.save();

    console.log(`[FCM REGISTER]\nUser: ${userId}\nToken: ${tokenPreview}\nSaved: true`);

    console.log("Returning HTTP 200");
    res.status(200).json({
      message: 'FCM token registered successfully',
      registration: {
        fcmToken: user.fcmToken,
        devicePlatform: user.devicePlatform,
        deviceName: user.deviceName,
        appVersion: user.appVersion,
        osVersion: user.osVersion,
        fcmUpdatedAt: user.fcmUpdatedAt
      }
    });
  } catch (error) {
    const tokenPreview = req.body?.token ? (req.body.token.substring(0, 20) + (req.body.token.length > 20 ? '...' : '')) : 'none';
    console.log(`[FCM REGISTER]\nUser: ${req.user?._id}\nToken: ${tokenPreview}\nSaved: false`);
    console.error("FCM REGISTER ERROR:", error);
    console.error(error.stack);
    console.log("Returning HTTP 500");
    res.status(500).json({ message: error.message });
  }
};
