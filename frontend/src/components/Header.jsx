import React, { useEffect, useState, useCallback } from 'react';
import api from '../config/api';
import { MessageCircle } from 'lucide-react';

const WA_STATUS_LABELS = {
  CONNECTED: 'Meta Connected',
  DISCONNECTED: 'Meta Disconnected',
  ERROR: 'Meta Error',
  NOT_CONFIGURED: 'Not Configured',
};

const WA_STATUS_STYLES = {
  CONNECTED: 'bg-success-bg text-success border-success/20',
  DISCONNECTED: 'bg-danger-bg text-danger border-danger/20',
  ERROR: 'bg-danger-bg text-danger border-danger/20',
  NOT_CONFIGURED: 'bg-warning-bg text-warning border-warning/20',
};

export default function Header({ onLogout }) {
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [waMessage, setWaMessage] = useState('');

  const fetchWAStatus = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res.data.status);
      setWaMessage(res.data.message || '');
    } catch (err) {
      setWaStatus('DISCONNECTED');
      setWaMessage('Failed to connect to backend server');
    }
  }, []);

  // Poll WhatsApp status every 10 seconds
  useEffect(() => {
    fetchWAStatus();
    const interval = setInterval(fetchWAStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchWAStatus]);

  const statusLabel = WA_STATUS_LABELS[waStatus] || 'WhatsApp Offline';
  const statusStyle = WA_STATUS_STYLES[waStatus] || WA_STATUS_STYLES.DISCONNECTED;

  return (
    <div className="w-full flex justify-between items-center py-4 px-6 max-w-6xl mx-auto">
      {/* Brand */}
      <h1 className="text-2xl font-bold tracking-tight text-gold-light">
        Meenangadi Charitable Trust
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* WhatsApp status pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusStyle} cursor-help`}
          title={waStatus === 'CONNECTED' ? 'Meta API is online' : waMessage || 'Meta API is offline'}
        >
          <MessageCircle size={13} />
          <span>{statusLabel}</span>
          {/* Pulsing dot for live states */}
          {waStatus === 'CONNECTED' && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-0.5" />
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="text-sm text-primary-light hover:text-white transition-colors bg-primary/30 hover:bg-primary/50 px-3 py-1.5 rounded-md border border-primary-light/20"
        >
          Logout
        </button>
      </div>

    </div>
  );
}
