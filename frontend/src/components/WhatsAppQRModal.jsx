import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../config/api';

export default function WhatsAppQRModal({ isOpen, onClose }) {
  const [qrString, setQrString] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll for QR code when open
  useEffect(() => {
    let intervalId;

    const fetchQR = async () => {
      try {
        const response = await api.get('/whatsapp/qr');
        setQrString(response.data.qr);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // No QR available (might be connected, or generating)
          // We will let the parent close it if connected
          setError('Waiting for QR code generation...');
        } else {
          setError('Failed to fetch QR code.');
        }
        setIsLoading(false);
      }
    };

    if (isOpen) {
      setIsLoading(true);
      fetchQR();
      intervalId = setInterval(fetchQR, 5000); // Check every 5s in case it refreshes
    } else {
      setQrString(null);
      setError(null);
    }

    return () => clearInterval(intervalId);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-4 border-b border-border-default flex justify-between items-center bg-primary text-surface">
            <h3 className="font-semibold flex items-center gap-2">
              <Smartphone size={18} /> Link WhatsApp
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col items-center text-center min-h-[300px] justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center text-text-muted gap-4">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p>Loading QR Code...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center text-warning gap-4 p-4 bg-warning-bg rounded-lg border border-warning/20">
                <AlertCircle size={32} />
                <p className="text-sm">{error}</p>
              </div>
            ) : qrString ? (
              <div className="space-y-6">
                <div className="p-4 bg-white rounded-xl shadow-sm border border-border-default inline-block mx-auto">
                  <QRCodeSVG 
                    value={qrString} 
                    size={200}
                    level="L"
                    includeMargin={false}
                  />
                </div>
                <div className="text-sm text-text-secondary space-y-2">
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong></p>
                  <p>3. Tap <strong>Link a Device</strong> and scan this code</p>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
