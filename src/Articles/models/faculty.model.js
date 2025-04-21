import mongoose from 'mongoose';

const FacultySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      maxlength: 10,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Faculty', FacultySchema);
