/**
 * Seed script — creates the default admin user from .env credentials.
 * Run once with: node src/scripts/seedAdmin.js
 * Skips creation if the admin already exists.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: username.toLowerCase() });
    if (existingAdmin) {
      console.log(`Admin "${username}" already exists. Skipping seed.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin
    const admin = new Admin({ username, password });
    await admin.save();

    console.log(`Admin user created successfully:`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`\nYou can now login at POST /api/auth/login`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
