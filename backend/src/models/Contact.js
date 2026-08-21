import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true,
      minlength: [10, 'Phone number must be at least 10 digits'],
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['manual', 'imported', 'donor'],
      default: 'manual',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
contactSchema.index({ phone: 1 }, { unique: true });
contactSchema.index({ tags: 1 });
contactSchema.index({ name: 'text', phone: 'text' });
contactSchema.index({ isActive: 1 });

export const Contact = mongoose.model('Contact', contactSchema);
