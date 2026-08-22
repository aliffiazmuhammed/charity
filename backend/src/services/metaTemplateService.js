import axios from 'axios';
import { MessageTemplate } from '../models/MessageTemplate.js';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${WABA_ID}`;

const getHeaders = () => ({
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Convert a local template name to Meta-compatible format.
 * Meta requires lowercase, underscores, no special chars.
 */
const toMetaName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 512);
};

/**
 * Convert local placeholders ({{donorName}}, {{amount}}, {{date}})
 * to Meta positional parameters ({{1}}, {{2}}, {{3}}).
 * Returns { convertedBody, parameterMapping }
 */
const convertPlaceholders = (body) => {
  const placeholderNames = [];
  let convertedBody = body;
  let index = 1;

  // Find all {{word}} patterns
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  const seen = new Set();

  while ((match = regex.exec(body)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      placeholderNames.push(name);
    }
  }

  // Replace named placeholders with positional ones
  for (const name of placeholderNames) {
    convertedBody = convertedBody.replace(
      new RegExp(`\\{\\{${name}\\}\\}`, 'g'),
      `{{${index}}}`
    );
    index++;
  }

  return { convertedBody, parameterMapping: placeholderNames };
};

/**
 * Upload media for use in template headers.
 * Returns a media handle that can be used in template creation.
 */
export const uploadMediaForTemplate = async (fileUrl, fileType) => {
  try {
    // 1. Download the file from the provided URL
    const imgRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgRes.data, 'binary');
    const fileLength = buffer.length;

    // Map template headerType to MIME type
    let mimeType = 'application/octet-stream';
    if (fileType.toLowerCase() === 'image') mimeType = 'image/jpeg';
    if (fileType.toLowerCase() === 'document') mimeType = 'application/pdf';
    if (fileType.toLowerCase() === 'video') mimeType = 'video/mp4';

    const GRAPH_URL = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}`;

    // 2. Start upload session
    const sessionRes = await axios.post(
      `${GRAPH_URL}/app/uploads?file_length=${fileLength}&file_type=${mimeType}`,
      {},
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );
    const sessionId = sessionRes.data.id;

    // 3. Upload file bytes
    const uploadRes = await axios.post(
      `${GRAPH_URL}/${sessionId}`,
      buffer,
      {
        headers: {
          Authorization: `OAuth ${ACCESS_TOKEN}`,
          file_offset: 0
        }
      }
    );
    
    return uploadRes.data.h; // Return the header_handle
  } catch (error) {
    throw new Error(`Media upload failed: ${error.message}`);
  }
};

/**
 * Submit a template to Meta for approval.
 * @param {ObjectId} templateId - Local MongoDB template ID
 */
export const submitTemplateToMeta = async (templateId) => {
  const template = await MessageTemplate.findById(templateId);
  if (!template) throw new Error('Template not found');

  const metaName = toMetaName(template.name);
  const { convertedBody, parameterMapping } = convertPlaceholders(template.body);

  // Build components array
  const components = [];

  // Header component (if any)
  if (template.headerType && template.headerType !== 'none') {
    if (template.headerType === 'text') {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: template.headerContent || '',
      });
    } else {
      // Media header (IMAGE, DOCUMENT, VIDEO)
      let headerHandle = undefined;
      if (template.headerContent) {
        // Upload the media from URL to Meta's Resumable Upload API to get a handle
        headerHandle = await uploadMediaForTemplate(template.headerContent, template.headerType);
      }
      
      components.push({
        type: 'HEADER',
        format: template.headerType.toUpperCase(),
        example: headerHandle ? { header_handle: [headerHandle] } : undefined,
      });
    }
  }

  // Body component (required)
  const bodyComponent = {
    type: 'BODY',
    text: convertedBody,
  };

  // Add example values for parameters (required by Meta for approval)
  if (parameterMapping.length > 0) {
    const exampleValues = parameterMapping.map(name => {
      const examples = {
        donorName: 'Rahul Sharma',
        amount: '₹5,000',
        date: '20 Jul 2026',
        name: 'Rahul Sharma',
        phone: '9876543210',
      };
      return examples[name] || `Sample ${name}`;
    });
    bodyComponent.example = { body_text: [exampleValues] };
  }
  components.push(bodyComponent);

  // Footer component (if any)
  if (template.footerText) {
    components.push({
      type: 'FOOTER',
      text: template.footerText,
    });
  }

  // Button components (if any)
  if (template.buttons && template.buttons.length > 0) {
    const buttons = template.buttons.map(btn => {
      const buttonObj = { type: btn.type, text: btn.text };
      if (btn.type === 'URL') buttonObj.url = btn.url;
      if (btn.type === 'PHONE_NUMBER') buttonObj.phone_number = btn.phoneNumber;
      return buttonObj;
    });
    components.push({ type: 'BUTTONS', buttons });
  }

  // Submit to Meta
  try {
    const response = await axios.post(
      `${BASE_URL}/message_templates`,
      {
        name: metaName,
        language: template.language || 'en',
        category: template.metaCategory || 'UTILITY',
        components,
      },
      { headers: getHeaders() }
    );

    // Update local template with Meta info
    template.metaTemplateName = metaName;
    template.metaStatus = 'pending';
    template.isSyncedToMeta = true;
    await template.save();

    console.log(`[Meta Templates] ✅ Template "${metaName}" submitted for approval (ID: ${response.data.id})`);
    return { success: true, metaId: response.data.id, metaName, status: 'pending' };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    let errMsg = errData.message || error.message;

    // Check if Meta provided a more descriptive user-facing error message
    if (errData.error_user_msg) {
      errMsg = `${errData.error_user_title ? errData.error_user_title + ': ' : ''}${errData.error_user_msg}`;
    } else if (errData.error_subcode) {
      errMsg += ` (Subcode: ${errData.error_subcode})`;
    }

    console.error(`[Meta Templates] ❌ Failed to submit "${metaName}":`, errMsg);
    if (errData) console.error('Full Meta Error:', JSON.stringify(errData, null, 2));

    // If it's a duplicate name error, the template might already exist
    if (errData.code === 100 && errMsg.includes('already exists')) {
      template.metaTemplateName = metaName;
      template.metaStatus = 'pending';
      template.isSyncedToMeta = true;
      await template.save();
    }

    throw new Error(errMsg);
  }
};

/**
 * Fetch all templates from Meta and return them.
 */
export const fetchMetaTemplates = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/message_templates?limit=100`,
      { headers: getHeaders() }
    );
    return response.data.data || [];
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Failed to fetch Meta templates: ${errMsg}`);
  }
};

/**
 * Check the approval status of a specific template.
 */
export const checkTemplateStatus = async (templateName) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/message_templates?name=${templateName}`,
      { headers: getHeaders() }
    );
    const templates = response.data.data || [];
    if (templates.length === 0) {
      return { name: templateName, status: 'NOT_FOUND' };
    }
    return {
      name: templateName,
      status: templates[0].status,
      category: templates[0].category,
      language: templates[0].language,
      id: templates[0].id,
    };
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * Delete a template from Meta.
 */
export const deleteMetaTemplate = async (templateName) => {
  try {
    await axios.delete(
      `${BASE_URL}/message_templates?name=${templateName}`,
      { headers: getHeaders() }
    );
    console.log(`[Meta Templates] 🗑️ Template "${templateName}" deleted from Meta`);
    return { success: true };
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * Sync all template statuses from Meta to local DB.
 * Fetches all templates from Meta and updates their status in our DB.
 */
export const syncAllTemplateStatuses = async () => {
  const metaTemplates = await fetchMetaTemplates();
  const results = [];

  for (const mt of metaTemplates) {
    const localTemplate = await MessageTemplate.findOne({ metaTemplateName: mt.name });
    if (localTemplate) {
      const oldStatus = localTemplate.metaStatus;
      localTemplate.metaStatus = mt.status.toLowerCase();
      if (mt.status === 'REJECTED' && mt.rejected_reason) {
        localTemplate.metaRejectedReason = mt.rejected_reason;
      }
      await localTemplate.save();
      results.push({
        name: mt.name,
        oldStatus,
        newStatus: mt.status.toLowerCase(),
        updated: oldStatus !== mt.status.toLowerCase(),
      });
    } else {
      // Import template from Meta if it doesn't exist locally
      const bodyComponent = mt.components?.find(c => c.type === 'BODY');
      const newTemplate = new MessageTemplate({
        name: mt.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format name nicely
        metaTemplateName: mt.name,
        metaStatus: mt.status.toLowerCase(),
        language: mt.language || 'en',
        category: 'custom',
        metaCategory: mt.category || 'UTILITY',
        body: bodyComponent ? bodyComponent.text : `[Imported from Meta]`,
        isSyncedToMeta: true,
      });
      await newTemplate.save();
      results.push({
        name: mt.name,
        oldStatus: null,
        newStatus: mt.status.toLowerCase(),
        updated: true,
        imported: true,
      });
    }
  }

  // Handle templates that were deleted from Meta
  const metaTemplateNames = metaTemplates.map(mt => mt.name);
  const orphanedTemplates = await MessageTemplate.find({
    isSyncedToMeta: true,
    metaTemplateName: { $nin: metaTemplateNames }
  });

  for (const orphan of orphanedTemplates) {
    await MessageTemplate.findByIdAndDelete(orphan._id);
    results.push({
      name: orphan.metaTemplateName,
      oldStatus: orphan.metaStatus,
      newStatus: 'deleted',
      updated: true,
      deleted: true,
    });
  }

  console.log(`[Meta Templates] 🔄 Synced ${results.length} templates from Meta`);
  return results;
};

