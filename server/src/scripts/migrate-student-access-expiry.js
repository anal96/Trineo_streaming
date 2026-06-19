import 'dotenv/config';
import mongoose from 'mongoose';
import { StudentAccess } from '../models/StudentAccess.js';
import { connectDB } from '../config/db.js';

async function migrate() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const epochDate1 = new Date(0);
  const epochDate2 = new Date('1970-01-01T00:00:00.000Z');

  const query = {
    $or: [
      { expiryDate: null },
      { expiryDate: { $exists: false } },
      { expiryDate: epochDate1 },
      { expiryDate: epochDate2 }
    ]
  };

  const invalidRecords = await StudentAccess.find(query);
  console.log(`Found ${invalidRecords.length} StudentAccess records with missing or Unix Epoch expiryDate.`);

  if (invalidRecords.length > 0) {
    // Repair by setting a default expiry (30 days from now) and flag them by setting status to 'suspended'
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);

    const result = await StudentAccess.updateMany(
      query,
      {
        $set: {
          expiryDate: defaultExpiry,
          status: 'suspended'
        }
      }
    );
    console.log(`Successfully repaired/flagged ${result.modifiedCount} StudentAccess records. Set expiry to ${defaultExpiry.toLocaleDateString()} and status to 'suspended'.`);
  } else {
    console.log('No invalid StudentAccess records found.');
  }

  await mongoose.connection.close();
  console.log('Connection closed.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
