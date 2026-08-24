import React, { useState, useEffect } from 'react';
import { getCampaignStatus, retryFailedCampaignMessages, stopCampaign, deleteCampaign } from '../services/campaignService';
import { 
  X, RefreshCw, Send, CheckCheck, Eye, AlertTriangle, 
  Clock, Inbox, Search, Calendar, Play, Square, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

export default function CampaignDetailsModal({ campaignId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await getCampaignStatus(campaignId);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load campaign details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(() => fetchDetails(true), 15000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      await retryFailedCampaignMessages(campaignId);
      await fetchDetails(true);
    } catch (err) {
      console.error(err);
      alert('Failed to retry messages');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Are you sure you want to stop the remaining queued/scheduled messages?')) return;
    setActionLoading(true);
    try {
      await stopCampaign(campaignId);
      await fetchDetails(true);
    } catch (err) {
      console.error(err);
      alert('Failed to stop campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to completely delete this campaign and its history?')) return;
    setActionLoading(true);
    try {
      await deleteCampaign(campaignId);
      onClose(); // Close the modal since the campaign is gone
    } catch (err) {
      console.error(err);
      alert('Failed to delete campaign');
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-xl shadow-card w-full max-w-5xl h-[85vh] flex items-center justify-center">
          <div className="text-text-muted animate-pulse">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-xl shadow-card w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center">
          <div className="text-danger mb-4">{error}</div>
          <button onClick={onClose} className="px-4 py-2 bg-bg hover:bg-border-default rounded-md text-sm transition-colors">Close</button>
        </div>
      </div>
    );
  }

  const { stats, messages } = data;

  // Derive template name and campaign name from the first message
  const templateName = messages[0]?.templateName || 'Unknown Template';
  const campaignName = messages[0]?.campaignName || campaignId;
  const startedAt = messages[messages.length - 1]?.createdAt || new Date();

  const filteredMessages = messages.filter(m => {
    const s = search.toLowerCase();
    return (m.recipientName || '').toLowerCase().includes(s) || 
           (m.recipientPhone || '').includes(s) || 
           (m.status || '').toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-card w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-default bg-warm-white flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              Dashboard: {campaignName}
            </h2>
            <div className="flex gap-4 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Send size={14} /> Template: <span className="font-medium text-text-primary">{templateName}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} /> Started: <span className="font-medium text-text-primary">{format(new Date(startedAt), 'dd MMM yyyy, hh:mm a')}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(stats.queued > 0 || stats.scheduled > 0) && (
              <button 
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-md text-sm font-medium transition-colors disabled:opacity-70"
              >
                <Square size={16} /> Stop
              </button>
            )}
            {stats.failed > 0 && (
              <button 
                onClick={handleRetry}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md text-sm font-medium transition-colors disabled:opacity-70"
              >
                <Play size={16} /> Resume / Retry ({stats.failed})
              </button>
            )}
            <button 
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-bg text-danger hover:bg-danger/20 rounded-md text-sm font-medium transition-colors disabled:opacity-70"
            >
              <Trash2 size={16} /> Delete
            </button>
            <button 
              onClick={() => fetchDetails(true)} 
              disabled={refreshing || actionLoading} 
              className="p-2 text-text-muted hover:text-primary hover:bg-bg rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-danger hover:bg-bg rounded-md transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 bg-bg border-b border-border-default shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <StatCard label="Total" value={stats.total} color="text-text-primary" bg="bg-surface" />
            <StatCard label="Sent" value={stats.sent} color="text-blue-600" bg="bg-blue-50" icon={<Send size={16} className="text-blue-500" />} />
            <StatCard label="Delivered" value={stats.delivered} color="text-yellow-600" bg="bg-yellow-50" icon={<CheckCheck size={16} className="text-yellow-500" />} />
            <StatCard label="Read" value={stats.read} color="text-success" bg="bg-success/10" icon={<Eye size={16} className="text-success" />} />
            <StatCard label="Queued" value={(stats.queued || 0) + (stats.scheduled || 0)} color="text-purple-600" bg="bg-purple-50" icon={<Clock size={16} className="text-purple-500" />} />
            
            <div className={`rounded-xl p-4 flex flex-col justify-between border ${stats.failed > 0 ? 'bg-danger/10 border-danger/20' : 'bg-surface border-border-default'}`}>
              <div>
                <div className="flex justify-between items-start">
                  <div className="text-xs font-medium text-text-muted flex items-center gap-1">
                    <AlertTriangle size={16} className={stats.failed > 0 ? 'text-danger' : 'text-text-muted'} /> Failed
                  </div>
                  {stats.failed > 0 && (
                    <button 
                      onClick={handleRetry}
                      disabled={actionLoading}
                      className="text-[10px] uppercase tracking-wider font-bold bg-danger text-white px-2 py-0.5 rounded shadow-sm hover:bg-danger-dark transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {actionLoading ? <RefreshCw size={10} className="animate-spin" /> : 'Retry'}
                    </button>
                  )}
                </div>
                <div className={`text-2xl font-bold mt-1 ${stats.failed > 0 ? 'text-danger' : 'text-text-primary'}`}>
                  {stats.failed}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-hidden flex flex-col bg-surface">
          <div className="px-6 py-3 border-b border-border-default flex justify-between items-center bg-warm-white shrink-0">
            <h3 className="font-semibold text-text-primary">Recipient Details</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                placeholder="Search phone, name, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-border-strong rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-text-muted">No messages found matching "{search}"</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-bg text-text-muted sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-l-md">Recipient</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Time (Last Update)</th>
                    <th className="px-4 py-3 font-medium rounded-r-md">Details / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {filteredMessages.map((msg, idx) => (
                    <tr key={msg._id || idx} className="hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{msg.recipientName || 'Unknown'}</div>
                        <div className="text-xs text-text-muted">{msg.recipientPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {msg.failedAt ? format(new Date(msg.failedAt), 'dd MMM, hh:mm:ss a') :
                         msg.readAt ? format(new Date(msg.readAt), 'dd MMM, hh:mm:ss a') :
                         msg.deliveredAt ? format(new Date(msg.deliveredAt), 'dd MMM, hh:mm:ss a') :
                         msg.sentAt ? format(new Date(msg.sentAt), 'dd MMM, hh:mm:ss a') :
                         msg.scheduledAt ? `Scheduled: ${format(new Date(msg.scheduledAt), 'dd MMM, hh:mm a')}` :
                         'Queued for background'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {msg.status === 'failed' ? (
                          <div className="flex items-center gap-1 text-danger max-w-xs truncate" title={msg.errorMessage}>
                            <AlertTriangle size={12} /> {msg.errorMessage || 'Unknown error'}
                          </div>
                        ) : msg.waMessageId ? (
                          <div className="text-text-muted font-mono text-[10px] truncate max-w-xs" title={msg.waMessageId}>
                            {msg.waMessageId}
                          </div>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg, icon }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-border-default flex flex-col justify-between`}>
      <div className="text-xs font-medium text-text-muted flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value || 0}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    queued: 'bg-purple-100 text-purple-700 border-purple-200',
    scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
    sent: 'bg-blue-100 text-blue-700 border-blue-200',
    delivered: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    read: 'bg-success/20 text-success-dark border-success/30',
    failed: 'bg-danger/10 text-danger border-danger/20'
  };

  const currentStyle = styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStyle}`}>
      {status}
    </span>
  );
}
