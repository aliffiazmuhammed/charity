import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  Users, 
  UserCheck, 
  CreditCard, 
  Search, 
  Trash2, 
  Download,
  AlertCircle
} from 'lucide-react';
import { getDashboardStats, getDonations, deleteDonation, exportDonationsCSV } from '../services/donationService';

const StatCard = ({ title, value, icon: Icon, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-surface p-6 rounded-xl border border-border-default shadow-card flex items-center gap-4"
  >
    <div className="p-3 bg-primary-light text-primary rounded-lg">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-text-secondary text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
    </div>
  </motion.div>
);

export default function DashboardTab() {
  const [stats, setStats] = useState({ totalRaised: 0, donationCount: 0, uniqueDonors: 0, averageAmount: 0 });
  const [donations, setDonations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async (query = '') => {
    setIsLoading(true);
    try {
      const [statsData, donationsData] = await Promise.all([
        getDashboardStats(),
        getDonations(query)
      ]);
      setStats(statsData);
      setDonations(donationsData);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadData(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) return;
    try {
      await deleteDonation(id);
      loadData(searchQuery); // Reload to update stats and list
    } catch (err) {
      alert('Failed to delete donation');
    }
  };

  const handleExport = () => {
    exportDonationsCSV().catch(() => alert('Failed to export CSV'));
  };

  const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Raised" value={formatCurrency(stats.totalRaised)} icon={TrendingUp} delay={0.1} />
        <StatCard title="Total Donations" value={stats.donationCount} icon={CreditCard} delay={0.2} />
        <StatCard title="Unique Donors" value={stats.uniqueDonors} icon={Users} delay={0.3} />
        <StatCard title="Avg. Donation" value={formatCurrency(stats.averageAmount)} icon={UserCheck} delay={0.4} />
      </div>

      {/* Main Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-surface rounded-xl border border-border-default shadow-card overflow-hidden"
      >
        <div className="p-4 border-b border-border-default flex flex-col sm:flex-row justify-between items-center gap-4 bg-warm-white">
          <h2 className="text-lg font-semibold text-text-primary">Recent Donations</h2>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
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
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gold-light text-gold-dark hover:bg-gold/20 border border-gold/30 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg text-text-secondary text-sm">
                <th className="p-4 font-medium border-b border-border-default">Date</th>
                <th className="p-4 font-medium border-b border-border-default">Name</th>
                <th className="p-4 font-medium border-b border-border-default">Phone</th>
                <th className="p-4 font-medium border-b border-border-default">Amount</th>
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
      </motion.div>
    </div>
  );
}
