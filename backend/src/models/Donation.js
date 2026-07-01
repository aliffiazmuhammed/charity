import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donorName: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      minlength: [10, 'Phone number must be at least 10 digits'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount is required'],
      min: [1, 'Donation amount must be at least ₹1'],
    },
    date: {
      type: Date,
      required: [true, 'Donation date is required'],
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    careOf: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast donor lookups and date sorting
donationSchema.index({ phone: 1, date: -1 });
donationSchema.index({ careOf: 1 });

export const Donation = mongoose.model('Donation', donationSchema);
