const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');

const seedAdminOnly = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed] Seeding is disabled in production to prevent data loss.');
    process.exit(1);
  }

  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing all dummy items, claims, and test users...');
    await Claim.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    console.log('[Seed] Creating official initial Campus Admin account...');
    const adminUser = await User.create({
      name: 'Campus Admin',
      email: 'admin@college.com',
      password: 'AdminPassword123!',
      phone: '+1 (555) 000-0001',
      studentId: 'ADM-2026',
      role: 'admin',
    });

    console.log('[Seed] Creating demo student account...');
    const studentUser = await User.create({
      name: 'Sarah Jenkins',
      email: 'sarah.j@college.com',
      password: 'Password123!',
      phone: '+1 (555) 234-5678',
      studentId: 'STU-8821',
      role: 'user',
    });

    console.log('[Seed] Database cleaned successfully:');
    console.log(`  - Items: 0 (all dummy items removed)`);
    console.log(`  - Claims: 0 (all dummy claims removed)`);
    console.log(`  - Users: 2 (Campus Admin: ${adminUser.email}, Student: ${studentUser.email})`);
    console.log('\n[Seed] Default Credentials:');
    console.log('  Admin:   admin@college.com / AdminPassword123!');
    console.log('  Student: sarah.j@college.com / Password123!\n');

    await disconnectDB();
    console.log('[Seed] Database disconnected cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during database reset:', error);
    process.exit(1);
  }
};

seedAdminOnly();
