import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    bookingId: {
      type: String,
      required: true,
      trim: true,
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
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    destination: {
      type: String,
      required: true,
      trim: true
    },
    package: {
      type: String,
      required: true,
      trim: true
    },
    days: {
      type: Number,
      required: true,
      min: 1
    },
    members: {
      type: Number,
      required: true,
      min: 1
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast administrative search and filtering
transactionSchema.index({ transactionDate: -1 });
transactionSchema.index({ paymentStatus: 1, transactionDate: -1 });
transactionSchema.index({ email: 1, transactionDate: -1 });
transactionSchema.index({ userName: 'text', email: 'text', destination: 'text', bookingId: 'text' });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
