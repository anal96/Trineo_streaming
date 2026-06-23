import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'owner'],
    default: 'student'
  },
  phone: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  recoveryEmail: {
    type: String,
    default: ''
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
  },
  branchName: {
    type: String,
    default: ''
  },
  batchName: {
    type: String,
    default: ''
  },
  courseName: {
    type: String,
    default: ''
  },
  program: {
    type: String,
    default: ''
  },
  faculty: {
    type: String,
    default: ''
  },
  enrollmentDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  activeSessionToken: {
    type: String,
    default: ''
  },
  passwordResetTokenHash: {
    type: String,
    default: ''
  },
  passwordResetExpiresAt: {
    type: Date,
    default: null
  },
  assignedPackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccessPackage',
    default: null
  },
  packageExpiryDate: {
    type: Date,
    default: null
  },
  studentId: {
    type: String,
    default: ''
  },
  crmStudentId: {
    type: String,
    index: true,
    default: ''
  },
  crmSource: {
    type: String,
    default: ''
  },
  instituteId: {
    type: String,
    default: '',
    index: true
  },
  lastSyncedAt: {
    type: Date,
    default: null
  },
  syncStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  lastSyncError: {
    type: String,
    default: ''
  },
  isSyncing: {
    type: Boolean,
    default: false
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  notificationPreferences: {
    academic: {
      type: Boolean,
      default: true
    },
    liveClass: {
      type: Boolean,
      default: true
    },
    security: {
      type: Boolean,
      default: true
    },
    announcement: {
      type: Boolean,
      default: true
    },
    certificates: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastContinueLearningReminderSentAt: {
    type: Date,
    default: null
  },
  continueLearningRemindersSent: {
    type: [Number],
    default: []
  }
});

userSchema.index({ email: 1, instituteId: 1 }, { unique: true });
userSchema.index(
  { studentId: 1, instituteId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentId: { $gt: "" }
    }
  }
);
userSchema.index({ createdAt: -1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1, institute: 1 });

// Pre-save hook to generate user_id and hash password
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  if (!this.user_id) {
    let attempts = 0;
    const Model = this.constructor;
    while (attempts < 100) {
      const randomId = Math.floor(100000 + Math.random() * 900000); // 6-digit random number (100000 - 999999)
      const existingUser = await Model.findOne({ user_id: randomId });
      if (!existingUser) {
        this.user_id = randomId;
        break;
      }
      attempts++;
    }
  }

  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in user pre-save:', err);
    }
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
