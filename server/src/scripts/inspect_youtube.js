import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Institute } from '../models/Institute.js';
import { verifyYouTubeTokenHealth } from '../utils/youtubeService.js';

const main = async () => {
  await connectDB();

  console.log('Fetching GFI Institute (Code: GFI001)...');
  let inst = await Institute.findOne({ instituteCode: 'GFI001' })
    .select('+youtubeRefreshToken')
    .select('+refreshToken')
    .select('+accessToken')
    .select('+youtubeAccessToken')
    .select('+youtubeTokenExpiry')
    .select('+tokenExpiry');

  if (!inst) {
    console.error('GFI Institute not found.');
    await mongoose.connection.close();
    return;
  }

  console.log('\n--- Before Verification Health Check ---');
  console.log('youtubeConnected:', inst.youtubeConnected);
  console.log('youtubeChannelName:', inst.youtubeChannelName);
  console.log('youtubeRefreshToken exists?:', !!inst.youtubeRefreshToken);
  console.log('youtubeAccessToken exists?:', !!inst.youtubeAccessToken);
  console.log('youtubeTokenExpiry:', inst.youtubeTokenExpiry);

  console.log('\n--- Running verifyYouTubeTokenHealth(inst) ---');
  const isHealthy = await verifyYouTubeTokenHealth(inst);
  console.log('Result (isHealthy):', isHealthy);

  // Re-fetch from DB to confirm changes persisted
  console.log('\n--- Re-fetching from Database ---');
  const updatedInst = await Institute.findOne({ instituteCode: 'GFI001' })
    .select('+youtubeRefreshToken')
    .select('+refreshToken')
    .select('+accessToken')
    .select('+youtubeAccessToken');

  console.log('youtubeConnected:', updatedInst.youtubeConnected);
  console.log('youtubeChannelName:', updatedInst.youtubeChannelName); // Should still exist
  console.log('youtubeRefreshToken exists?:', !!updatedInst.youtubeRefreshToken); // Should be empty/false
  console.log('youtubeAccessToken exists?:', !!updatedInst.youtubeAccessToken); // Should be empty/false

  await mongoose.connection.close();
};

main();
