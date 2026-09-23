import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    bookingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    bookingObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      default: ''
    },
    userEmail: {
      type: String,
      default: ''
    },
    invoicePdfUrl: {
      type: String,
      required: true
    },
    invoicePdfPublicId: {
      type: String,
      default: null
    },
    paymentReference: {
      type: String,
      default: null
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Fast search indexes
invoiceSchema.index({ userId: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
