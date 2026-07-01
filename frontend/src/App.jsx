import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PlusCircle, Users, History, MessageSquareText, HandHeart } from 'lucide-react';
import { validateToken, logout } from './services/authService';

import Login from './components/Login';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import AddDonationTab from './components/AddDonationTab';
import DonorDirectoryTab from './components/DonorDirectoryTab';
import DonationHistoryTab from './components/DonationHistoryTab';
import MessageTemplatesTab from './components/MessageTemplatesTab';
import CareOfTab from './components/CareOfTab';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'add', 'directory'

  // Listen for global logout events (from API interceptors)
  useEffect(() => {
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  // Check initial auth state
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }
      
      const isValid = await validateToken();
      if (isValid) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading Meenangadi Charitable Trust...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Define tabs configuration
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Donation History', icon: History },
    { id: 'add', label: 'Add Donation', icon: PlusCircle },
    { id: 'directory', label: 'Donor Directory', icon: Users },
    { id: 'careof', label: 'Care Of', icon: HandHeart },
    { id: 'templates', label: 'Message Templates', icon: MessageSquareText },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col items-center font-sans">
      {/* Sticky Header with WA Status */}
      <header className="w-full bg-primary-dark text-surface shadow-md sticky top-0 z-10">
        <Header onLogout={handleLogout} />
        
        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-6 pt-2">
          <nav className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-bg text-primary border-t border-x border-border-default -mb-[1px] relative z-10'
                    : 'text-primary-light hover:bg-primary hover:text-white border-transparent'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto p-6 mt-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'history' && <DonationHistoryTab />}
            {activeTab === 'add' && <AddDonationTab />}
            {activeTab === 'directory' && <DonorDirectoryTab />}
            {activeTab === 'careof' && <CareOfTab />}
            {activeTab === 'templates' && <MessageTemplatesTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border-default mt-auto py-6 bg-surface text-center">
        <p className="text-xs text-text-muted">
          Meenangadi Charitable Trust © {new Date().getFullYear()} • Secure Internal Dashboard
        </p>
      </footer>
    </div>
  );
}

export default App;
