import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Lesson } from '../models/Lesson.js';
import { Course } from '../models/Course.js';
import { Institute } from '../models/Institute.js';
import { getVideoMetadata } from '../utils/youtubeService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';
const YOUTUBE_TOKEN_ENCRYPTION_KEY = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'trineo_youtube_token_secret';

const fromHex = (value) => Buffer.from(value, 'hex');

const decryptRefreshToken = (payload) => {
  if (!payload) return '';
  const [ivHex, tagHex, encryptedHex] = String(payload).split(':');
  if (!ivHex || !tagHex || !encryptedHex) return '';
  
  const attemptDecryption = (keyStr) => {
    const key = crypto.createHash('sha256').update(keyStr).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, fromHex(ivHex));
    decipher.setAuthTag(fromHex(tagHex));
    const decrypted = Buffer.concat([decipher.update(fromHex(encryptedHex)), decipher.final()]);
    return decrypted.toString('utf8');
  };

  try {
    return attemptDecryption(YOUTUBE_TOKEN_ENCRYPTION_KEY);
  } catch (err) {
    if (YOUTUBE_TOKEN_ENCRYPTION_KEY !== 'trineo_youtube_token_secret') {
      try {
        return attemptDecryption('trineo_youtube_token_secret');
      } catch (_fallbackErr) {
        // Both failed
      }
    }
    throw err;
  }
};

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    console.log('Normalizing lesson institute fields...');
    const allNullInstLessons = await Lesson.find({ institute: null });
    let normalizedCount = 0;
    for (const lesson of allNullInstLessons) {
      const course = await mongoose.model('Course').findById(lesson.courseId);
      if (course && course.institute) {
        await Lesson.updateOne({ _id: lesson._id }, { $set: { institute: course.institute } });
        normalizedCount++;
      }
    }
    console.log(`Normalized ${normalizedCount} lessons with missing institute fields.`);

    // Find all lessons with youtubeVideoId and duration missing/0
    const query = {
      youtubeVideoId: { $exists: true, $ne: null, $ne: '', $ne: 'null' },
      $or: [
        { durationSeconds: 0 },
        { durationSeconds: { $exists: false } },
        { duration: '0:00' },
        { duration: { $exists: false } }
      ]
    };

    const lessons = await Lesson.find(query);
    console.log(`Found ${lessons.length} lessons requiring duration backfill.`);

    if (lessons.length === 0) {
      console.log('No lessons require backfilling.');
      process.exit(0);
    }

    const instituteContexts = {};
    const getRefreshToken = async (instituteId) => {
      if (!instituteId) return null;
      const key = instituteId.toString();
      if (instituteContexts[key] !== undefined) return instituteContexts[key];

      try {
        const institute = await Institute.findById(instituteId).select('+youtubeRefreshToken');
        if (institute && institute.youtubeConnected && institute.youtubeRefreshToken) {
          instituteContexts[key] = decryptRefreshToken(institute.youtubeRefreshToken);
        } else {
          instituteContexts[key] = null;
        }
      } catch (err) {
        console.error(`Error loading refresh token for institute ${instituteId}:`, err.message);
        instituteContexts[key] = null;
      }
      return instituteContexts[key];
    };

    let repairedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      console.log(`[${i + 1}/${lessons.length}] Syncing lesson: "${lesson.title}" (ID: ${lesson._id}, YT ID: ${lesson.youtubeVideoId})`);

      try {
        const refreshToken = await getRefreshToken(lesson.institute);
        const meta = await getVideoMetadata(lesson.youtubeVideoId, refreshToken);

        const youtubeDuration = meta.duration || lesson.youtubeDuration || lesson.duration;
        const duration = meta.duration || lesson.duration || lesson.youtubeDuration;
        const durationSeconds = meta.durationSeconds || lesson.durationSeconds || 0;
        const updateSet = { youtubeDuration, duration, durationSeconds };
        if (meta.thumbnail && (!lesson.youtubeThumbnail || lesson.youtubeThumbnail.includes('placeholder'))) {
          updateSet.youtubeThumbnail = meta.thumbnail;
        }
        await Lesson.updateOne({ _id: lesson._id }, { $set: updateSet });
        console.log(`  -> SUCCESS: Synced duration: "${lesson.duration}" (${lesson.durationSeconds}s)`);
        repairedCount++;
      } catch (err) {
        console.error(`  -> FAILED: ${err.message}`);
        failedCount++;
      }
    }

    console.log('\n--- Backfill Completed ---');
    console.log(`Total checked: ${lessons.length}`);
    console.log(`Successfully repaired: ${repairedCount}`);
    console.log(`Failed/skipped: ${failedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal backfill error:', err);
    process.exit(1);
  }
};

run();
