import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Users,
  Search,
  Plus,
  Upload,
  Edit2,
  Trash2,
  X,
  Tag,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getContacts,
  getContactTags,
  createContact,
  updateContact,
  deleteContact,
  bulkImportContacts,
  syncDonorsToContacts,
} from '../services/contactService';

// Tag color palette
const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
];

const getTagColor = (tag) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export default function ContactsTab() {
  const [contacts, setContacts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', tags: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Import
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  // ─── Data Fetching ──────────────────────────────────────────────
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const data = await getContacts({
        search: searchQuery,
        tag: selectedTag,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      setContacts(data.contacts || []);
      setTotalPages(data.totalPages || 1);
      setTotalContacts(data.total || 0);
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const tags = await getContactTags();
      setAllTags(tags);
    } catch (err) {
      console.error('Failed to load tags', err);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTag, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchTags();
  }, []);

  // ─── Sorting ────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'text-primary' : 'rotate-180 text-primary'} />;
  };

  // ─── Add / Edit Modal ──────────────────────────────────────────
  const openAddModal = () => {
    setEditingContact(null);
    setFormData({ name: '', phone: '', email: '', tags: '', notes: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      tags: (contact.tags || []).join(', '),
      notes: contact.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('Name and phone are required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        notes: formData.notes.trim(),
      };

      if (editingContact) {
        await updateContact(editingContact._id, payload);
      } else {
        await createContact(payload);
      }

      setShowModal(false);
      fetchContacts();
      fetchTags();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteContact(id);
      setDeletingId(null);
      fetchContacts();
    } catch (err) {
      alert('Failed to delete contact');
    }
  };

  // ─── Excel Import ───────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const parsed = data.map(row => ({
        name: String(row.name || row.Name || row.NAME || '').trim(),
        phone: String(row.phone || row.Phone || row.PHONE || '').trim(),
        email: String(row.email || row.Email || row.EMAIL || '').trim(),
        tags: String(row.tags || row.Tags || row.TAGS || '').split(',').map(t => t.trim()).filter(Boolean),
        notes: String(row.notes || row.Notes || row.NOTES || '').trim(),
      })).filter(r => r.name && r.phone);

      setImportData(parsed);
      setShowImportPreview(true);
      setImportResult(null);
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const result = await bulkImportContacts(importData);
      setImportResult(result);
      fetchContacts();
      fetchTags();
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  // ─── Donor Sync ─────────────────────────────────────────────────
  const handleSyncDonors = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncDonorsToContacts();
      setSyncResult(result);
      fetchContacts();
      fetchTags();
    } catch (err) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Sync Result Banner */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-lg text-sm border ${syncResult.error ? 'bg-danger-bg text-danger border-danger/20' : 'bg-success-bg text-success border-success/20'}`}
          >
            {syncResult.error
              ? `Sync failed: ${syncResult.error}`
              : `Donor sync complete — ${syncResult.imported} imported, ${syncResult.updated} updated, ${syncResult.skipped} skipped.`
            }
            <button onClick={() => setSyncResult(null)} className="ml-3 font-bold">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-surface rounded-xl border border-border-default shadow-card overflow-hidden"
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-border-default flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-warm-white">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Contacts</h2>
              <p className="text-sm text-text-muted">{totalContacts} people</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:w-56 min-w-[150px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
              />
            </div>

            {/* Tag Filter */}
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:border-primary bg-surface"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            {/* Actions */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-surface text-sm font-medium rounded-md hover:bg-primary-mid transition-colors"
            >
              <Plus size={16} /> Add
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 bg-bg text-text-primary text-sm font-medium rounded-md border border-border-strong hover:bg-border-default/50 transition-colors cursor-pointer">
              <Upload size={16} /> Import
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
            </label>

            <button
              onClick={handleSyncDonors}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-bg text-text-primary text-sm font-medium rounded-md border border-border-strong hover:bg-border-default/50 transition-colors disabled:opacity-50"
              title="Import all donors as contacts"
            >
              <Download size={16} className={syncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Donors'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg text-text-secondary text-sm select-none">
                <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2">Name {renderSortIcon('name')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('phone')}>
                  <div className="flex items-center gap-2">Phone {renderSortIcon('phone')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default">Tags</th>
                <th className="p-4 font-medium border-b border-border-default hidden md:table-cell">Notes</th>
                <th className="p-4 font-medium border-b border-border-default hidden lg:table-cell cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('createdAt')}>
                  <div className="flex items-center gap-2">Added {renderSortIcon('createdAt')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">Loading contacts...</td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="text-warning" />
                      <p>No contacts found. Add your first contact or sync donors.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c._id} className="border-b border-border-default hover:bg-warm-white transition-colors">
                    <td className="p-4 text-sm font-semibold text-text-primary">{c.name}</td>
                    <td className="p-4 text-sm text-text-secondary">{c.phone}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map(tag => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-text-muted truncate max-w-[200px] hidden md:table-cell">{c.notes || '-'}</td>
                    <td className="p-4 text-sm text-text-muted hidden lg:table-cell">
                      {format(new Date(c.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-text-muted hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        {deletingId === c._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(c._id)}
                              className="text-[11px] font-bold text-danger hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-[11px] text-text-muted hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(c._id)}
                            className="p-1.5 text-text-muted hover:text-danger transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border-default bg-warm-white flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-text-muted">
            Showing {contacts.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalContacts)} of {totalContacts}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
              className="p-2 border border-border-strong rounded-md hover:bg-border-default disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm text-text-primary font-medium px-4">
              Page {page} of {Math.max(1, totalPages)}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || isLoading || totalPages === 0}
              className="p-2 border border-border-strong rounded-md hover:bg-border-default disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── Add / Edit Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl border border-border-default shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-default flex justify-between items-center bg-warm-white rounded-t-xl">
                <h3 className="text-lg font-semibold text-text-primary">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-2 rounded-md bg-danger-bg text-danger text-sm border border-danger/20">{formError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Tags <span className="text-text-muted font-normal">(comma-separated)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-text-muted shrink-0" />
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg"
                      placeholder="e.g. volunteer, committee"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border-default bg-warm-white flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-text-secondary border border-border-strong rounded-md hover:bg-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContact}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-primary text-surface rounded-md hover:bg-primary-mid disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingContact ? 'Update' : 'Add Contact'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Import Preview Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showImportPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowImportPreview(false); setImportResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl border border-border-default shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-default flex justify-between items-center bg-warm-white rounded-t-xl">
                <h3 className="text-lg font-semibold text-text-primary">
                  Import Preview — {importData.length} contacts
                </h3>
                <button onClick={() => { setShowImportPreview(false); setImportResult(null); }} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>

              {importResult ? (
                <div className="p-6">
                  <div className={`p-4 rounded-lg text-sm border ${importResult.error ? 'bg-danger-bg text-danger border-danger/20' : 'bg-success-bg text-success border-success/20'}`}>
                    {importResult.error
                      ? `Import failed: ${importResult.error}`
                      : `Import complete — ${importResult.imported} new, ${importResult.updated} updated, ${importResult.skipped} skipped.`
                    }
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => { setShowImportPreview(false); setImportResult(null); }}
                      className="px-4 py-2 text-sm font-medium bg-primary text-surface rounded-md hover:bg-primary-mid transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-auto flex-1 p-4">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-bg text-text-secondary">
                          <th className="p-2 border-b border-border-default font-medium">#</th>
                          <th className="p-2 border-b border-border-default font-medium">Name</th>
                          <th className="p-2 border-b border-border-default font-medium">Phone</th>
                          <th className="p-2 border-b border-border-default font-medium">Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-border-default">
                            <td className="p-2 text-text-muted">{i + 1}</td>
                            <td className="p-2 text-text-primary">{row.name}</td>
                            <td className="p-2 text-text-secondary">{row.phone}</td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1">
                                {row.tags.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-bg border border-border-default">{t}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {importData.length > 50 && (
                          <tr>
                            <td colSpan="4" className="p-2 text-center text-text-muted text-xs">
                              ...and {importData.length - 50} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 border-t border-border-default bg-warm-white flex justify-end gap-3 rounded-b-xl">
                    <button
                      onClick={() => setShowImportPreview(false)}
                      className="px-4 py-2 text-sm text-text-secondary border border-border-strong rounded-md hover:bg-bg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={importing}
                      className="px-4 py-2 text-sm font-medium bg-primary text-surface rounded-md hover:bg-primary-mid disabled:opacity-50 transition-colors"
                    >
                      {importing ? 'Importing...' : `Import ${importData.length} Contacts`}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
