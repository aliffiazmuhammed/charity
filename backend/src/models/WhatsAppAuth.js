import mongoose from 'mongoose';

const whatsappAuthSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

export const WhatsAppAuth = mongoose.model('WhatsAppAuth', whatsappAuthSchema);
