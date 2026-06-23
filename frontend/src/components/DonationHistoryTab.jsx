import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Search, 
  Trash2, 
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { getDonations, deleteDonation, exportDonationsCSV } from '../services/donationService';

export default function DonationHistoryTab() {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'donorName', 'phone', 'amount'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  
  // Response Metadata
  const [totalPages, setTotalPages] = useState(1);
  const [totalDonations, setTotalDonations] = useState(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getDonations({
        search: searchQuery,
        page,
        limit,
        sortBy,
        sortOrder
      });
      setDonations(data.donations || []);
      setTotalPages(data.totalPages || 1);
      setTotalDonations(data.totalDonations || 0);
    } catch (err) {
      console.error('Failed to load donation history:', err);
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
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, page, limit, sortBy, sortOrder]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) return;
    try {
      await deleteDonation(id);
      loadData(); // Reload to update list
    } catch (err) {
      alert('Failed to delete donation');
    }
  };

  const handleExport = () => {
    exportDonationsCSV().catch(() => alert('Failed to export CSV'));
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default new sorts to desc (most recent/highest first)
    }
  };

  const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180 text-primary' : 'text-primary'} />;
  };
  
  return (
    <div className="space-y-6">
      {/* Header and Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-surface rounded-xl border border-border-default shadow-card overflow-hidden"
      >
        <div className="p-4 border-b border-border-default flex flex-col md:flex-row justify-between items-center gap-4 bg-warm-white">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Donation History</h2>
            <p className="text-sm text-text-muted">Viewing {totalDonations} total records</p>
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

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gold-light text-gold-dark hover:bg-gold/20 border border-gold/30 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg text-text-secondary text-sm select-none">
                <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-2">Date {renderSortIcon('date')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('donorName')}>
                  <div className="flex items-center gap-2">Name {renderSortIcon('donorName')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('phone')}>
                  <div className="flex items-center gap-2">Phone {renderSortIcon('phone')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default cursor-pointer hover:bg-border-default/50 transition-colors" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-2">Amount {renderSortIcon('amount')}</div>
                </th>
                <th className="p-4 font-medium border-b border-border-default">Note</th>
                <th className="p-4 font-medium border-b border-border-default w-16"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">Loading...</td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="text-warning" />
                      <p>No donations found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d._id} className="border-b border-border-default hover:bg-warm-white transition-colors">
                    <td className="p-4 text-sm text-text-secondary">
                      {format(new Date(d.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-4 text-sm font-medium text-text-primary">{d.donorName}</td>
                    <td className="p-4 text-sm text-text-secondary">{d.phone}</td>
                    <td className="p-4 text-sm font-semibold text-success bg-success-bg/50 rounded inline-block mt-3 ml-4 px-2 py-0.5">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="p-4 text-sm text-text-muted max-w-xs truncate" title={d.note}>
                      {d.note || '-'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(d._id)}
                        className="text-text-muted hover:text-danger hover:bg-danger-bg p-1.5 rounded transition-colors"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
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
            Showing {donations.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalDonations)} of {totalDonations} records
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
    </div>
  );
}
