import mongoose from 'mongoose';

const bookingCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

// In-memory fallback sequence counter
const inMemoryBookingCounters = new Map();

/**
 * Atomic generator for sequential Booking IDs
 * Format: VISTA-BOOK-YYYYMMDD-0001
 */
bookingCounterSchema.statics.getNextBookingId = async function () {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const counterId = `BOOK-${dateStr}`;

  if (mongoose.connection.readyState === 1) {
    try {
      const counter = await this.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );

      const paddedSeq = String(counter.seq).padStart(4, '0');
      return `VISTA-BOOK-${dateStr}-${paddedSeq}`;
    } catch (error) {
      // Fall through to in-memory counter if database query errors
    }
  }

  const currentSeq = (inMemoryBookingCounters.get(counterId) || 0) + 1;
  inMemoryBookingCounters.set(counterId, currentSeq);
  const paddedSeq = String(currentSeq).padStart(4, '0');
  return `VISTA-BOOK-${dateStr}-${paddedSeq}`;
};

const BookingCounter = mongoose.model('BookingCounter', bookingCounterSchema);

export default BookingCounter;
