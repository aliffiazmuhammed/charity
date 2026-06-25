import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createTemplate,
  getAllTemplates,
  getActiveTemplate,
  updateTemplate,
  setActiveTemplate,
  deleteTemplate,
} from '../services/templateService.js';

const router = express.Router();

/**
 * GET /api/templates
 * List all message templates.
 */
router.get('/', async (req, res) => {
  try {
    const templates = await getAllTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/active
 * Get the currently active template.
 */
router.get('/active', async (req, res) => {
  try {
    const template = await getActiveTemplate();
    if (!template) {
      return res.status(404).json({ error: 'No active template found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates
 * Create a new message template.
 */
router.post('/', async (req, res) => {
  try {
    const { name, body, isActive } = req.body;

    if (!name || !body) {
      return res.status(400).json({ error: 'Template name and body are required' });
    }

    const template = await createTemplate({ name, body, isActive });
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/templates/:id
 * Update an existing message template.
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, body, isActive } = req.body;
    const template = await updateTemplate(req.params.id, { name, body, isActive });
    res.json(template);
  } catch (error) {
    const status = error.message === 'Template not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/**
 * PATCH /api/templates/:id/activate
 * Set a specific template as the active one.
 */
router.patch('/:id/activate', async (req, res) => {
  try {
    const template = await setActiveTemplate(req.params.id);
    res.json(template);
  } catch (error) {
    const status = error.message === 'Template not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete a message template.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteTemplate(req.params.id);
    res.json({ message: 'Template deleted successfully', template: deleted });
  } catch (error) {
    const status = error.message === 'Template not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

export default router;
