import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config'
    },
    // Maintenance Mode Controls
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceHeadline: {
      type: String,
      default: 'Scheduled Maintenance in Progress'
    },
    maintenanceMessage: {
      type: String,
      default: 'Vista Holidays is currently undergoing scheduled platform maintenance. We will be back online shortly. Thank you for your patience.'
    },
    maintenanceStartedAt: {
      type: Date,
      default: null
    },
    // Platform Branding & Support
    brandName: {
      type: String,
      default: 'Vista Holidays'
    },
    supportEmail: {
      type: String,
      default: 'no-reply-travelbooking@outlook.com'
    },
    tagline: {
      type: String,
      default: 'Discover Extraordinary Journeys with AI Travel Intelligence'
    },
    updatedBy: {
      type: String,
      default: 'Super Admin'
    }
  },
  {
    timestamps: true
  }
);

/**
 * Singleton helper to retrieve or initialize the platform configuration
 */
platformSettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await this.create({
      key: 'global_config',
      maintenanceMode: false,
      maintenanceHeadline: 'Scheduled Maintenance in Progress',
      maintenanceMessage: 'Vista Holidays is currently undergoing scheduled platform maintenance. We will be back online shortly. Thank you for your patience.',
      brandName: 'Vista Holidays',
      supportEmail: 'no-reply-travelbooking@outlook.com',
      tagline: 'Discover Extraordinary Journeys with AI Travel Intelligence'
    });
  }
  return settings;
};

const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);

export default PlatformSetting;
