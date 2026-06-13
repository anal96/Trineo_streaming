import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'refunded'],
    default: 'completed'
  }
});

// Compound index to prevent duplicate purchases
purchaseSchema.index({ institute: 1, studentId: 1, courseId: 1 }, { unique: true });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
