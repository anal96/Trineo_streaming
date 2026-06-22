import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true
  },
  p256dh: {
    type: String,
    required: true
  },
  auth: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index to prevent duplicate device subscriptions per user endpoint
pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
