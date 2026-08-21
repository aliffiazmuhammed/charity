import { Contact } from '../models/Contact.js';
import { Donation } from '../models/Donation.js';

/**
 * Create a new contact.
 */
export const createContact = async (data) => {
  // Normalize phone
  const phone = data.phone.replace(/\D/g, '').trim();
  
  // Check if phone already exists
  const existing = await Contact.findOne({ phone });
  if (existing) {
    throw new Error(`A contact with phone ${phone} already exists.`);
  }

  // Normalize tags
  const tags = (data.tags || [])
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);

  const contact = new Contact({
    name: data.name.trim(),
    phone,
    email: (data.email || '').trim(),
    tags,
    notes: (data.notes || '').trim(),
    source: data.source || 'manual',
  });

  await contact.save();
  return contact;
};

/**
 * Get all contacts with search, tag filter, pagination, and sorting.
 */
export const getAllContacts = async ({ search, tag, page = 1, limit = 25, sortBy = 'name', sortOrder = 'asc' } = {}) => {
  const filter = { isActive: true };

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { name: regex },
      { phone: regex },
      { email: regex },
    ];
  }

  if (tag) {
    filter.tags = tag.toLowerCase();
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortDir = sortOrder === 'desc' ? -1 : 1;

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Contact.countDocuments(filter),
  ]);

  return {
    contacts,
    total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

/**
 * Get a single contact by ID.
 */
export const getContactById = async (id) => {
  return Contact.findOne({ _id: id, isActive: true }).lean();
};

/**
 * Get a single contact by phone.
 */
export const getContactByPhone = async (phone) => {
  return Contact.findOne({ phone, isActive: true }).lean();
};

/**
 * Update a contact.
 */
export const updateContact = async (id, data) => {
  const update = {};

  if (data.name !== undefined) update.name = data.name.trim();
  if (data.phone !== undefined) update.phone = data.phone.replace(/\D/g, '').trim();
  if (data.email !== undefined) update.email = data.email.trim();
  if (data.notes !== undefined) update.notes = data.notes.trim();
  if (data.tags !== undefined) {
    update.tags = data.tags
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
  }

  // If phone changed, check uniqueness
  if (update.phone) {
    const existing = await Contact.findOne({ phone: update.phone, _id: { $ne: id } });
    if (existing) {
      throw new Error(`A contact with phone ${update.phone} already exists.`);
    }
  }

  const contact = await Contact.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!contact) throw new Error('Contact not found');
  return contact;
};

/**
 * Soft-delete a contact.
 */
export const deleteContact = async (id) => {
  const contact = await Contact.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!contact) throw new Error('Contact not found');
  return contact;
};

/**
 * Bulk import contacts. Uses upsert (update if phone exists, insert if new).
 */
export const bulkImportContacts = async (contacts) => {
  const results = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (const c of contacts) {
    try {
      const phone = String(c.phone || '').replace(/\D/g, '').trim();
      if (!phone || phone.length < 10) {
        results.skipped++;
        continue;
      }

      const name = (c.name || '').trim();
      if (!name) {
        results.skipped++;
        continue;
      }

      const tags = (c.tags || [])
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      const existing = await Contact.findOne({ phone });
      if (existing) {
        // Update existing: merge tags, update name if provided
        const mergedTags = [...new Set([...existing.tags, ...tags])];
        await Contact.updateOne(
          { phone },
          {
            $set: {
              name: name || existing.name,
              email: (c.email || '').trim() || existing.email,
              notes: (c.notes || '').trim() || existing.notes,
              tags: mergedTags,
              isActive: true,
            },
          }
        );
        results.updated++;
      } else {
        await Contact.create({
          name,
          phone,
          email: (c.email || '').trim(),
          tags,
          notes: (c.notes || '').trim(),
          source: c.source || 'imported',
        });
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ phone: c.phone, error: err.message });
    }
  }

  return results;
};

/**
 * Get all unique tags.
 */
export const getAllTags = async () => {
  const tags = await Contact.distinct('tags', { isActive: true });
  return tags.sort();
};

/**
 * Sync all donors from the Donation collection into Contacts.
 * Upserts: if donor phone already exists, merges; if not, creates.
 */
export const syncDonorsToContacts = async () => {
  // Aggregate unique donors from donations
  const donors = await Donation.aggregate([
    {
      $group: {
        _id: '$phone',
        donorName: { $last: '$donorName' },
        phone: { $first: '$phone' },
        totalDonated: { $sum: '$amount' },
        donationCount: { $sum: 1 },
      },
    },
  ]);

  const results = { imported: 0, updated: 0, skipped: 0 };

  for (const donor of donors) {
    try {
      const phone = donor.phone.replace(/\D/g, '').trim();
      if (!phone || phone.length < 10) {
        results.skipped++;
        continue;
      }

      const existing = await Contact.findOne({ phone });
      if (existing) {
        // Merge: add 'donor' tag if not present
        const mergedTags = [...new Set([...existing.tags, 'donor'])];
        await Contact.updateOne(
          { phone },
          {
            $set: {
              name: donor.donorName || existing.name,
              tags: mergedTags,
              isActive: true,
            },
          }
        );
        results.updated++;
      } else {
        await Contact.create({
          name: donor.donorName,
          phone,
          tags: ['donor'],
          source: 'donor',
        });
        results.imported++;
      }
    } catch (err) {
      results.skipped++;
    }
  }

  return results;
};
