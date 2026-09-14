import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/security.js';
import config from '../config/environment.js';

/**
 * Seed Administrator Account into MongoDB
 * Usage:
 *   npm run seed:admin
 *   node src/scripts/seedAdmin.js
 */
const seedAdmin = async () => {
  console.log('\n========================================');
  console.log('🚀 Vista Holidays - Admin Seeder Script');
  console.log('========================================\n');

  try {
    console.log('🔄 Connecting to MongoDB database...');
    const conn = await connectDB();
    if (!conn) {
      console.error('❌ Failed to connect to MongoDB. Please ensure your MongoDB service is running.');
      process.exit(1);
    }

    const adminEmail = (process.env.ADMIN_EMAIL || config.adminEmail || 'no-reply-travelbooking@outlook.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || config.adminPassword || 'PKSecret@79798';
    const adminName = 'Vista Administrator';
    const adminMobile = '+91 9876543210';

    console.log(`🔍 Checking if administrator account exists for: ${adminEmail}...`);
    let user = await User.findOne({ email: adminEmail });

    const passwordHash = await hashPassword(adminPassword);

    if (user) {
      console.log('ℹ️ Existing user found with this email. Promoting to Administrator and updating credentials...');
      user.name = adminName;
      user.passwordHash = passwordHash;
      user.mobile = user.mobile || adminMobile;
      user.role = 'admin';
      user.emailVerified = true;
      user.accountStatus = 'active';
      user.termsAccepted = true;
      user.termsAcceptedAt = user.termsAcceptedAt || new Date();
      user.emailVerificationTokenHash = null;
      user.emailVerificationExpiresAt = null;
      await user.save();
      console.log('✅ Administrator account updated successfully!');
    } else {
      console.log('✨ No existing account found. Creating new Administrator account...');
      user = new User({
        name: adminName,
        email: adminEmail,
        passwordHash,
        mobile: adminMobile,
        role: 'admin',
        emailVerified: true,
        accountStatus: 'active',
        termsAccepted: true,
        termsAcceptedAt: new Date()
      });
      await user.save();
      console.log('✅ Administrator account created successfully!');
    }

    console.log('\n========================================');
    console.log('🎉 ADMIN CREDENTIALS READY IN DATABASE:');
    console.log(`   Email:       ${adminEmail}`);
    console.log(`   Password:    ${adminPassword}`);
    console.log(`   Role:        ${user.role}`);
    console.log(`   Status:      ${user.accountStatus}`);
    console.log(`   Verified:    ${user.emailVerified}`);
    console.log('========================================\n');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed cleanly.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error while seeding administrator:', error);
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedAdmin();
