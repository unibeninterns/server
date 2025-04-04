import mongoose from 'mongoose';
import User from '../model/user.model.js';
import connectDB from '../db/database.js';
import validateEnv from '../utils/validateEnv.js';

validateEnv();

const createAdminUser = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isActive: true
    });

    console.log(`Admin user created with email: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();