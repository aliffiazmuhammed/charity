import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Users, 
  ChevronRight, 
  ArrowLeft, 
  Calendar, 
  IndianRupee,
  Search,
  ChevronLeft,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';
import { getAllDonors, getDonorProfile } from '../services/donationService';

export default function DonorDirectoryTab() {
  const [donors, setDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('totalDonated');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Response Metadata
  const [totalPages, setTotalPages] = useState(1);
  const [totalDonorsCount, setTotalDonorsCount] = useState(0);

  // State for the selected donor profile view
  const [selectedDonorPhone, setSelectedDonorPhone] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const loadDonors = async () => {
    setIsLoading(true);
    try {
      const data = await getAllDonors({
        search: searchQuery,
        page,
        limit,
        sortBy,
        sortOrder
      });
      setDonors(data.donors || []);
      setTotalPages(data.totalPages || 1);
      setTotalDonorsCount(data.totalDonors || 0);
      setError('');
    } catch (err) {
      setError('Failed to load donor directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 on new search or sort change
    setPage(1);
  }, [searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDonors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, page, limit, sortBy, sortOrder]);

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

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180 text-primary' : 'text-primary'} />;
  };

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
                      <th className="p-3 font-medium border-b border-border-default">Care Of</th>
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
                        <td className="p-3 text-sm text-text-secondary">{d.careOf || '-'}</td>
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
      <div className="p-4 border-b border-border-default flex flex-col md:flex-row justify-between items-center gap-4 bg-warm-white">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Donor Directory</h2>
            <p className="text-sm text-text-muted">Viewing {totalDonorsCount} unique donors</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
            />
          </div>
          
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:border-primary bg-surface"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg text-text-secondary text-sm select-none">
              <th className="p-4 font-medium border-b border-border-default w-16">Rank</th>
              <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('donorName')}>
                <div className="flex items-center gap-2">Donor Name {renderSortIcon('donorName')}</div>
              </th>
              <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('phone')}>
                <div className="flex items-center gap-2">Phone {renderSortIcon('phone')}</div>
              </th>
              <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('totalDonated')}>
                <div className="flex items-center gap-2">Total Donated {renderSortIcon('totalDonated')}</div>
              </th>
              <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('donationCount')}>
                <div className="flex items-center gap-2">Donations {renderSortIcon('donationCount')}</div>
              </th>
              <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('lastDate')}>
                <div className="flex items-center gap-2">Last Donation {renderSortIcon('lastDate')}</div>
              </th>
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
                <td colSpan="7" className="p-8 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={24} className="text-warning" />
                    <p>No donors found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              donors.map((d, index) => (
                <tr 
                  key={d.phone} 
                  onClick={() => handleRowClick(d.phone)}
                  className="border-b border-border-default hover:bg-primary-light/50 transition-colors cursor-pointer group"
                >
                  <td className="p-4 text-sm text-text-muted font-medium">#{(page - 1) * limit + index + 1}</td>
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

      {/* Pagination Controls */}
      <div className="p-4 border-t border-border-default bg-warm-white flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Showing {donors.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalDonorsCount)} of {totalDonorsCount} records
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
  );
}
