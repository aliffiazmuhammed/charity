import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Send, CheckCheck, Eye, AlertTriangle, Clock, Inbox } from 'lucide-react';
import api from '../config/api';

export default function UsageTab() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await api.get('/whatsapp/usage');
      setUsage(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Auto-refresh every 30s
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !usage) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted">Loading usage data...</div>
      </div>
    );
  }

  if (error && !usage) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-danger">{error}</div>
      </div>
    );
  }

  const { dailyLimit, today, allTime, pendingInQueue } = usage;
  const usagePercent = Math.min(100, Math.round((today.successfullySent / dailyLimit) * 100));

  // Color for progress bar
  const progressColor = usagePercent >= 90 ? 'bg-danger' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-success';
  const progressBg = usagePercent >= 90 ? 'bg-danger/10' : usagePercent >= 70 ? 'bg-yellow-100' : 'bg-success/10';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* Daily Limit Card */}
      <div className="bg-surface rounded-xl shadow-card border border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default bg-warm-white flex justify-between items-center">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" /> Daily Messaging Usage
          </h2>
          <button
            onClick={fetchUsage}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-md text-sm font-medium transition-colors disabled:opacity-70"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-text-secondary">
                <span className="font-bold text-text-primary text-lg">{today.successfullySent}</span>
                <span className="mx-1">/</span>
                <span>{dailyLimit} messages sent today</span>
              </div>
              <div className={`text-sm font-semibold ${usagePercent >= 90 ? 'text-danger' : usagePercent >= 70 ? 'text-yellow-600' : 'text-success'}`}>
                {today.remaining} remaining
              </div>
            </div>
            <div className={`w-full h-4 rounded-full ${progressBg} overflow-hidden`}>
              <div
                className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-text-muted">{usagePercent}% used</span>
              <span className="text-xs text-text-muted">Meta Tier Limit: {dailyLimit}/day</span>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <StatCard icon={<Send size={18} />} label="Sent" value={today.sent} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={<CheckCheck size={18} />} label="Delivered" value={today.delivered} color="text-yellow-600" bg="bg-yellow-50" />
            <StatCard icon={<Eye size={18} />} label="Read" value={today.read} color="text-success" bg="bg-success/10" />
            <StatCard icon={<AlertTriangle size={18} />} label="Failed" value={today.failed} color="text-danger" bg="bg-danger/10" />
            <StatCard icon={<Clock size={18} />} label="Queued" value={today.queued} color="text-purple-600" bg="bg-purple-50" />
            <StatCard icon={<Inbox size={18} />} label="In Queue" value={pendingInQueue} color="text-indigo-600" bg="bg-indigo-50" />
          </div>
        </div>
      </div>

      {/* All-Time Stats */}
      <div className="bg-surface rounded-xl shadow-card border border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default bg-warm-white">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" /> All-Time Statistics
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <StatCardLarge label="Total Messages" value={allTime.total} color="text-text-primary" />
            <StatCardLarge label="Sent" value={allTime.sent} color="text-blue-600" />
            <StatCardLarge label="Delivered" value={allTime.delivered} color="text-yellow-600" />
            <StatCardLarge label="Read" value={allTime.read} color="text-success" />
            <StatCardLarge label="Failed" value={allTime.failed} color="text-danger" />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 About Meta Messaging Limits</p>
        <ul className="list-disc ml-5 space-y-1 text-blue-700">
          <li><strong>New accounts</strong> start at <strong>250 messages/day</strong>.</li>
          <li>As your quality improves, Meta automatically upgrades you: <strong>250 → 1,000 → 10,000 → 100,000/day</strong>.</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-lg p-3 flex flex-col items-center gap-1`}>
      <div className={color}>{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

function StatCardLarge({ label, value, color }) {
  return (
    <div className="bg-bg rounded-lg p-4 text-center border border-border-default">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
    </div>
  );
}
