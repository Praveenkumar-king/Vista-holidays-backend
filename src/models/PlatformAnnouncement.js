import mongoose from 'mongoose';

const platformAnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    targetAudience: {
      type: String,
      enum: ['everyone', 'users', 'admins'],
      default: 'everyone',
      index: true
    },
    expirationDuration: {
      type: String,
      enum: [
        'never',
        '1_day',
        '2_days',
        '5_days',
        '1_month',
        '2_months',
        '3_months',
        '6_months',
        '1_year'
      ],
      default: 'never'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'expired', 'closed'],
      default: 'active',
      index: true
    },
    createdBy: {
      type: String,
      default: 'Super Admin'
    }
  },
  {
    timestamps: true
  }
);

/**
 * Helper to compute expiresAt from expirationDuration
 */
platformAnnouncementSchema.statics.calculateExpiresAt = function (duration, fromDate = new Date()) {
  if (!duration || duration === 'never') return null;

  const expiry = new Date(fromDate);
  switch (duration) {
    case '1_day':
      expiry.setDate(expiry.getDate() + 1);
      break;
    case '2_days':
      expiry.setDate(expiry.getDate() + 2);
      break;
    case '5_days':
      expiry.setDate(expiry.getDate() + 5);
      break;
    case '1_month':
      expiry.setMonth(expiry.getMonth() + 1);
      break;
    case '2_months':
      expiry.setMonth(expiry.getMonth() + 2);
      break;
    case '3_months':
      expiry.setMonth(expiry.getMonth() + 3);
      break;
    case '6_months':
      expiry.setMonth(expiry.getMonth() + 6);
      break;
    case '1_year':
      expiry.setFullYear(expiry.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return expiry;
};

const PlatformAnnouncement = mongoose.model('PlatformAnnouncement', platformAnnouncementSchema);

export default PlatformAnnouncement;
