import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Users, ChevronRight, ArrowLeft, Calendar, IndianRupee } from 'lucide-react';
import { getAllDonors, getDonorProfile } from '../services/donationService';

export default function DonorDirectoryTab() {
  const [donors, setDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the selected donor profile view
  const [selectedDonorPhone, setSelectedDonorPhone] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    loadDonors();
  }, []);

  const loadDonors = async () => {
    setIsLoading(true);
    try {
      const data = await getAllDonors();
      setDonors(data);
      setError('');
    } catch (err) {
      setError('Failed to load donor directory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = async (phone) => {
    setSelectedDonorPhone(phone);
    setIsProfileLoading(true);
    try {
      const profile = await getDonorProfile(phone);
      setDonorProfile(profile);
    } catch (err) {
      alert('Failed to load donor profile');
      setSelectedDonorPhone(null);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedDonorPhone(null);
    setDonorProfile(null);
  };

  const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  // RENDER: Detailed Profile View
  if (selectedDonorPhone) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-surface rounded-xl border border-border-default shadow-card overflow-hidden"
      >
        <div className="p-4 border-b border-border-default bg-warm-white flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="p-2 hover:bg-bg rounded-md transition-colors text-text-secondary"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">Donor Profile</h2>
        </div>

        {isProfileLoading ? (
          <div className="p-12 text-center text-text-muted">Loading profile details...</div>
        ) : donorProfile ? (
          <div>
            {/* Profile Header */}
            <div className="p-6 md:p-8 bg-primary-light/30 border-b border-border-default">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-text-primary mb-2">{donorProfile.donorName}</h1>
                  <p className="text-text-secondary text-lg">{donorProfile.phone}</p>
                </div>
                
                <div className="flex gap-4">
                  <div className="bg-surface p-4 rounded-xl border border-border-default shadow-sm text-center min-w-[120px]">
                    <p className="text-xs text-text-muted mb-1 font-medium uppercase tracking-wider">Total Given</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(donorProfile.totalDonated)}</p>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border-default shadow-sm text-center min-w-[120px]">
                    <p className="text-xs text-text-muted mb-1 font-medium uppercase tracking-wider">Donations</p>
                    <p className="text-xl font-bold text-text-primary">{donorProfile.donationCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 mt-6 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  <span>First: {format(new Date(donorProfile.firstDate), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  <span>Latest: {format(new Date(donorProfile.lastDate), 'dd MMM yyyy')}</span>
                </div>
              </div>
            </div>

            {/* Donation History Table */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Complete Donation History</h3>
              <div className="overflow-x-auto border border-border-default rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg text-text-secondary text-sm">
                      <th className="p-3 font-medium border-b border-border-default w-32">Date</th>
                      <th className="p-3 font-medium border-b border-border-default w-32">Amount</th>
                      <th className="p-3 font-medium border-b border-border-default">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donorProfile.history.map((d) => (
                      <tr key={d._id} className="border-b border-border-default hover:bg-warm-white transition-colors">
                        <td className="p-3 text-sm text-text-secondary">
                          {format(new Date(d.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="p-3 text-sm font-semibold text-text-primary">
                          {formatCurrency(d.amount)}
                        </td>
                        <td className="p-3 text-sm text-text-muted">
                          {d.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted">Profile not found.</div>
        )}
      </motion.div>
    );
  }

  // RENDER: Directory List
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-surface rounded-xl border border-border-default shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border-default flex items-center gap-3 bg-warm-white">
        <Users size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">Donor Directory</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg text-text-secondary text-sm">
              <th className="p-4 font-medium border-b border-border-default">Rank</th>
              <th className="p-4 font-medium border-b border-border-default">Donor Name</th>
              <th className="p-4 font-medium border-b border-border-default">Phone</th>
              <th className="p-4 font-medium border-b border-border-default">Total Donated</th>
              <th className="p-4 font-medium border-b border-border-default">Donations</th>
              <th className="p-4 font-medium border-b border-border-default">Last Donation</th>
              <th className="p-4 font-medium border-b border-border-default w-12"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-text-muted">Loading directory...</td>
              </tr>
            ) : donors.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-text-muted">No donors found.</td>
              </tr>
            ) : (
              donors.map((d, index) => (
                <tr 
                  key={d.phone} 
                  onClick={() => handleRowClick(d.phone)}
                  className="border-b border-border-default hover:bg-primary-light/50 transition-colors cursor-pointer group"
                >
                  <td className="p-4 text-sm text-text-muted font-medium">#{index + 1}</td>
                  <td className="p-4 text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{d.donorName}</td>
                  <td className="p-4 text-sm text-text-secondary">{d.phone}</td>
                  <td className="p-4 text-sm font-bold text-success">
                    {formatCurrency(d.totalDonated)}
                  </td>
                  <td className="p-4 text-sm text-text-secondary text-center sm:text-left">
                    <span className="bg-bg px-2 py-1 rounded text-xs border border-border-default">
                      {d.donationCount}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text-muted">
                    {format(new Date(d.lastDate), 'dd/MM/yyyy')}
                  </td>
                  <td className="p-4 text-right text-text-muted group-hover:text-primary transition-colors">
                    <ChevronRight size={18} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
