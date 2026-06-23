import express from 'express';
import {
  loginAdmin,
  refreshAccessToken,
  validateToken,
} from '../services/authService.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Public — Login with username and password.
 * Returns { accessToken, refreshToken, admin }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await loginAdmin(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/auth/refresh
 * Public — Get a new access token using a valid refresh token.
 * Body: { refreshToken }
 * Returns { accessToken }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * GET /api/auth/validate
 * Protected — Verify the current access token is valid.
 * Returns { valid: true, admin: { id, username } }
 */
router.get('/validate', auth, (req, res) => {
  res.json({
    valid: true,
    admin: req.admin,
  });
});

export default router;
