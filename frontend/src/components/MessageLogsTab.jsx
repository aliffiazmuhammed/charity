import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../config/api';

export default function MessageLogsTab({ initialCampaignId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

  const fetchLogs = async (pageToFetch = pagination.page) => {
    setLoading(true);
    try {
      let url = `/whatsapp/messages?limit=20&page=${pageToFetch}`;
      if (initialCampaignId) url += `&campaignId=${initialCampaignId}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (searchPhone) url += `&phone=${searchPhone}`;

      const res = await api.get(url);
      setLogs(res.data.messages || []);
      setPagination({
        page: res.data.currentPage || 1,
        totalPages: res.data.totalPages || 1,
        total: res.data.total || 0
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch message logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [initialCampaignId, statusFilter, searchPhone]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-yellow-100 text-yellow-700';
      case 'read': return 'bg-success/20 text-success';
      case 'failed': return 'bg-danger/20 text-danger';
      case 'scheduled': return 'bg-purple-100 text-purple-700';
      case 'queued': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="bg-surface rounded-xl shadow-card border border-border-default overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border-default bg-warm-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Activity size={20} className="text-primary" /> Message Logs
          </h2>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by phone..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto bg-bg"
            >
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-md text-sm font-medium transition-colors disabled:opacity-70 flex-shrink-0"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
        
        {error ? (
          <div className="p-8 text-center text-danger">{error}</div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg text-text-secondary text-xs uppercase border-b border-border-default">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Recipient</th>
                  <th className="px-6 py-3 font-medium">Template</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-text-muted">
                      Loading messages...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-text-muted">
                      No message logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-bg/50">
                      <td className="px-6 py-3 text-text-secondary">
                        {log.createdAt ? format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss') : '-'}
                      </td>
                      <td className="px-6 py-3 font-medium text-text-primary">
                        {log.recipientName ? `${log.recipientName} ` : ''}
                        <span className="text-text-secondary font-normal block text-xs">+{log.recipientPhone}</span>
                      </td>
                      <td className="px-6 py-3 text-text-secondary">
                        {log.templateName || log.messageType || 'custom'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-danger max-w-[200px] truncate" title={log.errorMessage}>
                        {log.errorMessage || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!error && logs.length > 0 && (
          <div className="p-4 border-t border-border-default bg-warm-white flex items-center justify-between text-sm">
            <div className="text-text-secondary">
              Showing {logs.length} of {pagination.total} messages
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="px-3 py-1 border border-border-strong rounded-md hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-text-primary font-medium px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="px-3 py-1 border border-border-strong rounded-md hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
