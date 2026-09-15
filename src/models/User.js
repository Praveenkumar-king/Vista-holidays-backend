import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ],
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return password hash in regular queries
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      validate: {
        validator: function (v) {
          // Validates international formats (e.g., +1234567890, +91-9876543210) or standard 10-15 digit numbers
          return /^\+?[0-9\s\-()]{7,20}$/.test(v) && v.replace(/\D/g, '').length >= 7;
        },
        message: 'Please provide a valid phone number'
      }
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
      index: true
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null
    },
    lastVerifiedTokenHash: {
      type: String,
      default: null,
      select: false,
      index: true
    },
    welcomeEmailSent: {
      type: Boolean,
      default: false
    },
    termsAccepted: {
      type: Boolean,
      default: false
    },
    termsAcceptedAt: {
      type: Date,
      default: null
    },
    termsVersion: {
      type: String,
      default: '1.0'
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    }
  },
  {
    timestamps: true // Automatically manages createdAt and updatedAt
  }
);

// Method to verify password candidate securely
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Safe JSON serialization: remove sensitive attributes
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    mobile: this.mobile,
    role: this.role || 'user',
    emailVerified: this.emailVerified,
    termsAccepted: this.termsAccepted,
    termsAcceptedAt: this.termsAcceptedAt,
    termsVersion: this.termsVersion,
    accountStatus: this.accountStatus,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Also apply to JSON serialization
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.emailVerificationTokenHash;
    delete ret.__v;
    ret.id = ret._id.toString();
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

export default User;
