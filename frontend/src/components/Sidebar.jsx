import React, { useState } from 'react';
import { LogOut, UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({ tabs, activeTab, setActiveTab, onLogout }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col bg-surface/40 backdrop-blur-xl border-r border-border-default text-text-primary shadow-2xl relative z-20 transition-all duration-300`}>
      
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-surface border border-border-default rounded-full p-1 text-text-muted hover:text-primary hover:border-primary shadow-md z-30 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Profile Section */}
      <div className={`p-6 pb-4 border-b border-border-default/50 flex ${isCollapsed ? 'justify-center items-center px-2' : 'items-center gap-3'}`}>
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center border border-border-default shadow-inner shrink-0 overflow-hidden">
          <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <p className="text-xs text-text-muted font-medium whitespace-nowrap">Welcome,</p>
            <h2 className="font-bold text-text-primary whitespace-nowrap truncate">Admin User</h2>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-6 scrollbar-thin overflow-x-hidden">
        {!isCollapsed && (
          <div className="px-6 mb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
            Menu
          </div>
        )}
        <nav className="flex flex-col gap-1 px-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={isCollapsed ? tab.label : undefined}
                className={`
                  flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isCollapsed ? 'justify-center px-0' : 'px-3'}
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
                
                <tab.icon size={18} className={isActive ? 'text-primary shrink-0' : 'opacity-70 shrink-0'} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{tab.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border-default/50 bg-bg/30">
        <button
          onClick={onLogout}
          title={isCollapsed ? "Log Out" : undefined}
          className={`w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
        >
          <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
            <LogOut size={16} />
          </div>
          {!isCollapsed && <span className="whitespace-nowrap">Log Out</span>}
        </button>
      </div>
    </div>
  );
}
