import mongoose from 'mongoose';
import { LiveClass } from '../models/LiveClass.js';
import { ScheduledNotification } from '../models/ScheduledNotification.js';
import { Notification } from '../models/Notification.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { Lesson } from '../models/Lesson.js';
import { Institute } from '../models/Institute.js';
import { AuditLog } from '../models/AuditLog.js';
import { SubscriptionInvoice } from '../models/SubscriptionInvoice.js';
import { InvoiceAudit } from '../models/InvoiceAudit.js';
import { downloadFromR2, parseR2Key, isR2Configured } from '../utils/r2Service.js';
import { sendGracePeriodEmail, sendSuspensionEmail, sendBillingInvoiceEmail } from './emailService.js';

export const startBackgroundScheduler = () => {
  console.log('Background Notification Scheduler Initialized (interval: 60s)');
  
  setInterval(async () => {
    try {
      const now = new Date();

      // 0. SaaS Subscription Lifecycle Jobs

      // A. Unpaid Invoices Due Date Checker
      const overdueInvoices = await SubscriptionInvoice.find({
        status: 'pending',
        dueDate: { $lte: now }
      });

      for (const invoice of overdueInvoices) {
        invoice.status = 'overdue';
        invoice.notesTimeline.push({
          event: 'Payment Due',
          details: 'Invoice due date reached. Status changed to overdue.',
          timestamp: now
        });
        await invoice.save();

        await InvoiceAudit.create({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          instituteId: invoice.instituteId,
          action: 'Payment Due',
          timestamp: now,
          details: 'Invoice due date passed. Status set to overdue.'
        });

        // Transition Institute status to payment_due if active
        const inst = await Institute.findById(invoice.instituteId);
        if (inst && inst.subscriptionStatus === 'active') {
          inst.subscriptionStatus = 'payment_due';
          await inst.save();

          await AuditLog.create({
            institute: inst._id,
            eventType: 'PAYMENT_DUE',
            details: `Invoice ${invoice.invoiceNumber} is overdue. Status set to payment_due.`,
            ipAddress: '127.0.0.1',
            userAgent: 'System Scheduler'
          });
          console.log(`[Scheduler] Invoice ${invoice.invoiceNumber} overdue. Institute ${inst.name} set to payment_due.`);
        }
      }

      // B. Transition payment_due to grace_period (2-Day Grace)
      const dueForGrace = await Institute.find({
        subscriptionStatus: 'payment_due'
      });

      for (const inst of dueForGrace) {
        inst.gracePeriodEndDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days grace
        inst.subscriptionStatus = 'grace_period';
        await inst.save();

        await AuditLog.create({
          institute: inst._id,
          eventType: 'PAYMENT_DUE',
          details: `Grace period initiated. Ends on ${inst.gracePeriodEndDate.toLocaleDateString()}.`,
          ipAddress: '127.0.0.1',
          userAgent: 'System Scheduler'
        });

        // Find the overdue invoice to attach
        const invoice = await SubscriptionInvoice.findOne({
          instituteId: inst._id,
          status: { $in: ['pending', 'overdue'] }
        }).sort({ dueDate: -1 });

        let pdfBuffer = null;
        if (invoice) {
          try {
            if (isR2Configured()) {
              const key = parseR2Key(invoice.generatedPdfUrl);
              pdfBuffer = await downloadFromR2(key);
            }
          } catch (err) {
            console.error(`[Scheduler] Failed to download invoice PDF for grace period email: ${err.message}`);
          }
        }

        const emailTo = inst.billingContactEmail || inst.email;
        sendGracePeriodEmail(
          emailTo,
          inst.billingContactName || inst.contactPerson,
          invoice ? invoice.totalAmountSnapshot : 0,
          inst.gracePeriodEndDate,
          invoice ? invoice.invoiceNumber : '',
          pdfBuffer
        ).catch(err => {
          console.error('[Resend Grace Period Email Error]', err);
        });

        if (invoice) {
          invoice.notesTimeline.push({
            event: 'Grace Period Started',
            details: `Grace period initiated. Ends on ${inst.gracePeriodEndDate.toLocaleDateString()}.`,
            timestamp: now
          });
          await invoice.save();

          await InvoiceAudit.create({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            instituteId: inst._id,
            action: 'Grace Period Started',
            timestamp: now,
            details: `2-Day grace period started, ending on ${inst.gracePeriodEndDate.toLocaleDateString()}`
          });
        }
        console.log(`[Scheduler] Grace period started for institute: ${inst.name} (Ends: ${inst.gracePeriodEndDate.toLocaleDateString()})`);
      }

      // C. Transition expired grace_period to suspended
      const dueForSuspension = await Institute.find({
        subscriptionStatus: 'grace_period',
        gracePeriodEndDate: { $lte: now }
      });

      for (const inst of dueForSuspension) {
        inst.subscriptionStatus = 'suspended';
        await inst.save();

        await AuditLog.create({
          institute: inst._id,
          eventType: 'SUBSCRIPTION_SUSPENDED',
          details: `Grace period expired without payment. Institute suspended.`,
          ipAddress: '127.0.0.1',
          userAgent: 'System Scheduler'
        });

        // Find latest unpaid invoice
        const invoice = await SubscriptionInvoice.findOne({
          instituteId: inst._id,
          status: { $in: ['pending', 'overdue'] }
        }).sort({ dueDate: -1 });

        let pdfBuffer = null;
        if (invoice) {
          try {
            if (isR2Configured()) {
              const key = parseR2Key(invoice.generatedPdfUrl);
              pdfBuffer = await downloadFromR2(key);
            }
          } catch (err) {
            console.error(`[Scheduler] Failed to download invoice PDF for suspension email: ${err.message}`);
          }
        }

        const emailTo = inst.billingContactEmail || inst.email;
        sendSuspensionEmail(
          emailTo,
          inst.billingContactName || inst.contactPerson,
          invoice ? invoice.invoiceNumber : '',
          pdfBuffer
        ).catch(err => {
          console.error('[Resend Suspension Email Error]', err);
        });

        if (invoice) {
          invoice.notesTimeline.push({
            event: 'Suspended',
            details: 'Subscription suspended due to non-payment after grace period expired.',
            timestamp: now
          });
          await invoice.save();

          await InvoiceAudit.create({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            instituteId: inst._id,
            action: 'Suspended',
            timestamp: now,
            details: 'Institute suspended automatically due to grace period expiration.'
          });
        }
        console.log(`[Scheduler] Suspended institute: ${inst.name} due to grace period expiration.`);
      }

      // D. Trial Expiry Checker — REMOVED
      // The platform no longer uses free trials. Flow is:
      // Register → Pending → Owner Collects Payment → Owner Approves → Active


      // 1. Process Scheduled Notifications
      const pendingScheds = await ScheduledNotification.find({
        scheduledFor: { $lte: now },
        sent: false
      });

      if (pendingScheds.length > 0) {
        console.log(`Processing ${pendingScheds.length} scheduled notifications...`);
      }

      for (const sched of pendingScheds) {
        // Create in-app global notifications (handled by post-save push hooks!)
        await Notification.create({
          institute: sched.institute,
          userId: null,
          targetType: 'role',
          targetRole: 'student',
          title: sched.title || '📢 Institute Announcement',
          message: sched.message,
          type: sched.type || 'announcement',
          url: '/student'
        });

        sched.sent = true;
        await sched.save();
      }

      // 2. Process Live Class Reminders (15 minutes ahead)
      const reminderThreshold = new Date(now.getTime() + 15 * 60 * 1000);
      const classesForReminder = await LiveClass.find({
        startTime: { $lte: reminderThreshold, $gt: now },
        status: 'upcoming',
        reminderSent: false
      });

      for (const lc of classesForReminder) {
        const enrollments = await Enrollment.find({
          programId: lc.courseId,
          institute: lc.instituteId,
          status: 'active'
        });

        const notifications = enrollments.map(e => ({
          institute: lc.instituteId,
          userId: e.studentId,
          targetType: 'user',
          title: '🎥 Live Class Starting Soon',
          message: `"${lc.title}" starts in 15 minutes! Tap to join.`,
          url: '/student?tab=live-classes',
          type: 'live_class',
          read: false
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        lc.reminderSent = true;
        await lc.save();
        console.log(`Sent 15-minute live class reminders for "${lc.title}" to ${notifications.length} students.`);
      }

      // 3. Process Live Class Started
      const classesStarted = await LiveClass.find({
        startTime: { $lte: now },
        status: 'upcoming',
        startedNotificationSent: false
      });

      for (const lc of classesStarted) {
        const enrollments = await Enrollment.find({
          programId: lc.courseId,
          institute: lc.instituteId,
          status: 'active'
        });

        const notifications = enrollments.map(e => ({
          institute: lc.instituteId,
          userId: e.studentId,
          targetType: 'user',
          title: '🔴 Live Class Started',
          message: `"${lc.title}" has started! Tap to join the live session now.`,
          url: '/student?tab=live-classes',
          type: 'live_class',
          read: false
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        lc.startedNotificationSent = true;
        lc.status = 'live';
        await lc.save();
        console.log(`Sent started live class notifications for "${lc.title}" to ${notifications.length} students.`);
      }

      // 4. Process Continue Learning Reminders (Inactivity check at exactly Day 3, 7, and 14)
      const activeStudents = await User.find({ role: 'student' });

      for (const student of activeStudents) {
        const lastWatch = await WatchHistory.findOne({ studentId: student._id })
          .sort({ lastWatchedAt: -1 })
          .populate('contentId');

        if (lastWatch && lastWatch.lastWatchedAt) {
          const diffDays = (now.getTime() - new Date(lastWatch.lastWatchedAt).getTime()) / (1000 * 60 * 60 * 24);
          
          let targetDay = 0;
          let message = '';
          
          if (diffDays >= 14 && !student.continueLearningRemindersSent.includes(14)) {
            targetDay = 14;
            message = `Don't lose your progress! Resume "${lastWatch.contentId?.title || 'your course'}" now and keep learning.`;
          } else if (diffDays >= 7 && !student.continueLearningRemindersSent.includes(7)) {
            targetDay = 7;
            message = `It's been a week! Ready to get back to "${lastWatch.contentId?.title || 'your course'}"? Tap to resume.`;
          } else if (diffDays >= 3 && !student.continueLearningRemindersSent.includes(3)) {
            targetDay = 3;
            message = `You haven't watched "${lastWatch.contentId?.title || 'your last lesson'}" in 3 days. Tap to resume learning!`;
          }

          if (targetDay > 0) {
            const lessonId = lastWatch.lessonId || lastWatch.contentId?.lessonId;
            let courseId = lastWatch.courseId || '';
            let lessonIndex = 1;

            if (lessonId) {
              const lesson = await Lesson.findById(lessonId);
              if (lesson) {
                courseId = courseId || lesson.courseId;
                const courseLessons = await Lesson.find({ courseId: lesson.courseId }).sort({ order: 1, createdAt: 1 });
                const idx = courseLessons.findIndex(l => l._id.toString() === lesson._id.toString());
                if (idx >= 0) {
                  lessonIndex = idx + 1;
                }
              }
            }

            const url = courseId ? `/student/video/${courseId}/${lessonIndex}` : '/student';

            await Notification.create({
              userId: student._id,
              targetType: 'user',
              institute: student.institute || null,
              title: '📚 Continue Learning',
              message,
              url,
              type: 'continue_learning'
            });

            student.continueLearningRemindersSent.push(targetDay);
            student.lastContinueLearningReminderSentAt = now;
            await student.save();
            console.log(`Sent Continue Learning Day ${targetDay} reminder to student "${student.email}" for content "${lastWatch.contentId?.title || 'unknown'}"`);
          }
        }
      }
    } catch (err) {
      console.error('[Background Scheduler Error]', err);
    }
  }, 60000);
};
