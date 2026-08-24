import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Search } from 'lucide-react';
import { getDonations } from '../services/donationService';
import { format } from 'date-fns';

export default function CareOfDetailsModal({ isOpen, onClose, careOfName }) {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && careOfName) {
      loadDonations();
      setSearchQuery('');
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

  const filteredDonations = donations.filter(d => 
    d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone.includes(searchQuery) ||
    (d.note && d.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              <p className="text-sm text-text-muted">Total {donations.length} donations</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-danger transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-border-default bg-surface">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="text"
                placeholder="Search donors by name, phone or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-bg"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-4 flex-grow">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <span className="text-text-muted">Loading donations...</span>
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-text-muted">
                <AlertCircle size={24} className="text-warning" />
                <p>{donations.length === 0 ? 'No donations found for this person.' : 'No donors match your search.'}</p>
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
                    {filteredDonations.map(d => (
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
