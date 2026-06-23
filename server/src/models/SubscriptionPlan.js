import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
    default: 'monthly'
  },
  studentLimit: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  storageLimit: {
    type: Number,
    default: 0 // GB, 0 means unlimited
  },
  features: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
