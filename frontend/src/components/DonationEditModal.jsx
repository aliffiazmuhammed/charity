import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { updateDonation } from '../services/donationService';
import { format } from 'date-fns';

export default function DonationEditModal({ isOpen, onClose, donation, onSave }) {
  const [formData, setFormData] = useState({
    donorName: '',
    phone: '',
    amount: '',
    date: '',
    careOf: '',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (donation && isOpen) {
      setFormData({
        donorName: donation.donorName || '',
        phone: donation.phone || '',
        amount: donation.amount || '',
        date: donation.date ? format(new Date(donation.date), 'yyyy-MM-dd') : '',
        careOf: donation.careOf || '',
        note: donation.note || ''
      });
      setError('');
    }
  }, [donation, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await updateDonation(donation._id, {
        ...formData,
        amount: Number(formData.amount)
      });
      onSave(); // Trigger reload
      onClose(); // Close modal
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-xl shadow-card border border-border-default w-full max-w-md overflow-hidden"
        >
          <div className="flex justify-between items-center p-4 border-b border-border-default bg-warm-white">
            <h2 className="text-lg font-semibold text-text-primary">Edit Donation</h2>
            <button onClick={onClose} className="text-text-muted hover:text-danger transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 text-sm text-danger bg-danger-bg rounded-md border border-danger/20">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Donor Name *</label>
              <input
                type="text"
                name="donorName"
                required
                value={formData.donorName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number *</label>
              <input
                type="text"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Care Of</label>
              <input
                type="text"
                name="careOf"
                value={formData.careOf}
                onChange={handleChange}
                placeholder="Optional referral"
                className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Note</label>
              <textarea
                name="note"
                rows="2"
                value={formData.note}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg border border-border-strong rounded-md hover:bg-border-default transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
