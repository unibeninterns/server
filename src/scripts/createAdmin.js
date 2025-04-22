import mongoose from 'mongoose';
import User from '../model/user.model.js';
import connectDB from '../db/database.js';
import validateEnv from '../utils/validateEnv.js';
import logger from '../utils/logger.js';

validateEnv();

export const createAdminUser = async () => {
  try {
    await connectDB();
    logger.info('Connected to database');

    if(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
      return logger.error("Add admin info to the .env records.")

    // Check if admin already exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });

    if (adminExists) {
      logger.info('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isActive: true,
    });

    logger.info(`Admin user created with email: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    logger.info('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
