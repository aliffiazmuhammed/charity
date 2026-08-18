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

export default function Header({ onLogout, slim = false }) {
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
    <div className={`w-full flex justify-between items-center px-6 max-w-7xl mx-auto ${slim ? 'py-2 bg-transparent' : 'py-4'}`}>
      {/* Brand */}
      <h1 className={`font-bold tracking-tight text-primary ${slim ? 'text-lg' : 'text-2xl'}`}>
        Meenangadi Charitable Trust
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* WhatsApp status pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${statusStyle} cursor-help`}
          title={waStatus === 'CONNECTED' ? 'Meta API is online' : waMessage || 'Meta API is offline'}
        >
          <MessageCircle size={12} />
          <span>{statusLabel}</span>
          {/* Pulsing dot for live states */}
          {waStatus === 'CONNECTED' && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
          )}
        </div>

        {/* Logout (Hidden in slim mode since it is in sidebar) */}
        {!slim && (
          <button
            onClick={onLogout}
            className="text-sm text-primary-light hover:text-white transition-colors bg-primary/30 hover:bg-primary/50 px-3 py-1.5 rounded-md border border-primary-light/20"
          >
            Logout
          </button>
        )}
      </div>

    </div>
  );
}
