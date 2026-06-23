import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { auth } from './middleware/auth.js';
import { initWhatsApp } from './services/whatsappService.js';
import authRoutes from './routes/authRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (wait for it to finish)
await connectDB();

// Initialize WhatsApp client (non-blocking — runs in background)
// QR code will appear in terminal on first run
initWhatsApp();

// Middleware
app.use(cors());
app.use(express.json());

// ── Public Routes (no authentication required) ──────────────────────

// Health check
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'Charity Donation Registry API is running' });
});

// Auth routes (login, refresh, validate)
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// ── Protected Routes (authentication required) ─────────────────────

// All donation and donor routes require a valid access token
app.use('/api/donations', auth, donationRoutes);
app.use('/api/donors', auth, donorRoutes);

// ── Global Error Handler ────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
