import express from 'express';
import {
  getAllDonors,
  getDonorProfile,
  checkReturningDonor,
} from '../services/donorService.js';

const router = express.Router();

/**
 * GET /api/donors
 * All unique donors sorted by total donated (highest first).
 */
router.get('/', async (req, res) => {
  try {
    const { search, page, limit, sortBy, sortOrder } = req.query;
    const result = await getAllDonors({ search, page, limit, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/donors/check/:phone
 * Quick returning-donor check for the donation form.
 * Returns { isReturning, previousCount, totalDonated }
 */
router.get('/check/:phone', async (req, res) => {
  try {
    const result = await checkReturningDonor(req.params.phone);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/donors/:phone
 * Full donor profile with donation history.
 */
router.get('/:phone', async (req, res) => {
  try {
    const profile = await getDonorProfile(req.params.phone);
    if (!profile) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
