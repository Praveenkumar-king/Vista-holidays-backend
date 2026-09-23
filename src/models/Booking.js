import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
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
    mobile: {
      type: String,
      required: true,
      trim: true
    },
    destinationId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    destinationName: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    checkInDate: {
      type: Date,
      default: null
    },
    packageId: {
      type: String,
      required: true,
      trim: true,
      default: 'standard'
    },
    packageName: {
      type: String,
      required: true,
      trim: true,
      default: 'Standard Explorer'
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0
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
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true
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
    razorpaySignature: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    invoiceNumber: {
      type: String,
      default: null,
      index: true
    },
    invoicePdfUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Optimize queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ paymentStatus: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
