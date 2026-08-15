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
    // --- Meta WhatsApp Business API fields ---
    metaTemplateName: {
      type: String,
      default: null,
      trim: true,
    },
    metaStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'disabled', null],
      default: 'draft',
    },
    metaRejectedReason: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: 'en',
    },
    metaCategory: {
      type: String,
      enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'],
      default: 'UTILITY',
    },
    category: {
      type: String,
      enum: ['thank_you', 'reminder', 'greeting', 'campaign', 'custom'],
      default: 'custom',
    },
    headerType: {
      type: String,
      enum: ['none', 'text', 'image', 'document', 'video'],
      default: 'none',
    },
    headerContent: {
      type: String,
      default: null,
    },
    footerText: {
      type: String,
      default: null,
    },
    buttons: [{
      type: { type: String, enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'] },
      text: String,
      url: String,
      phoneNumber: String,
    }],
    isSyncedToMeta: {
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
