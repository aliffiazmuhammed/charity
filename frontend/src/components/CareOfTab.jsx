import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { HandHeart, AlertCircle } from 'lucide-react';
import { getCareOfStats } from '../services/donationService';

export default function CareOfTab() {
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCareOfStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load care-of stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-surface rounded-xl border border-border-default shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border-default flex items-center gap-3 bg-warm-white">
        <HandHeart size={20} className="text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Care Of Directory</h2>
          <p className="text-sm text-text-muted">People who referred or brought in donations</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg text-text-secondary text-sm">
              <th className="p-4 font-medium border-b border-border-default">Rank</th>
              <th className="p-4 font-medium border-b border-border-default">Name</th>
              <th className="p-4 font-medium border-b border-border-default">Total Amount</th>
              <th className="p-4 font-medium border-b border-border-default">Donations</th>
              <th className="p-4 font-medium border-b border-border-default">Unique Donors</th>
              <th className="p-4 font-medium border-b border-border-default">Last Donation</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-text-muted">Loading...</td>
              </tr>
            ) : stats.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={24} className="text-warning" />
                    <p>No care-of records found.</p>
                    <p className="text-xs">Add a "Care Of" value when recording donations to see data here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              stats.map((c, index) => (
                <tr key={c.careOf} className="border-b border-border-default hover:bg-warm-white transition-colors">
                  <td className="p-4 text-sm text-text-muted font-medium">#{index + 1}</td>
                  <td className="p-4 text-sm font-semibold text-text-primary">{c.careOf}</td>
                  <td className="p-4 text-sm font-bold text-success">{formatCurrency(c.totalAmount)}</td>
                  <td className="p-4 text-sm text-text-secondary">
                    <span className="bg-bg px-2 py-1 rounded text-xs border border-border-default">{c.donationCount}</span>
                  </td>
                  <td className="p-4 text-sm text-text-secondary">{c.uniqueDonors}</td>
                  <td className="p-4 text-sm text-text-muted">{format(new Date(c.lastDate), 'dd/MM/yyyy')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
