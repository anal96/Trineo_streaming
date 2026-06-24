import mongoose from 'mongoose';

const invoiceAuditSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionInvoice',
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    index: true
  },
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'Invoice Created',
      'Invoice Emailed',
      'Invoice Viewed',
      'Invoice Downloaded',
      'Payment Due',
      'Grace Period Started',
      'Marked Paid',
      'Suspended',
      'Reactivated'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  details: {
    type: String,
    default: ''
  }
});

export const InvoiceAudit = mongoose.model('InvoiceAudit', invoiceAuditSchema);
