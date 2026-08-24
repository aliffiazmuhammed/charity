import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { getDonations } from '../services/donationService';
import { format } from 'date-fns';

export default function CareOfDetailsModal({ isOpen, onClose, careOfName }) {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && careOfName) {
      loadDonations();
    }
  }, [isOpen, careOfName]);

  const loadDonations = async () => {
    setIsLoading(true);
    try {
      // Fetch donations filtered by careOf. Fetching a large number to ensure all are shown.
      const data = await getDonations({ careOf: careOfName, limit: 10000, sortBy: 'date', sortOrder: 'desc' });
      setDonations(data.donations || []);
    } catch (err) {
      console.error('Failed to load care of details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-xl shadow-card border border-border-default w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="flex justify-between items-center p-4 border-b border-border-default bg-warm-white flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Donations for Care Of: {careOfName}</h2>
              <p className="text-sm text-text-muted">Showing recent donations</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-danger transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto p-4 flex-grow">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <span className="text-text-muted">Loading donations...</span>
              </div>
            ) : donations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-text-muted">
                <AlertCircle size={24} className="text-warning" />
                <p>No donations found for this person.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg text-text-secondary text-sm">
                      <th className="p-3 font-medium border-b border-border-default">Date</th>
                      <th className="p-3 font-medium border-b border-border-default">Donor Name</th>
                      <th className="p-3 font-medium border-b border-border-default">Phone</th>
                      <th className="p-3 font-medium border-b border-border-default">Amount</th>
                      <th className="p-3 font-medium border-b border-border-default">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map(d => (
                      <tr key={d._id} className="border-b border-border-default hover:bg-warm-white transition-colors">
                        <td className="p-3 text-sm text-text-secondary">
                          {format(new Date(d.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="p-3 text-sm font-medium text-text-primary">{d.donorName}</td>
                        <td className="p-3 text-sm text-text-secondary">{d.phone}</td>
                        <td className="p-3 text-sm font-semibold text-success">
                          {formatCurrency(d.amount)}
                        </td>
                        <td className="p-3 text-sm text-text-muted max-w-xs truncate" title={d.note}>
                          {d.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
