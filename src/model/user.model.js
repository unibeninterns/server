import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'researcher'],
    default: 'researcher'
  },
  faculty: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  inviteToken: {
    type: String,
  },
  inviteTokenExpires: {
    type: Date,
  },
  invitationStatus: {
  type: String,
  enum: ['pending', 'accepted', 'expired'],
  default: 'pending'
},
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (this.password && this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate invite token
UserSchema.methods.generateInviteToken = function() {
  const inviteToken = crypto.randomBytes(32).toString('hex');
  
  this.inviteToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex');
    
  this.inviteTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return inviteToken;
};

export default mongoose.model('User', UserSchema, 'Users');