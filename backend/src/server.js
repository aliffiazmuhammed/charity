import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { auth } from './middleware/auth.js';
import campaignRoutes from './routes/campaignRoutes.js';
import authRoutes from './routes/authRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { startCampaignScheduler } from './services/campaignScheduler.js';
import path from 'path';


const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (wait for it to finish)
await connectDB();

// Start background workers
startCampaignScheduler();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Public Routes (no authentication required) ──────────────────────

// Health check
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'Meenangadi Charitable Trust API is running' });
});

// Auth routes (login, refresh, validate)
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// ── Protected Routes (authentication required) ─────────────────────

// All donation and donor routes require a valid access token
app.use('/api/donations', auth, donationRoutes);
app.use('/api/donors', auth, donorRoutes);
app.use('/api/templates', auth, templateRoutes);
app.use('/api/campaigns', auth, campaignRoutes);
app.use('/api/contacts', auth, contactRoutes);
app.use('/api/upload', auth, uploadRoutes);

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
