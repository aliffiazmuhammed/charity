import express from 'express';
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
  bulkImportContacts,
  getAllTags,
  syncDonorsToContacts,
} from '../services/contactService.js';

const router = express.Router();

/**
 * GET /api/contacts/tags
 * Get all unique tags for filter dropdowns.
 * NOTE: Must be before /:id route.
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/sync-donors
 * Sync all donors from the Donation collection into Contacts.
 */
router.post('/sync-donors', async (req, res) => {
  try {
    const results = await syncDonorsToContacts();
    res.json({ message: 'Donor sync completed', ...results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/bulk
 * Bulk import contacts from Excel or other sources.
 * Body: { contacts: [{ name, phone, email?, tags?, notes? }] }
 */
router.post('/bulk', async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts array is required and must not be empty' });
    }
    const results = await bulkImportContacts(contacts);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts
 * List all contacts with search, tag filter, pagination, and sorting.
 * Query: search, tag, page, limit, sortBy, sortOrder
 */
router.get('/', async (req, res) => {
  try {
    const { search, tag, page, limit, sortBy, sortOrder } = req.query;
    const result = await getAllContacts({ search, tag, page, limit, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts
 * Create a new contact.
 * Body: { name, phone, email?, tags?, notes? }
 */
router.post('/', async (req, res) => {
  try {
    const contact = await createContact(req.body);
    res.status(201).json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/:id
 * Get a single contact by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const contact = await getContactById(req.params.id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/contacts/:id
 * Update a contact.
 */
router.put('/:id', async (req, res) => {
  try {
    const contact = await updateContact(req.params.id, req.body);
    res.json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/contacts/:id
 * Soft-delete a contact.
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteContact(req.params.id);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

export default router;
