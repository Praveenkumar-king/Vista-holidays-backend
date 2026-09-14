import mongoose from 'mongoose';

const ticketCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

// In-memory sequence counter as fallback when database is disconnected / in test mode
const inMemoryCounters = new Map();

/**
 * Atomic helper to get the next sequential ticket ID for a given type ('CON' or 'FEED')
 * Returns format: Vista-{type}-YYYYMMDD-001
 */
ticketCounterSchema.statics.getNextTicketId = async function (type = 'CON') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const counterId = `${type}-${dateStr}`;

  // If MongoDB is actively connected, use atomic database sequencing
  if (mongoose.connection.readyState === 1) {
    try {
      const counter = await this.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );

      const paddedSeq = String(counter.seq).padStart(3, '0');
      return `Vista-${type}-${dateStr}-${paddedSeq}`;
    } catch (error) {
      // Fall through to in-memory counter if database query errors
    }
  }

  // Graceful sequential in-memory fallback when offline/testing
  const currentSeq = (inMemoryCounters.get(counterId) || 0) + 1;
  inMemoryCounters.set(counterId, currentSeq);
  const paddedSeq = String(currentSeq).padStart(3, '0');
  return `Vista-${type}-${dateStr}-${paddedSeq}`;
};

const TicketCounter = mongoose.model('TicketCounter', ticketCounterSchema);

export default TicketCounter;
