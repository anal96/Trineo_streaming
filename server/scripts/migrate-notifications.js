import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import { Notification } from '../src/models/Notification.js';
import { pathToFileURL } from 'node:url';

export const runNotificationMigration = async () => {
  await connectDB();

  console.log('[Migration] Fetching all notifications...');
  const notifications = await Notification.find({});
  console.log(`[Migration] Found ${notifications.length} notifications to examine.`);

  let userCount = 0;
  let adminRoleCount = 0;
  let studentRoleCount = 0;
  let broadcastCount = 0;
  let skippedCount = 0;

  for (const doc of notifications) {
    let targetType = doc.targetType;
    let targetRole = doc.targetRole;
    let updated = false;

    // Check if targetType is missing, or if it is 'user' but has no userId (which represents legacy global notifications)
    const needsMigration = !targetType || (targetType === 'user' && !doc.userId);

    if (needsMigration) {
      if (doc.userId) {
        targetType = 'user';
        userCount++;
        updated = true;
      } else {
        // userId is null -> classify based on contents
        const msg = (doc.message || '').toLowerCase();

        if (msg.includes('platform initialized') || msg.includes('seeded successfully')) {
          targetType = 'broadcast';
          broadcastCount++;
          updated = true;
        } else if (
          msg.includes('status updated') ||
          msg.includes('account created') ||
          msg.includes('enrolled in') ||
          msg.includes('access request')
        ) {
          targetType = 'role';
          targetRole = 'admin';
          adminRoleCount++;
          updated = true;
        } else {
          // Default to student role for all other legacy global notifications
          targetType = 'role';
          targetRole = 'student';
          studentRoleCount++;
          updated = true;
        }
      }
    } else {
      skippedCount++;
    }

    if (updated) {
      // Use updateOne to bypass mongoose document middleware save/insertMany hooks and avoid sending push notifications
      await Notification.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            targetType, 
            targetRole: targetRole || null 
          } 
        }
      );
    }
  }

  console.log('[Migration] Notification targeting backfill complete.');
  console.log(`[Migration] Results:
  - Migrated to targetType 'user': ${userCount}
  - Migrated to targetType 'role', targetRole 'admin': ${adminRoleCount}
  - Migrated to targetType 'role', targetRole 'student': ${studentRoleCount}
  - Migrated to targetType 'broadcast': ${broadcastCount}
  - Skipped (already migrated): ${skippedCount}
  `);

  process.exit(0);
};

if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runNotificationMigration().catch((error) => {
    console.error('[Migration] Failed:', error);
    process.exit(1);
  });
}
