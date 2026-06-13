import { Purchase } from '../models/Purchase.js';
import { Payment } from '../models/Payment.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';

const requireInstitute = (req, res) => {
  if (req.user.role === 'owner') return true;
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

export const purchaseCourse = async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user._id;

  try {
    if (!requireInstitute(req, res)) return;

    const course = await Course.findOne({ _id: courseId, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existingPurchase = await Purchase.findOne({ studentId, courseId, institute: req.user.institute });
    if (existingPurchase && existingPurchase.status === 'completed') {
      return res.status(400).json({ message: 'Course access already active' });
    }

    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + Date.now();

    let purchase;
    if (existingPurchase) {
      existingPurchase.status = 'completed';
      existingPurchase.purchasedAt = Date.now();
      purchase = await existingPurchase.save();
    } else {
      purchase = await Purchase.create({
        institute: req.user.institute,
        studentId,
        courseId,
        amount: course.price,
        status: 'completed'
      });
    }

    const payment = await Payment.create({
      institute: req.user.institute,
      studentId,
      purchaseId: purchase._id,
      amount: course.price,
      status: 'success',
      paymentMethod: 'Credit/Debit Card',
      transactionId
    });

    await Notification.create({
      userId: studentId,
      institute: req.user.institute,
      message: `Enrolled successfully in course: ${course.title}`,
      type: 'enrollment'
    });

    await Notification.create({
      userId: null,
      institute: req.user.institute,
      message: `${req.user.name} enrolled in ${course.title}`,
      type: 'payment'
    });

    res.status(201).json({
      message: 'Access granted successfully',
      purchase,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPurchasedCourses = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    if (req.user.role !== 'student') {
      // For owners and admins, fetch all courses in the institute
      const filter = {};
      if (req.user.role !== 'owner') {
        filter.institute = req.user.institute;
      }
      const courses = await Course.find(filter);
      return res.json(courses);
    }

    // For students, fetch all courses in their institute
    const courses = await Course.find({ institute: req.user.institute });
    const assignedCourses = [];

    // Also get all course IDs from student's purchases
    const purchases = await Purchase.find({ studentId: req.user._id, institute: req.user.institute });
    const purchasedCourseIds = new Set(purchases.map(p => p.courseId.toString()));

    for (const course of courses) {
      const access = await verifyStudentAccess({
        user: req.user,
        courseId: course._id.toString()
      });

      const isAssigned = 
        access.granted || 
        purchasedCourseIds.has(course._id.toString()) || 
        (access.reason && access.reason !== 'Access not activated by your institute.');

      if (isAssigned) {
        // Embed the access status directly so the frontend knows if it's locked
        const courseObj = course.toObject();
        courseObj.isPurchased = access.granted;
        if (!access.granted) {
          courseObj.isLocked = true;
          courseObj.lockReason = access.reason;
          courseObj.lockStatus = access.status;
        } else {
          courseObj.isLocked = false;
        }
        assignedCourses.push(courseObj);
      }
    }

    res.json(assignedCourses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const purchaseCourseManual = async (req, res) => {
  const { courseId, transactionRef } = req.body;
  const studentId = req.user._id;

  try {
    if (!requireInstitute(req, res)) return;

    const course = await Course.findOne({ _id: courseId, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existingPurchase = await Purchase.findOne({ studentId, courseId, institute: req.user.institute });
    if (existingPurchase && existingPurchase.status === 'completed') {
      return res.status(400).json({ message: 'Course access already active' });
    }

    const ref = transactionRef || 'SLIP-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now();

    const purchase = await Purchase.create({
      institute: req.user.institute,
      studentId,
      courseId,
      amount: course.price,
      status: 'pending'
    });

    const payment = await Payment.create({
      institute: req.user.institute,
      studentId,
      purchaseId: purchase._id,
      amount: course.price,
      status: 'pending',
      paymentMethod: 'Manual Bank Slip',
      transactionId: ref
    });

    await Notification.create({
      userId: studentId,
      institute: req.user.institute,
      message: `Access activation request submitted for ${course.title}. Waiting for admin approval.`,
      type: 'system'
    });

    await Notification.create({
      userId: null,
      institute: req.user.institute,
      message: `New course access request submitted by ${req.user.name} for ${course.title}`,
      type: 'payment'
    });

    res.status(201).json({
      message: 'Course access request logged successfully',
      purchase,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingPayments = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin authorization required' });
  }
  if (!requireInstitute(req, res)) return;

  try {
    const payments = await Payment.find({ status: 'pending', institute: req.user.institute })
      .populate('studentId', 'name email')
      .populate({
        path: 'purchaseId',
        populate: { path: 'courseId', select: 'title price' }
      });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyManualPayment = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin authorization required' });
  }
  if (!requireInstitute(req, res)) return;

  const { paymentId, action } = req.body;

  try {
    const payment = await Payment.findOne({ _id: paymentId, institute: req.user.institute });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment is already processed' });
    }

    const purchase = await Purchase.findOne({ _id: payment.purchaseId, institute: req.user.institute });
    if (!purchase) {
      return res.status(404).json({ message: 'Associated purchase not found' });
    }

    const course = await Course.findOne({ _id: purchase.courseId, institute: req.user.institute });

    if (action === 'approve') {
      payment.status = 'success';
      purchase.status = 'completed';
      purchase.purchasedAt = Date.now();

      await payment.save();
      await purchase.save();

      await Notification.create({
        userId: purchase.studentId,
        institute: req.user.institute,
        message: `Your access request has been approved! Welcome to course "${course?.title || 'Course'}"`,
        type: 'enrollment'
      });

      res.json({ message: 'Access request approved and course access granted successfully' });
    } else {
      payment.status = 'failed';
      purchase.status = 'failed';

      await payment.save();
      await purchase.save();

      await Notification.create({
        userId: purchase.studentId,
        institute: req.user.institute,
        message: `Your course access request for "${course?.title || 'Course'}" was rejected. Please contact support.`,
        type: 'system'
      });

      res.json({ message: 'Access request rejected successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminAssignCourse = async (req, res) => {
  const { studentId, courseId } = req.body;

  try {
    if (!requireInstitute(req, res)) return;

    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    const course = await Course.findOne({ _id: courseId, institute: req.user.institute });

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existingPurchase = await Purchase.findOne({ studentId, courseId, institute: req.user.institute });
    if (existingPurchase && existingPurchase.status === 'completed') {
      return res.status(400).json({ message: 'Student is already enrolled in this course' });
    }

    if (existingPurchase) {
      existingPurchase.status = 'completed';
      existingPurchase.amount = course.price;
      existingPurchase.purchasedAt = Date.now();
      await existingPurchase.save();
    } else {
      await Purchase.create({
        institute: req.user.institute,
        studentId,
        courseId,
        amount: course.price,
        status: 'completed'
      });
    }

    student.courseName = course.title;
    await student.save();

    await Notification.create({
      userId: studentId,
      institute: req.user.institute,
      message: `You were enrolled in ${course.title} by the institute admin.`,
      type: 'enrollment'
    });

    res.status(201).json({ message: 'Course assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminRemoveCourse = async (req, res) => {
  const { studentId, courseId } = req.body;

  try {
    if (!requireInstitute(req, res)) return;

    const removed = await Purchase.findOneAndDelete({ studentId, courseId, institute: req.user.institute });
    if (!removed) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    const course = await Course.findOne({ _id: courseId, institute: req.user.institute });
    if (student && course && student.courseName === course.title) {
      student.courseName = '';
      await student.save();
    }

    await Notification.create({
      userId: studentId,
      institute: req.user.institute,
      message: `Your enrollment for the selected course was removed by the institute admin.`,
      type: 'system'
    });

    res.json({ message: 'Course removed from student successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminBulkEnroll = async (req, res) => {
  const { studentIds = [], courseId } = req.body;

  try {
    if (!requireInstitute(req, res)) return;

    const course = await Course.findOne({ _id: courseId, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const results = await Promise.all(studentIds.map(async (studentId) => {
      const student = await User.findOne({ _id: studentId, institute: req.user.institute });
      if (!student || student.role !== 'student') {
        return { studentId, status: 'skipped' };
      }

      const existingPurchase = await Purchase.findOne({ studentId, courseId, institute: req.user.institute });
      if (existingPurchase && existingPurchase.status === 'completed') {
        return { studentId, status: 'already-enrolled' };
      }

      if (existingPurchase) {
        existingPurchase.status = 'completed';
        existingPurchase.amount = course.price;
        existingPurchase.purchasedAt = Date.now();
        await existingPurchase.save();
      } else {
        await Purchase.create({
          institute: req.user.institute,
          studentId,
          courseId,
          amount: course.price,
          status: 'completed'
        });
      }

      student.courseName = course.title;
      await student.save();

      await Notification.create({
        userId: studentId,
        institute: req.user.institute,
        message: `You were enrolled in ${course.title} through a bulk admin enrollment.`,
        type: 'enrollment'
      });

      return { studentId, status: 'enrolled' };
    }));

    res.json({ message: 'Bulk enrollment completed', results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
