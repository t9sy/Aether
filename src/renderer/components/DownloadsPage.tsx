import React from 'react';
import { Download } from '../App';

interface DownloadsPageProps {
  onClose: () => void;
  downloads: Download[];
  onClear: () => void;
}

const DownloadsPage: React.FC<DownloadsPageProps> = ({ onClose, downloads, onClear }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full h-full bg-[var(--bg)] overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Downloads</h1>
              <p className="text-sm text-[var(--text-secondary)]">{downloads.length} file{downloads.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {downloads.length > 0 && (
            <button onClick={onClear} className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors">
              Clear All
            </button>
          )}
        </div>

        {/* Downloads List */}
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
            <div className="w-16 h-16 rounded-full bg-[var(--input-bg)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </div>
            <p className="text-lg font-semibold text-[var(--text)]">No downloads yet</p>
            <p className="text-sm text-[var(--text-secondary)]">Files you download will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {downloads.map(dl => {
              const percent = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0;

              return (
                <div key={dl.id} className="group glass rounded-xl p-4 flex items-center gap-4 relative overflow-hidden transition-colors hover:bg-[var(--surface-hover)]">
                  {dl.state === 'progressing' && (
                    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--accent)] transition-all duration-300" style={{ width: `${percent}%` }} />
                  )}

                  <div className="w-11 h-11 rounded-xl bg-[var(--btn-hover)] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] font-semibold truncate flex items-center gap-2" title={dl.filename}>
                      {dl.state === 'progressing' && <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />}
                      <span className="truncate">{dl.filename}</span>
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                      {dl.state === 'progressing' ? `${percent}% — ${formatSize(dl.receivedBytes)} of ${formatSize(dl.totalBytes)}`
                        : dl.state === 'paused' ? `Paused — ${formatSize(dl.receivedBytes)} of ${formatSize(dl.totalBytes)}`
                        : dl.state === 'cancelled' ? 'Cancelled'
                        : `Completed — ${formatSize(dl.totalBytes)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {dl.state === 'progressing' && (
                      <button onClick={() => (window as any).auraAPI.downloads.pause(dl.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-[var(--accent)] hover:text-white transition-colors" title="Pause">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                      </button>
                    )}
                    {dl.state === 'paused' && (
                      <button onClick={() => (window as any).auraAPI.downloads.resume(dl.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-[var(--accent)] hover:text-white transition-colors" title="Resume">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </button>
                    )}
                    {['progressing', 'paused'].includes(dl.state) && (
                      <button onClick={() => (window as any).auraAPI.downloads.cancel(dl.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-red-500 hover:text-white text-red-400 transition-colors" title="Cancel">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                    {dl.state === 'completed' && (
                      <button onClick={() => (window as any).auraAPI.downloads.openFolder(dl.filename)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--btn-hover)] hover:bg-[var(--accent)] hover:text-white transition-colors" title="Show in folder">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;
