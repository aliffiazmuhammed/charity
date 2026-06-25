import React, { useEffect, useState, useCallback } from 'react';
import api from '../config/api';
import { MessageCircle, ScanQrCode } from 'lucide-react';
import WhatsAppQRModal from './WhatsAppQRModal';

const WA_STATUS_LABELS = {
  READY: 'WhatsApp Connected',
  AUTHENTICATED: 'WhatsApp Authenticating...',
  QR_READY: 'Scan QR in Terminal',
  DISCONNECTED: 'WhatsApp Offline',
  AUTH_FAILURE: 'WhatsApp Auth Failed',
};

const WA_STATUS_STYLES = {
  READY: 'bg-success-bg text-success border-success/20',
  AUTHENTICATED: 'bg-info-bg text-info border-info/20',
  QR_READY: 'bg-warning-bg text-warning border-warning/20',
  DISCONNECTED: 'bg-danger-bg text-danger border-danger/20',
  AUTH_FAILURE: 'bg-danger-bg text-danger border-danger/20',
};

export default function Header({ onLogout }) {
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const fetchWAStatus = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res.data.status);
      
      // Auto-close modal if status changes from QR_READY to AUTHENTICATED/READY
      if (res.data.status === 'AUTHENTICATED' || res.data.status === 'READY') {
        setIsQrModalOpen(false);
      }
    } catch {
      setWaStatus('DISCONNECTED');
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
        <button
          onClick={async () => {
            if (waStatus === 'QR_READY') {
              setIsQrModalOpen(true);
            } else if (waStatus === 'READY') {
              if (window.confirm('Disconnect the current WhatsApp account? You will need to scan a new QR code.')) {
                try {
                  setWaStatus('DISCONNECTED'); // Optimistic update
                  await api.post('/whatsapp/logout');
                  fetchWAStatus(); // Fetch new status immediately
                } catch (error) {
                  console.error('Failed to logout WhatsApp', error);
                  alert('Failed to disconnect WhatsApp. Please try again.');
                  fetchWAStatus(); // Revert optimistic update
                }
              }
            }
          }}
          disabled={!['QR_READY', 'READY'].includes(waStatus)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusStyle} ${
            ['QR_READY', 'READY'].includes(waStatus) ? 'hover:scale-105 cursor-pointer shadow-sm' : 'cursor-default'
          }`}
          title={
            waStatus === 'QR_READY' 
              ? 'Click to scan QR code' 
              : waStatus === 'READY' 
                ? 'Click to disconnect WhatsApp' 
                : ''
          }
        >
          {waStatus === 'QR_READY' ? <ScanQrCode size={13} /> : <MessageCircle size={13} />}
          <span>{statusLabel}</span>
          {/* Pulsing dot for live states */}
          {(waStatus === 'QR_READY' || waStatus === 'AUTHENTICATED') && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-0.5" />
          )}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="text-sm text-primary-light hover:text-white transition-colors bg-primary/30 hover:bg-primary/50 px-3 py-1.5 rounded-md border border-primary-light/20"
        >
          Logout
        </button>
      </div>

      <WhatsAppQRModal 
        isOpen={isQrModalOpen} 
        onClose={() => setIsQrModalOpen(false)} 
      />
    </div>
  );
}
