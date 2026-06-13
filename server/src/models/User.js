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
    required: true,
    unique: true
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

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
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
