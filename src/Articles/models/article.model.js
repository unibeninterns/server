import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Research', 'Innovation', 'Development'],
    },
    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    cover_photo: {
      type: String,
      required: true,
    },
    contributors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    faculty: {
      type: mongoose.Schema.Types.ObjectId, // Changed to ObjectId from String
      ref: 'Faculty',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId, // Changed to ObjectId from String
      ref: 'Department',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 500, // Short summary
      trim: true,
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
    tags: [String], // Adding tags for better searchability
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
ArticleSchema.index({ 'views.count': -1 });
ArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });
ArticleSchema.index({ category: 1 });
ArticleSchema.index({ faculty: 1, department: 1 });
ArticleSchema.index({ publish_date: -1 });

export default mongoose.model('Article', ArticleSchema);
