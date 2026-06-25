import { MessageTemplate } from '../models/MessageTemplate.js';

/**
 * Create a new message template.
 * If isActive is true, the pre-save hook deactivates all others.
 */
export const createTemplate = async ({ name, body, isActive = false }) => {
  const template = new MessageTemplate({ name, body, isActive });
  return await template.save();
};

/**
 * Get all templates, sorted by most recently updated first.
 */
export const getAllTemplates = async () => {
  return await MessageTemplate.find().sort({ updatedAt: -1 });
};

/**
 * Get the currently active template (or null if none is active).
 */
export const getActiveTemplate = async () => {
  return await MessageTemplate.findOne({ isActive: true });
};

/**
 * Update a template by ID.
 * If isActive is being set to true, deactivate all others first.
 */
export const updateTemplate = async (id, data) => {
  const template = await MessageTemplate.findById(id);
  if (!template) {
    throw new Error('Template not found');
  }

  // Update allowed fields
  if (data.name !== undefined) template.name = data.name;
  if (data.body !== undefined) template.body = data.body;
  if (data.isActive !== undefined) template.isActive = data.isActive;

  // .save() triggers the pre-save hook for single-active enforcement
  return await template.save();
};

/**
 * Set a specific template as the active one.
 * Deactivates all others.
 */
export const setActiveTemplate = async (id) => {
  const template = await MessageTemplate.findById(id);
  if (!template) {
    throw new Error('Template not found');
  }

  // Deactivate all, then activate this one
  await MessageTemplate.updateMany({}, { $set: { isActive: false } });
  template.isActive = true;
  return await template.save();
};

/**
 * Delete a template by ID.
 */
export const deleteTemplate = async (id) => {
  const deleted = await MessageTemplate.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('Template not found');
  }
  return deleted;
};
