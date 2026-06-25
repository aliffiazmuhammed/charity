import express from 'express';
import { validateDonation } from '../middleware/validateDonation.js';
import {
  createDonation,
  getAllDonations,
  deleteDonation,
  getDashboardStats,
  getAllDonationsForExport,
} from '../services/donationService.js';
import { generateCSV } from '../utils/csvExport.js';
import { sendThankYouMessage } from '../services/whatsappService.js';
import { getActiveTemplate } from '../services/templateService.js';

const router = express.Router();

/**
 * GET /api/donations/stats
 * Dashboard summary statistics.
 * NOTE: This must be defined BEFORE the /:id route to avoid conflict.
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/donations/export
 * Download all donations as a CSV file.
 */
router.get('/export', async (req, res) => {
  try {
    const donations = await getAllDonationsForExport();
    const csv = generateCSV(donations);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=donations-export.csv'
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/donations
 * All donations (newest first). Supports ?search= query param.
 */
router.get('/', async (req, res) => {
  try {
    const { search, page, limit, sortBy, sortOrder } = req.query;
    const result = await getAllDonations({ search, page, limit, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/donations
 * Create a new donation entry (with validation).
 * Fires a WhatsApp thank-you message asynchronously after saving.
 */
router.post('/', validateDonation, async (req, res) => {
  try {
    const { donorName, phone, amount, date, note } = req.body;
    const newDonation = await createDonation({
      donorName,
      phone,
      amount,
      date: date || new Date(),
      note: note || '',
    });

    // ── Fire-and-forget WhatsApp thank-you ────────────────────────────
    // Runs asynchronously — a WhatsApp failure will NEVER block the save.
    // Fetch the active template; if none exists, no message is sent.
    getActiveTemplate().then((template) => {
      sendThankYouMessage(
        newDonation.phone,
        newDonation.donorName,
        newDonation.amount,
        newDonation.date,
        template?.body
      );
    }).catch((err) => {
      console.error('[Donation] Failed to fetch active template:', err.message);
    });

    res.status(201).json(newDonation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/donations/:id
 * Delete a donation by its ID.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteDonation(req.params.id);
    res.json({ message: 'Donation deleted successfully', donation: deleted });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

export default router;
