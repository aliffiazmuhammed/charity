import React from 'react';
import { LogOut, UserCircle } from 'lucide-react';

export default function Sidebar({ tabs, activeTab, setActiveTab, onLogout }) {
  return (
    <div className="w-64 h-screen flex flex-col bg-surface/40 backdrop-blur-xl border-r border-border-default text-text-primary shadow-2xl relative z-20">
      
      {/* Profile Section */}
      <div className="p-6 pb-4 border-b border-border-default/50 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-inner">
          <UserCircle size={28} className="text-primary" />
        </div>
        <div>
          <p className="text-xs text-text-muted font-medium">Welcome,</p>
          <h2 className="font-bold text-text-primary">Admin User</h2>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-6 scrollbar-thin">
        <div className="px-6 mb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
          Menu
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary/15 text-primary shadow-sm relative' 
                    : 'text-text-secondary hover:bg-bg hover:text-text-primary'
                  }
                `}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-primary rounded-r-md shadow-[0_0_8px_theme('colors.primary.DEFAULT')]" />
                )}
                
                <tab.icon size={18} className={isActive ? 'text-primary' : 'opacity-70'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border-default/50 bg-bg/30">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
            <LogOut size={16} />
          </div>
          Log Out
        </button>
      </div>
    </div>
  );
}
