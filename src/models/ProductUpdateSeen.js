import mongoose from 'mongoose';

const productUpdateSeenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    productUpdateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductUpdate',
      required: [true, 'Product Update ID is required'],
      index: true
    },
    version: {
      type: String,
      required: [true, 'Version string is required'],
      trim: true
    },
    seenAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique viewing per user per product update
productUpdateSeenSchema.index({ userId: 1, productUpdateId: 1 }, { unique: true });
productUpdateSeenSchema.index({ userId: 1, version: 1 });

const ProductUpdateSeen = mongoose.model('ProductUpdateSeen', productUpdateSeenSchema);

export default ProductUpdateSeen;
