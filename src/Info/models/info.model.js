import mongoose from 'mongoose';

const InfoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    info_doc: {
      type: String,
      required: true,
    },
    original_filename: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    file_type: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publish_date: {
      type: Date,
      default: Date.now,
    },
    // Adding view tracking
    views: {
      count: {
        type: Number,
        default: 0,
      },
      // To track unique viewers by IP address or session ID
      viewers: [
        {
          identifier: String, // IP address or session ID
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    status: {
      type: String,
      enum: ['published', 'archived'],
      default: 'published',
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
InfoSchema.index({ 'views.count': -1 });
InfoSchema.index({ title: 'text', description: 'text' });
InfoSchema.index({ publish_date: -1 });
InfoSchema.index({ file_type: 1 });

export default mongoose.model('Info', InfoSchema);
