import mongoose from 'mongoose';

const subscriptionInvoiceSchema = new mongoose.Schema({
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
  instituteName: {
    type: String,
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  planNameSnapshot: {
    type: String,
    required: true
  },
  billingCycleSnapshot: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
    required: true
  },
  amountSnapshot: {
    type: Number,
    required: true
  },
  taxAmountSnapshot: {
    type: Number,
    required: true
  },
  totalAmountSnapshot: {
    type: Number,
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  paidDate: {
    type: Date
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
  generatedPdfUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },
  notesTimeline: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    event: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: ''
    }
  }]
}, {
  timestamps: true
});

subscriptionInvoiceSchema.index({ createdAt: -1 });

export const SubscriptionInvoice = mongoose.model('SubscriptionInvoice', subscriptionInvoiceSchema);
