import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PlusCircle, Users, History, MessageSquareText, HandHeart, Megaphone, Activity, BarChart3, MessageCircle } from 'lucide-react';
import { validateToken, logout } from './services/authService';

import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardTab from './components/DashboardTab';
import AddDonationTab from './components/AddDonationTab';
import DonorDirectoryTab from './components/DonorDirectoryTab';
import DonationHistoryTab from './components/DonationHistoryTab';
import MessageTemplatesTab from './components/MessageTemplatesTab';
import CareOfTab from './components/CareOfTab';
import CampaignsTab from './components/CampaignsTab';
import MessageLogsTab from './components/MessageLogsTab';
import UsageTab from './components/UsageTab';
import InboxTab from './components/InboxTab';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

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
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'inbox', label: 'Inbox', icon: MessageCircle },
    { id: 'logs', label: 'Message Logs', icon: Activity },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-bg text-text-primary font-sans overflow-hidden">
      
      {/* Sidebar Component */}
      <Sidebar 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Slim Header */}
        <header className="w-full bg-surface/80 backdrop-blur-md border-b border-border-default sticky top-0 z-10">
          <Header onLogout={handleLogout} slim={true} />
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && <DashboardTab />}
              {activeTab === 'history' && <DonationHistoryTab />}
              {activeTab === 'add' && <AddDonationTab />}
              {activeTab === 'directory' && <DonorDirectoryTab />}
              {activeTab === 'careof' && <CareOfTab />}
              {activeTab === 'templates' && <MessageTemplatesTab />}
              {activeTab === 'campaigns' && <CampaignsTab />}
              {activeTab === 'inbox' && <InboxTab />}
              {activeTab === 'logs' && <MessageLogsTab />}
              {activeTab === 'usage' && <UsageTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
