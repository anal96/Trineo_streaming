import mongoose from 'mongoose';

const invoiceCounterSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  sequence: {
    type: Number,
    required: true,
    default: 0
  }
});

export const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);
