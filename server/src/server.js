import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import programRoutes from './routes/programRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import youtubeRoutes from './routes/youtubeRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import lessonManagementRoutes from './routes/lessonManagementRoutes.js';
import securityCenterRoutes from './routes/securityCenterRoutes.js';
import studentImportRoutes from './routes/studentImportRoutes.js';
import studentAccountRoutes from './routes/studentAccountRoutes.js';
import studentNotificationRoutes from './routes/studentNotificationRoutes.js';
import liveClassRoutes from './routes/liveClassRoutes.js';
import accessRoutes from './routes/accessRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import pushSubscriptionRoutes from './routes/pushSubscriptionRoutes.js';
import scheduledNotificationRoutes from './routes/scheduledNotificationRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import { startBackgroundScheduler } from './services/schedulerService.js';
import { checkSecurityPenalty } from './middleware/securityCheck.js';
import { protect, adminOnly } from './middleware/auth.js';
import { getInstituteYouTubeStatus } from './controllers/youtubeController.js';
import { requireActiveSubscription } from './middleware/requireActiveSubscription.js';

// Seed model imports
import { User } from './models/User.js';
import { Course } from './models/Course.js';
import { Lesson } from './models/Lesson.js';
import { Notification } from './models/Notification.js';
import { Institute } from './models/Institute.js';
import { Announcement } from './models/Announcement.js';
import { Faculty } from './models/Faculty.js';
import { Purchase } from './models/Purchase.js';
import { SubscriptionPlan } from './models/SubscriptionPlan.js';
import { SubscriptionPayment } from './models/SubscriptionPayment.js';



const bootStart = Date.now();
const app = express();

app.use(compression());
app.use(helmet({ contentSecurityPolicy: false })); // Harden headers against XSS and clickjacking
const allowedOrigins = [
  'https://trineo-streaming.vercel.app',
  'https://stream.trineo.in',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '3000mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: '3000mb', extended: true }));

// Ensure uploads/avatars and uploads/profile-pictures folders exist
const uploadDir = path.join(path.resolve(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const profilePicturesDir = path.join(path.resolve(), 'uploads', 'profile-pictures');
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

// API Routes
app.use([
  '/api/courses',
  '/api/programs',
  '/api/lessons',
  '/api/progress',
  '/api/videos',
  '/api/hls',
  '/api/materials',
  '/api/downloads',
  '/api/certificates'
], checkSecurityPenalty);

app.use('/api/onboarding', onboardingRoutes);
app.use('/api/auth', authRoutes);

// Apply active subscription enforcement to all LMS and student/admin endpoints
app.use([
  '/api/courses',
  '/api/programs',
  '/api/lessons',
  '/api/progress',
  '/api/videos',
  '/api/hls',
  '/api/materials',
  '/api/downloads',
  '/api/certificates',
  '/api/student',
  '/api/student-import',
  '/api/student-account',
  '/api/student-notifications',
  '/api/live-classes',
  '/api/access',
  '/api/scheduled-notifications'
], protect, requireActiveSubscription);

app.use('/api/courses', programRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/purchases', enrollmentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/videos', youtubeRoutes);
app.get('/api/youtube/status', protect, adminOnly, getInstituteYouTubeStatus);
app.use('/api/security', securityRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/lessons', lessonManagementRoutes);
app.use('/api/security-center', securityCenterRoutes);
app.use('/api/student-import', studentImportRoutes);
app.use('/api/student-account', studentAccountRoutes);
app.use('/api/student-notifications', studentNotificationRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes);
app.use('/api/scheduled-notifications', scheduledNotificationRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Seed Function
const seedData = async () => {
  try {
    // Seed Subscription Plans
    const plansCount = await SubscriptionPlan.countDocuments();
    if (plansCount === 0) {
      await SubscriptionPlan.insertMany([
        {
          name: 'Starter',
          description: 'Great for small teams starting their online academy.',
          price: 49,
          billingCycle: 'monthly',
          studentLimit: 100,
          storageLimit: 100,
          features: ['Core LMS', 'Course Builder', 'YouTube Status'],
          isActive: true
        },
        {
          name: 'Professional',
          description: 'Perfect for growing institutes requiring advanced video and live classes.',
          price: 149,
          billingCycle: 'monthly',
          studentLimit: 500,
          storageLimit: 500,
          features: ['Core LMS', 'Course Builder', 'YouTube Status', 'Video Uploads', 'Live Classes', 'Push Notifications'],
          isActive: true
        },
        {
          name: 'Enterprise',
          description: 'SaaS level scale for large organizations with custom limits.',
          price: 499,
          billingCycle: 'monthly',
          studentLimit: 2000,
          storageLimit: 2000,
          features: ['Core LMS', 'Course Builder', 'YouTube Status', 'Video Uploads', 'Live Classes', 'Push Notifications', 'Custom Domain', 'CRM Sync', 'Security Session Monitor'],
          isActive: true
        }
      ]);
      console.log('Seeded default SubscriptionPlans (Starter, Professional, Enterprise)');
    }

    // 0. Seed Default Institute
    let defaultInstitute = await Institute.findOne({ name: 'GFI Institute' });
    if (!defaultInstitute) {
      const enterprisePlan = await SubscriptionPlan.findOne({ name: 'Enterprise' });
      defaultInstitute = new Institute({
        name: 'GFI Institute',
        instituteId: 'inst_gfi',
        instituteCode: 'GFI001',
        subscriptionStatus: 'active',
        onboardingStatus: 'approved',
        planId: enterprisePlan ? enterprisePlan._id : null,
        apiKey: 'trn_gfi_9a8c7d6e5f4a',
        email: 'info@gfi.edu',
        contactPerson: 'Sarah Manager',
        phone: '1234567890',
        domain: 'gfi.edu',
        subscription: 'enterprise',
        status: 'active',
        logo: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=128&h=128&fit=crop',
        favicon: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=32&h=32&fit=crop',
        theme: {
          brandColor: '#7c3aed',
          secondaryColor: '#4f46e5'
        },
        supportEmail: 'support@gfi.edu',
        supportPhone: '+1 (555) 019-2834',
        branchName: 'Digital Campus',
        integration: {
          crmApiUrl: '',
          crmInstituteId: '',
          apiKeyHash: '',
          apiVersion: 'v1',
          syncEnabled: false,
          onboardingStatus: 'pending',
          successfulSyncCount: 0,
          failedSyncCount: 0,
          lastSuccessfulSyncAt: null
        }
      });
      await defaultInstitute.save();
      console.log('Seeded default Institute: GFI Institute (Code: GFI001, Plan: Enterprise, Status: active)');
    } else {
      let docModified = false;
      if (!defaultInstitute.instituteId || !defaultInstitute.apiKeyHash) {
        defaultInstitute.instituteId = defaultInstitute.instituteId || 'inst_gfi';
        if (!defaultInstitute.apiKeyHash) {
          defaultInstitute.apiKey = 'trn_gfi_9a8c7d6e5f4a';
        }
        docModified = true;
      }
      if (!defaultInstitute.integration) {
        defaultInstitute.integration = {
          crmApiUrl: '',
          crmInstituteId: '',
          apiKeyHash: '',
          apiVersion: 'v1',
          syncEnabled: false,
          onboardingStatus: 'pending',
          successfulSyncCount: 0,
          failedSyncCount: 0,
          lastSuccessfulSyncAt: null
        };
        docModified = true;
      }
      if (docModified) {
        await defaultInstitute.save();
        console.log('Updated existing GFI Institute with instituteId, apiKeyHash, and integration settings');
      }
    }

    // Migration: Update existing institutes that don't have integration settings
    const institutesToMigrate = await Institute.find({ integration: { $exists: false } });
    for (const inst of institutesToMigrate) {
      inst.integration = {
        crmApiUrl: '',
        crmInstituteId: '',
        apiKeyHash: '',
        apiVersion: 'v1',
        syncEnabled: false,
        onboardingStatus: 'pending',
        successfulSyncCount: 0,
        failedSyncCount: 0,
        lastSuccessfulSyncAt: null
      };
      await inst.save();
      console.log(`Migrated CRM integration settings for institute: ${inst.name}`);
    }

    // Migration: Fix existing users with invalid empty syncStatus
    const usersMigrated = await User.updateMany(
      { syncStatus: '' },
      { $set: { syncStatus: 'pending' } }
    );
    if (usersMigrated.modifiedCount > 0) {
      console.log(`Migrated syncStatus for ${usersMigrated.modifiedCount} users to 'pending'`);
    }

    // 1. Seed Users
    const ownerCount = await User.countDocuments({ role: 'owner' });
    if (ownerCount === 0) {
      const owner = new User({
        name: 'Trineo Owner',
        email: 'owner@trineo.io',
        password: 'owner123', // auto-hashed
        role: 'owner',
        phone: '9999999999'
      });
      await owner.save();
      console.log('Seeded Owner: owner@trineo.io / owner123');
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const admin = new User({
        name: 'Admin Manager',
        email: 'admin@institute.com',
        password: 'admin123', // auto-hashed
        role: 'admin',
        phone: '1234567890',
        institute: defaultInstitute._id
      });
      await admin.save();
      console.log('Seeded Admin: admin@institute.com / admin123');
    } else {
      // Ensure existing admin is linked
      await User.updateMany({ role: 'admin', institute: null }, { institute: defaultInstitute._id });
    }

    const studentCount = await User.countDocuments({ role: 'student' });
    if (studentCount === 0) {
      const student = new User({
        name: 'Alex Johnson',
        email: 'student@example.com',
        password: 'student123', // auto-hashed
        role: 'student',
        phone: '9876543210',
        institute: defaultInstitute._id,
        branchName: 'Digital Campus',
        batchName: '2026 Cohort A',
        courseName: 'Advanced React & TypeScript Masterclass',
        enrollmentDate: new Date('2026-01-15')
      });
      await student.save();
      console.log('Seeded Student: student@example.com / student123');
    } else {
      // Ensure existing student is linked
      await User.updateMany(
        { role: 'student', institute: null },
        {
          institute: defaultInstitute._id,
          branchName: 'Digital Campus',
          batchName: '2026 Cohort A',
          courseName: 'Advanced React & TypeScript Masterclass',
          enrollmentDate: new Date('2026-01-15')
        }
      );
    }

    // 2. Seed Courses
    const courseCount = await Course.countDocuments({});
    if (courseCount === 0) {
      const course1 = await Course.create({
        title: 'Advanced React & TypeScript Masterclass',
        description: 'Deep dive into React Hooks, Context, State Management, Custom Hooks, and TypeScript integration.',
        instructor: 'Sarah Johnson',
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
        price: 99,
        duration: '12h 45m',
        status: 'active',
        level: 'Advanced',
        category: 'Development',
        rating: 4.8,
        institute: defaultInstitute._id
      });

      const course2 = await Course.create({
        title: 'Python for Machine Learning & Data Science',
        description: 'Learn NumPy, Pandas, Scikit-Learn, and build real ML models from scratch.',
        instructor: 'Dr. Michael Chen',
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
        price: 79,
        duration: '18h 30m',
        status: 'active',
        level: 'Intermediate',
        category: 'Data Science',
        rating: 4.6,
        institute: defaultInstitute._id
      });

      const course3 = await Course.create({
        title: 'Modern UI/UX Design with Figma',
        description: 'Master component libraries, auto-layout, design systems, and advanced micro-interactions.',
        instructor: 'Emily Davis',
        thumbnail: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800',
        price: 49,
        duration: '8h 15m',
        status: 'active',
        level: 'Beginner',
        category: 'Design',
        rating: 4.5,
        institute: defaultInstitute._id
      });

      console.log('Seeded Courses successfully');

      // 3. Seed Lessons
      await Lesson.create({
        courseId: course1._id,
        title: 'Introduction to React Hooks',
        duration: '12:34',
        isLocked: false, // FREE PREVIEW
        youtubeVideoId: 'Ke90Tje7VS0',
        youtubeThumbnail: 'https://img.youtube.com/vi/Ke90Tje7VS0/hqdefault.jpg',
        youtubeDuration: '12:34',
        videoProvider: 'youtube',
        uploadStatus: 'ready',
        order: 1
      });

      await Lesson.create({
        courseId: course1._id,
        title: 'useState and useEffect Deep Dive',
        duration: '18:45',
        isLocked: true,
        youtubeVideoId: 'Ke90Tje7VS0',
        youtubeThumbnail: 'https://img.youtube.com/vi/Ke90Tje7VS0/hqdefault.jpg',
        youtubeDuration: '18:45',
        videoProvider: 'youtube',
        uploadStatus: 'ready',
        order: 2
      });

      await Lesson.create({
        courseId: course1._id,
        title: 'Custom Hooks Deep Dive',
        duration: '24:12',
        isLocked: true,
        youtubeVideoId: 'Ke90Tje7VS0',
        youtubeThumbnail: 'https://img.youtube.com/vi/Ke90Tje7VS0/hqdefault.jpg',
        youtubeDuration: '24:12',
        videoProvider: 'youtube',
        uploadStatus: 'ready',
        order: 3
      });

      console.log('Seeded Lessons successfully');

      // Seed Purchase record for Alex Johnson -> course1 so the student dashboard reflects the enrollment
      const seededStudent = await User.findOne({ email: 'student@example.com', role: 'student' });
      if (seededStudent) {
        const existingPurchase = await Purchase.findOne({ studentId: seededStudent._id, courseId: course1._id });
        if (!existingPurchase) {
          await Purchase.create({
            institute: defaultInstitute._id,
            studentId: seededStudent._id,
            courseId: course1._id,
            amount: 0,
            status: 'completed',
            purchasedAt: seededStudent.enrollmentDate || new Date()
          });
          console.log('Seeded Purchase record for Alex Johnson -> Advanced React & TypeScript Masterclass');
        }
      }

      await Notification.create({
        userId: null,
        message: 'Trineo Stream platform initialized and seeded successfully with YouTube Unlisted videos.',
        type: 'system'
      });
    } else {
      // Ensure existing courses are linked
      await Course.updateMany({ institute: null }, { institute: defaultInstitute._id });

      // Ensure existing students with courseName have matching Purchase records
      const studentsWithCourse = await User.find({ role: 'student', courseName: { $ne: '' } });
      for (const student of studentsWithCourse) {
        const matchedCourse = await Course.findOne({ title: student.courseName, institute: student.institute });
        if (matchedCourse) {
          const existingPurchase = await Purchase.findOne({ studentId: student._id, courseId: matchedCourse._id });
          if (!existingPurchase) {
            await Purchase.create({
              institute: student.institute,
              studentId: student._id,
              courseId: matchedCourse._id,
              amount: 0,
              status: 'completed',
              purchasedAt: student.enrollmentDate || new Date()
            });
            console.log(`Auto-created Purchase for ${student.name} -> ${matchedCourse.title}`);
          }
        }
      }
    }

    // 4. Seed Announcements
    const announcementCount = await Announcement.countDocuments({});
    if (announcementCount === 0) {
      await Announcement.create({
        title: 'Welcome to GFI Institute!',
        message: 'We are thrilled to welcome you to our digital learning portal. Explore your courses and start learning today.',
        author: 'Sarah Manager',
        institute: defaultInstitute._id
      });
      await Announcement.create({
        title: 'Upcoming Live Q&A Session',
        message: 'Join us this Friday at 5 PM UTC for a live Q&A session with Sarah Johnson on React state management.',
        author: 'Sarah Manager',
        institute: defaultInstitute._id
      });
      console.log('Seeded Announcements successfully');
    } else {
      // Ensure existing announcements are linked
      await Announcement.updateMany({ institute: null }, { institute: defaultInstitute._id });
    }

    // 5. Seed Faculty
    const facultyCount = await Faculty.countDocuments({});
    if (facultyCount === 0) {
      // Gather all distinct instructors from courses for this institute
      const courses = await Course.find({ institute: defaultInstitute._id });
      const instructorMap = {};
      for (const c of courses) {
        if (!instructorMap[c.instructor]) {
          instructorMap[c.instructor] = [];
        }
        instructorMap[c.instructor].push(c._id);
      }

      const facultyDefaults = {
        'Sarah Johnson': {
          role: 'Head of Department',
          department: 'Department of Software Architecture',
          email: 's.johnson@institute.edu',
          officeHours: 'Monday/Wednesday 2:00 PM - 4:00 PM',
          bio: 'Dedicated academic with 15+ years of software design research and CRM systems analysis.'
        },
        'Dr. Michael Chen': {
          role: 'Associate Professor',
          department: 'Department of Data Systems',
          email: 'm.chen@institute.edu',
          officeHours: 'Tuesday/Thursday 10:00 AM - 12:00 PM',
          bio: 'Pioneer in computing education with a research focus on automated stream analysis.'
        },
        'Emily Davis': {
          role: 'Senior Faculty Advisor',
          department: 'School of Design',
          email: 'e.davis@institute.edu',
          officeHours: 'Wednesday/Friday 1:00 PM - 3:00 PM',
          bio: 'Award-winning UX researcher specializing in design systems and interactive prototyping.'
        }
      };

      for (const [name, courseIds] of Object.entries(instructorMap)) {
        const defaults = facultyDefaults[name] || {
          role: 'Lecturer',
          department: 'General Studies',
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@institute.edu`,
          officeHours: 'By appointment',
          bio: ''
        };
        await Faculty.create({
          name,
          ...defaults,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
          institute: defaultInstitute._id,
          courses: courseIds
        });
      }
      console.log('Seeded Faculty successfully');
    }
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

// No FFmpeg. No HLS transcoding loop. YouTube integration is active.

const server = app.listen(PORT, async () => {
  const dbStart = Date.now();
  await connectDB();
  console.log(`[BOOT] Database connection took ${Date.now() - dbStart} ms`);
  
  const seedStart = Date.now();
  await seedData();
  console.log(`[BOOT] Database seeding took ${Date.now() - seedStart} ms`);
  
  startBackgroundScheduler();
  console.log(`[BOOT] Server startup listener execution took ${Date.now() - dbStart} ms`);
  console.log(`[BOOT] Total startup cold-start duration: ${Date.now() - bootStart} ms`);

  console.log(`\n=== Trineo Stream Server Started ===`);
  console.log(`Port        : ${PORT}`);
  console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log('TRINEO_SSO_SECRET exists:', !!process.env.TRINEO_SSO_SECRET);
  console.log(
    'TRINEO_SSO_SECRET hash:',
    crypto.createHash('sha256')
      .update(process.env.TRINEO_SSO_SECRET || '')
      .digest('hex')
      .substring(0, 16)
  );
  console.log(`\nRegistered API routes:`);
  app._router.stack
    .filter(r => r.route || (r.name === 'router' && r.handle.stack))
    .forEach(layer => {
      if (layer.route) {
        // Direct app-level route
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
        console.log(`  ${methods.padEnd(6)} ${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Mounted sub-router
        const prefix = layer.regexp.source
          .replace('^\\\/','/')
          .replace('(?=\\\/|$)','').replace('\\/?(?=\\\/|$)','').replace('\\','');
        layer.handle.stack.filter(r => r.route).forEach(r => {
          const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(',');
          console.log(`  ${methods.padEnd(6)} /api${r.route.path}`);
        });
      }
    });
  console.log(`\n✅ SSO endpoint : /api/auth/sso`);
  console.log(`=====================================\n`);
});

// Configure limitless timeout for large video processing
server.setTimeout(0);
