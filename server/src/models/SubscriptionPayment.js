import mongoose from 'mongoose';

const subscriptionPaymentSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  instituteCode: {
    type: String,
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentDueDate: {
    type: Date
  },
  paidDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'cheque']
  },
  paymentReference: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export const SubscriptionPayment = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
