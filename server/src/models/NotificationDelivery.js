import mongoose from 'mongoose';

const notificationDeliverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true,
    index: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  clicked: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  clickedAt: {
    type: Date,
    default: null
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

export const NotificationDelivery = mongoose.model('NotificationDelivery', notificationDeliverySchema);
