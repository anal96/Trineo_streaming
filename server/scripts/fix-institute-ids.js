import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Institute } from '../src/models/Institute.js';

async function run() {
  await connectDB();
  console.log('Starting migration...');

  // 1. Drop old index studentId_1_instituteId_1
  try {
    await mongoose.connection.collection('users').dropIndex('studentId_1_instituteId_1');
    console.log('Dropped index studentId_1_instituteId_1 successfully.');
  } catch (err) {
    console.log('Index studentId_1_instituteId_1 drop note (likely did not exist):', err.message);
  }

  // 2. Ensure default institute exists & set instituteId to 'inst_gfi'
  let defaultInstitute = await Institute.findOne({ name: 'GFI Institute' });
  if (!defaultInstitute) {
    defaultInstitute = await Institute.findOne({});
  }
  if (!defaultInstitute) {
    defaultInstitute = new Institute({
      name: 'GFI Institute',
      email: 'info@gfi.edu',
      domain: 'gfi.edu',
      subscription: 'enterprise',
      status: 'active'
    });
  }
  
  defaultInstitute.instituteId = 'inst_gfi';
  // If status is suspended locally, make it active so they can log in
  if (defaultInstitute.status === 'suspended') {
    defaultInstitute.status = 'active';
  }
  await defaultInstitute.save();
  console.log(`Ensured Institute: ${defaultInstitute.name} has instituteId: "${defaultInstitute.instituteId}"`);

  // 3. Backfill all users to have institute and instituteId set to 'inst_gfi'
  const users = await User.find({});
  let updatedCount = 0;
  for (const user of users) {
    user.institute = defaultInstitute._id;
    user.instituteId = 'inst_gfi';
    // Ensure studentId is not undefined
    if (user.studentId === undefined) {
      user.studentId = '';
    }
    await user.save();
    updatedCount++;
  }

  // 4. Rebuild indexes
  console.log('Rebuilding indexes...');
  await User.syncIndexes();
  console.log('Indexes Rebuilt: Success');

  console.log(`\nUsers Updated: ${updatedCount}`);
  console.log('Indexes Rebuilt: Success');
  console.log('Migration Complete');

  mongoose.connection.close();
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
