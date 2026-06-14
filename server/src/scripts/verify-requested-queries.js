import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

async function checkRequestedData() {
  await connectDB();

  // 1. db.users.find({ syncStatus: "" })
  const emptyUsers = await User.find({ syncStatus: '' }).select('email name syncStatus');
  console.log(`\n--- db.users.find({ syncStatus: "" }) ---`);
  console.log(`Found ${emptyUsers.length} records.`);
  emptyUsers.forEach(u => {
    console.log(`Name: ${u.name}, Email: ${u.email}, syncStatus: "${u.syncStatus}"`);
  });

  // 2. db.users.findOne({ email: "owner@trineo.io" })
  const owner = await User.findOne({ email: 'owner@trineo.io' });
  console.log(`\n--- db.users.findOne({ email: "owner@trineo.io" }) ---`);
  if (owner) {
    console.log(`Name: ${owner.name}`);
    console.log(`Email: ${owner.email}`);
    console.log(`syncStatus: "${owner.syncStatus}"`);
  } else {
    console.log(`User owner@trineo.io not found.`);
  }

  await mongoose.connection.close();
}

checkRequestedData().catch(err => {
  console.error(err);
  process.exit(1);
});
