import mongoose from 'mongoose';

const messageLogSchema = new mongoose.Schema(
  {
    waMessageId: {
      type: String,
      unique: true,
      sparse: true,
    },
    recipientPhone: {
      type: String,
      required: true,
    },
    recipientName: {
      type: String,
      default: '',
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
    },
    templateName: {
      type: String,
      default: null,
    },
    messageType: {
      type: String,
      enum: ['thank_you', 'campaign', 'reminder', 'greeting', 'custom'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'scheduled'],
      default: 'queued',
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    bodyParams: [String],
    languageCode: { type: String, default: 'en' },
    campaignId: {
      type: String,
      default: null,
    },
    campaignName: {
      type: String,
      default: null,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageLogSchema.index({ recipientPhone: 1, createdAt: -1 });
messageLogSchema.index({ campaignId: 1 });
messageLogSchema.index({ status: 1 });
messageLogSchema.index({ donationId: 1 });

export const MessageLog = mongoose.model('MessageLog', messageLogSchema);
