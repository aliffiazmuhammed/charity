import React, { useState } from 'react';
import { LogOut, X } from 'lucide-react';

export default function Sidebar({ tabs, activeTab, setActiveTab, onLogout, isMobileMenuOpen, setIsMobileMenuOpen }) {
  // On desktop, it expands on hover. On mobile, it's controlled by isMobileMenuOpen state.
  const [isHovered, setIsHovered] = useState(false);

  // We are "expanded" if we are hovered on desktop, OR if the mobile menu is open.
  const isExpanded = isHovered || isMobileMenuOpen;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed md:relative top-0 left-0 h-screen flex flex-col bg-surface/40 backdrop-blur-xl border-r border-border-default text-text-primary shadow-2xl z-50 transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isExpanded ? 'w-64' : 'w-20'}
        `}
      >
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute right-4 top-6 text-text-muted hover:text-primary transition-colors"
        >
          <X size={20} />
        </button>

        {/* Profile Section */}
        <div className={`p-6 pb-4 border-b border-border-default/50 flex ${!isExpanded ? 'justify-center items-center px-2' : 'items-center gap-3'}`}>
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center border border-border-default shadow-inner shrink-0 overflow-hidden">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <p className="text-xs text-text-muted font-medium whitespace-nowrap">Welcome,</p>
            <h2 className="font-bold text-text-primary whitespace-nowrap truncate">Admin User</h2>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6 scrollbar-thin overflow-x-hidden">
          <div className={`px-6 mb-2 text-xs font-bold text-text-muted uppercase tracking-wider transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden mb-0'}`}>
            Menu
          </div>
          
          <nav className="flex flex-col gap-1 px-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={!isExpanded ? tab.label : undefined}
                  className={`
                    flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${!isExpanded ? 'justify-center px-0' : 'px-3'}
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
                  
                  <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0 ml-0'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border-default/50 bg-bg/30">
          <button
            onClick={onLogout}
            title={!isExpanded ? "Log Out" : undefined}
            className={`w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors ${!isExpanded ? 'justify-center px-0' : 'px-4'}`}
          >
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
              <LogOut size={16} />
            </div>
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0 ml-0'}`}>
              Log Out
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
