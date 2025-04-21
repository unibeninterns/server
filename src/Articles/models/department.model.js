import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema(
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
    faculty: {
      type: String,
      ref: 'Faculty',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Department', DepartmentSchema);
