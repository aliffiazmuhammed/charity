import express from 'express';
import { getWhatsAppStatus, logoutWhatsApp } from '../services/whatsappService.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/whatsapp/status
 * Protected — returns the current WhatsApp connection status.
 * Used by the frontend Header to show a connection indicator.
 *
 * Response:
 *   { status: 'READY' | 'QR_READY' | 'AUTHENTICATED' | 'DISCONNECTED' | 'AUTH_FAILURE', isReady: boolean, hasQR: boolean }
 */
router.get('/status', auth, (req, res) => {
  const { status, isReady, hasQR } = getWhatsAppStatus();
  res.json({ status, isReady, hasQR });
});

/**
 * GET /api/whatsapp/qr
 * Protected — returns the raw QR code string if the client is waiting for a scan.
 * Returns 404 if no QR code is currently active.
 */
router.get('/qr', auth, (req, res) => {
  const { hasQR, qr, qrDataUrl } = getWhatsAppStatus();
  if (hasQR && qr) {
    res.json({ qr, qrDataUrl });
  } else {
    res.status(404).json({ error: 'No active QR code available. Client might be connected or disconnected.' });
  }
});

/**
 * POST /api/whatsapp/logout
 * Protected — manually logs out the current WhatsApp session and generates a new QR code.
 */
router.post('/logout', auth, async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true, message: 'WhatsApp logged out successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
