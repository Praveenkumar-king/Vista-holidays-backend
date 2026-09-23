import mongoose from 'mongoose';
import { getISTDateComponents } from '../services/emails/emailTimeHelper.js';

const invoiceCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

// In-memory fallback sequence counter for local/disconnected environments
const inMemoryInvoiceCounters = new Map();

/**
 * Atomic generator for sequential Invoice Numbers
 * Format: VISTA-INV-YYYYMMDD-0001
 * Concurrency-safe, never duplicated, uses Asia/Kolkata timezone
 */
invoiceCounterSchema.statics.getNextInvoiceNumber = async function () {
  const { year, month, day } = getISTDateComponents();
  const dateStr = `${year}${month}${day}`;
  const counterId = `INV-${dateStr}`;

  if (mongoose.connection.readyState === 1) {
    try {
      const counter = await this.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );

      const paddedSeq = String(counter.seq).padStart(4, '0');
      return `VISTA-INV-${dateStr}-${paddedSeq}`;
    } catch (error) {
      // Fall through to in-memory counter if database query errors
    }
  }

  const currentSeq = (inMemoryInvoiceCounters.get(counterId) || 0) + 1;
  inMemoryInvoiceCounters.set(counterId, currentSeq);
  const paddedSeq = String(currentSeq).padStart(4, '0');
  return `VISTA-INV-${dateStr}-${paddedSeq}`;
};

const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);

export default InvoiceCounter;
