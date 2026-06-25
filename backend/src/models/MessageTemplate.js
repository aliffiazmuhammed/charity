import mongoose from 'mongoose';

const messageTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    body: {
      type: String,
      required: [true, 'Template body is required'],
      trim: true,
      maxlength: [2000, 'Template body cannot exceed 2000 characters'],
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: enforce single-active constraint.
 * When a template is saved with isActive: true, deactivate all others.
 */
messageTemplateSchema.pre('save', async function () {
  if (this.isActive) {
    await mongoose.model('MessageTemplate').updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { $set: { isActive: false } }
    );
  }
});

export const MessageTemplate = mongoose.model('MessageTemplate', messageTemplateSchema);
