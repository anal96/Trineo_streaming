import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { StudentAccess } from '../models/StudentAccess.js';
import { Institute } from '../models/Institute.js';
import { connectDB } from '../config/db.js';

// Shared status calculation logic matching accessController.js
function calculateAccessStatus(userStatus, expiryDate) {
  if (userStatus === 'inactive') return 'suspended';
  if (!expiryDate) return 'active';
  return new Date(expiryDate) < new Date() ? 'expired' : 'active';
}

async function migrate() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const students = await User.find({ role: 'student' });
  let studentsScanned = students.length;
  let recordsUpdated = 0;
  let expiredRecordsFixed = 0;
  let unlimitedAccessRecordsFixed = 0;

  for (const student of students) {
    const studentAccessRecords = await StudentAccess.find({ studentId: student._id });
    for (const record of studentAccessRecords) {
      const userExpiryStr = student.packageExpiryDate ? new Date(student.packageExpiryDate).toISOString() : null;
      const recordExpiryStr = record.expiryDate ? new Date(record.expiryDate).toISOString() : null;

      const targetStatus = calculateAccessStatus(student.status, student.packageExpiryDate);

      // Check if there is a mismatch in expiryDate or status
      if (userExpiryStr !== recordExpiryStr || record.status !== targetStatus) {
        record.expiryDate = student.packageExpiryDate;
        record.status = targetStatus;
        await record.save();

        recordsUpdated++;
        if (targetStatus === 'expired') {
          expiredRecordsFixed++;
        }
        if (!student.packageExpiryDate) {
          unlimitedAccessRecordsFixed++;
        }
      }
    }
  }

  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Students Scanned: ${studentsScanned}`);
  console.log(`Records Updated: ${recordsUpdated}`);
  console.log(`Expired Records Fixed: ${expiredRecordsFixed}`);
  console.log(`Unlimited Access Records Fixed: ${unlimitedAccessRecordsFixed}`);

  await mongoose.connection.close();
  console.log('Connection closed.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
