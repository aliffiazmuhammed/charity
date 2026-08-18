import mongoose from 'mongoose';

const inboxMessageSchema = new mongoose.Schema(
  {
    waMessageId: {
      type: String,
      unique: true,
      sparse: true,
    },
    senderPhone: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      default: 'Unknown',
    },
    content: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'], // inbound = from user to us, outbound = from us to user (manual reply/auto-reply)
      required: true,
    },
    status: {
      type: String,
      enum: ['received', 'sent', 'delivered', 'read', 'failed'],
      default: 'received',
    },
    isRead: {
      type: Boolean,
      default: false, // For dashboard UI (unread badge)
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast conversation grouping and sorting
inboxMessageSchema.index({ senderPhone: 1, createdAt: -1 });
inboxMessageSchema.index({ waMessageId: 1 });
inboxMessageSchema.index({ isRead: 1 });

export const InboxMessage = mongoose.model('InboxMessage', inboxMessageSchema);
