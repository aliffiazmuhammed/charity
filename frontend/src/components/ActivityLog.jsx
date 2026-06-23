import React from 'react';

export default function ActivityLog({ donations }) {
  return (
    <section className="flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-slate-100 flex items-center gap-2">
        <span>Recent Activity</span>
        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-normal">Live</span>
      </h2>

      <div className="flex-1 space-y-4 max-h-[460px] overflow-y-auto pr-2">
        {donations.length === 0 ? (
          <div className="h-full border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
            <span className="text-slate-600 text-sm mb-1">No donations recorded yet</span>
            <span className="text-xs text-slate-700">Connect the backend database or submit the first donation to start.</span>
          </div>
        ) : (
          donations.map((donation, index) => (
            <div key={donation._id || index} className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-xl flex justify-between items-start hover:border-slate-700/80 transition-colors">
              <div>
                <h3 className="font-semibold text-slate-200">{donation.donorName}</h3>
                {donation.message && <p className="text-sm text-slate-400 mt-1">"{donation.message}"</p>}
                <span className="text-[10px] text-slate-500 block mt-2">
                  {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : 'Just now'}
                </span>
              </div>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg text-sm">
                ${donation.amount}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
