import React from 'react';
import { Download } from '../App';

interface DownloadsProps {
  onClose: () => void;
  downloads: Download[];
  onClear: () => void;
}

const Downloads: React.FC<DownloadsProps> = ({ onClose, downloads, onClear }) => {
  return (
    <>
      <div className="absolute inset-0 z-40" onClick={onClose} />
      
      <div 
        className="absolute bottom-[20px] left-3 z-50 w-[340px] max-h-[460px] flex flex-col rounded-[20px] border border-[var(--border)] shadow-2xl overflow-hidden slide-in-bottom-left" 
        style={{ 
          background: 'var(--surface)', 
          backdropFilter: 'blur(24px)'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--surface-hover)]">
          <h3 className="font-semibold text-[var(--text)] text-sm">Downloads</h3>
          <div className="flex items-center gap-3">
            {downloads.length > 0 && (
              <button onClick={onClear} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-red-400 transition-colors">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] text-[var(--text-secondary)] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <div className="flex flex-col gap-1.5">
            {downloads.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-3 opacity-60">
                <div className="w-12 h-12 rounded-full bg-[var(--input-bg)] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </div>
                <p className="text-sm font-medium text-[var(--text)]">No downloads yet</p>
                <p className="text-xs text-[var(--text-secondary)]">Your recent files will appear here</p>
              </div>
            ) : downloads.map(dl => {
              const percent = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0;
              const sizeMB = (dl.totalBytes / (1024 * 1024)).toFixed(1);
              
              return (
                <div key={dl.id} className="group flex flex-col p-2.5 rounded-xl hover:bg-[var(--input-bg)] transition-colors relative overflow-hidden">
                  {dl.state === 'progressing' && (
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--accent)] transition-all duration-300" style={{ width: `${percent}%` }} />
                  )}
                  
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--btn-hover)] flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text)] font-semibold truncate flex items-center gap-1.5" title={dl.filename}>
                        {dl.state === 'progressing' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />}
                        <span className="truncate">{dl.filename}</span>
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
                        {dl.state === 'progressing' ? `${percent}% • ${sizeMB} MB` : dl.state === 'paused' ? 'Paused' : dl.state === 'cancelled' ? 'Cancelled' : `Completed • ${sizeMB} MB`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {dl.state === 'progressing' && (
                        <button onClick={(e) => { e.stopPropagation(); (window as any).auraAPI.downloads.pause(dl.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-[var(--accent)] hover:text-white transition-colors" title="Pause">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        </button>
                      )}
                      {dl.state === 'paused' && (
                        <button onClick={(e) => { e.stopPropagation(); (window as any).auraAPI.downloads.resume(dl.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-[var(--accent)] hover:text-white transition-colors" title="Resume">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </button>
                      )}
                      {['progressing', 'paused'].includes(dl.state) && (
                        <button onClick={(e) => { e.stopPropagation(); (window as any).auraAPI.downloads.cancel(dl.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-red-500 hover:text-white text-red-400 transition-colors" title="Cancel">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      )}
                      {dl.state === 'completed' && (
                        <button onClick={(e) => { e.stopPropagation(); (window as any).auraAPI.downloads.openFolder(dl.filename); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-[var(--accent)] hover:text-white transition-colors" title="Show in folder">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Downloads;
