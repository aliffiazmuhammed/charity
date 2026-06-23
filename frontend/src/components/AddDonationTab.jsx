import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Info, CheckCircle2, UserPlus } from 'lucide-react';
import { checkReturningDonor, submitDonation } from '../services/donationService';

export default function AddDonationTab() {
  const [formData, setFormData] = useState({
    donorName: '',
    phone: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });
  
  const [returningInfo, setReturningInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Check for returning donor when phone changes
  useEffect(() => {
    const checkPhone = async () => {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        try {
          const res = await checkReturningDonor(cleanPhone);
          if (res.isReturning) {
            setReturningInfo(res);
          } else {
            setReturningInfo(null);
          }
        } catch (err) {
          setReturningInfo(null);
        }
      } else {
        setReturningInfo(null);
      }
    };

    const timer = setTimeout(checkPhone, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [formData.phone]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await submitDonation({
        ...formData,
        amount: Number(formData.amount)
      });
      
      setSuccessMsg('Donation successfully recorded!');
      setFormData({
        donorName: '',
        phone: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: ''
      });
      setReturningInfo(null);
      
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.errors?.join(', ') || err.message || 'Failed to submit donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-xl border border-border-default shadow-card p-6 md:p-8"
      >
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-default">
          <div className="p-2 bg-primary-light text-primary rounded-lg">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">New Donation Entry</h2>
            <p className="text-sm text-text-muted">Record a new contribution to the registry.</p>
          </div>
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-success-bg text-success border border-success/20 p-4 rounded-lg mb-6 flex items-center gap-3 overflow-hidden"
            >
              <CheckCircle2 size={20} />
              <span className="font-medium">{successMsg}</span>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-danger-bg text-danger border border-danger/20 p-4 rounded-lg mb-6 overflow-hidden"
            >
              <span className="font-medium">{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Donor Name *</label>
              <input
                type="text"
                name="donorName"
                value={formData.donorName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg transition-colors"
                placeholder="Full Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg transition-colors"
                placeholder="e.g. 9876543210"
              />
              
              {/* Returning Donor Alert */}
              <AnimatePresence>
                {returningInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-2 text-xs flex items-start gap-1.5 p-2 bg-info-bg text-info rounded border border-info/20"
                  >
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Returning donor</strong> — {returningInfo.previousCount} previous donations, ₹{returningInfo.totalDonated.toLocaleString('en-IN')} total.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                min="1"
                value={formData.amount}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg transition-colors"
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Note (Optional)</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-bg transition-colors resize-none"
              placeholder="Any additional details..."
            />
          </div>

          <div className="pt-4 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary hover:bg-primary-mid text-surface font-medium rounded-md shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Donation Entry'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
