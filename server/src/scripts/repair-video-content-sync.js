import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Content } from '../models/Content.js';
import { VideoAsset } from '../models/VideoAsset.js';

async function runRepair() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const videoContents = await Content.find({ type: 'video', isDeleted: false });
  console.log(`Found ${videoContents.length} video Content records in DB.`);

  let totalChecked = 0;
  let totalFixed = 0;
  let remainingBroken = 0;

  for (const content of videoContents) {
    totalChecked++;

    // Case 1: Content has a linked VideoAsset
    if (content.videoAssetId) {
      const asset = await VideoAsset.findById(content.videoAssetId);
      if (!asset) {
        console.log(`Content ${content._id} references videoAssetId ${content.videoAssetId} which does not exist in DB.`);
        if (content.uploadStatus !== 'ready') {
          remainingBroken++;
        }
        continue;
      }

      if (asset.uploadStatus === 'ready') {
        let needsFix = false;
        const oldStatus = content.uploadStatus;

        if (content.uploadStatus !== 'ready') {
          content.uploadStatus = 'ready';
          needsFix = true;
        }
        if (asset.youtubeVideoId && content.youtubeVideoId !== asset.youtubeVideoId) {
          content.youtubeVideoId = asset.youtubeVideoId;
          needsFix = true;
        }
        if (asset.youtubeThumbnail && content.youtubeThumbnail !== asset.youtubeThumbnail) {
          content.youtubeThumbnail = asset.youtubeThumbnail;
          needsFix = true;
        }
        if (asset.youtubeDuration && content.youtubeDuration !== asset.youtubeDuration) {
          content.youtubeDuration = asset.youtubeDuration;
          needsFix = true;
        }

        if (needsFix) {
          await content.save();
          console.log(`[REPAIRED] Content ${content._id} (linked to Asset): set to ready, youtubeVideoId=${content.youtubeVideoId}`);
          console.log(`[VIDEO-SYNC]\ncontentId: ${content._id}\nvideoAssetId: ${asset._id}\noldStatus: ${oldStatus}\nnewStatus: ready`);
          totalFixed++;
        }
      } else {
        console.log(`VideoAsset ${asset._id} is not ready (Status: ${asset.uploadStatus}).`);
        if (content.uploadStatus !== 'ready') {
          remainingBroken++;
        }
      }
    }
    // Case 2: Seeded Content record with NO VideoAsset, but contains a youtubeVideoId
    else if (content.youtubeVideoId) {
      if (content.uploadStatus !== 'ready') {
        const oldStatus = content.uploadStatus;
        content.uploadStatus = 'ready';
        
        // Auto populate standard youtube thumbnail if missing
        if (!content.youtubeThumbnail) {
          content.youtubeThumbnail = `https://i.ytimg.com/vi/${content.youtubeVideoId}/hqdefault.jpg`;
        }
        
        await content.save();
        console.log(`[REPAIRED] Seeded Content ${content._id} (no Asset): set to ready, youtubeVideoId=${content.youtubeVideoId}`);
        console.log(`[VIDEO-SYNC]\ncontentId: ${content._id}\nvideoAssetId: null\noldStatus: ${oldStatus}\nnewStatus: ready`);
        totalFixed++;
      }
    }
    // Case 3: No VideoAsset and no youtubeVideoId
    else {
      console.log(`Content ${content._id} has no linked VideoAsset and no youtubeVideoId.`);
      remainingBroken++;
    }
  }

  console.log('\n========================================');
  console.log(`Total Checked: ${totalChecked}`);
  console.log(`Total Fixed: ${totalFixed}`);
  console.log(`Remaining Broken: ${remainingBroken}`);
  console.log('========================================');

  await mongoose.connection.close();
}

runRepair().catch(err => {
  console.error(err);
  process.exit(1);
});
