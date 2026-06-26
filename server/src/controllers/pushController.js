import { User } from '../models/User.js';

/**
 * Registers/updates the FCM token for the authenticated user
 * POST /api/push/fcm/register
 */
export const registerFCM = async (req, res) => {
  try {
    const { token, platform, deviceName, appVersion, osVersion } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'token is required' });
    }

    const userId = req.user._id;

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
      return res.status(404).json({ message: 'User not found' });
    }

    user.fcmToken = token;
    user.devicePlatform = platform || '';
    user.deviceName = deviceName || '';
    user.appVersion = appVersion || '';
    user.osVersion = osVersion || '';
    user.fcmUpdatedAt = new Date();

    await user.save();

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
    res.status(500).json({ message: error.message });
  }
};
