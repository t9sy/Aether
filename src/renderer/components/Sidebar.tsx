import React, { useState, useEffect } from 'react';
import { useEssentialsStore, Essential } from '../stores/essentialsStore';

interface Bookmark {
  url: string;
  title: string;
  id: string;
}

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
  onRemoveBookmark: (id: string) => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  onOpenDownloads: (e: React.MouseEvent) => void;
  currentUrl?: string;
  currentTitle?: string;
  currentFavicon?: string;
}

type SidebarTab = 'bookmarks' | 'history' | 'notes' | 'essentials';

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  bookmarks,
  history,
  onNavigate,
  onRemoveBookmark,
  onClearHistory,
  onOpenSettings,
  onOpenDownloads,
  currentUrl,
  currentTitle,
  currentFavicon,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null);
  const [note, setNote] = useState(() => {
    try { return localStorage.getItem('aura-quicknote') || ''; }
    catch { return ''; }
  });
  const [visible, setVisible] = useState(false);
  const { essentials, addEssential, removeEssential } = useEssentialsStore();

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else if (visible) {
      const timeout = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('aura-quicknote', note);
  }, [note]);

  if (!visible) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const truncate = (str: string, len: number) =>
    str.length > len ? str.slice(0, len) + '…' : str;

  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return ''; }
  };

  const canAddEssential = essentials.length < 5 && currentUrl && currentUrl !== 'about:blank';

  const tabIcons: { id: SidebarTab; title: string; icon: JSX.Element }[] = [
    { id: 'bookmarks', title: 'Bookmarks', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
    { id: 'history', title: 'History', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { id: 'notes', title: 'Quick Note', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
    { id: 'essentials', title: 'Essentials', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  ];

  return (
    <div className={`zen-sidebar shrink-0 h-full flex z-40 ${isOpen ? 'sidebar-enter' : 'sidebar-exit'}`}>
      {/* Icon Rail */}
      <div className="zen-rail glass-sidebar flex flex-col items-center py-2 gap-1.5 w-12 shrink-0">
        {/* Essentials Pins at top of rail */}
        {essentials.map(ess => (
          <button
            key={ess.id}
            onClick={() => onNavigate(ess.url)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-all group relative"
            title={ess.title}
          >
            <img
              src={ess.favicon || getFaviconUrl(ess.url)}
              alt=""
              className="w-6 h-6 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).src = getFaviconUrl(ess.url); }}
            />
          </button>
        ))}

        {essentials.length > 0 && (
          <div className="w-6 h-px bg-[var(--border)] my-0.5" />
        )}

        {/* Tab buttons */}
        {tabIcons.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(prev => prev === tab.id ? null : tab.id)}
            className={`zen-rail-btn w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] hover:text-[var(--text)]'
            }`}
            title={tab.title}
          >
            {tab.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => { onOpenSettings(); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] hover:text-[var(--text)] transition-all" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
        <button onClick={(e) => { onOpenDownloads(e); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] hover:text-[var(--text)] transition-all" title="Downloads (Ctrl+Click for full view)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        </button>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] hover:text-[var(--text)] transition-all" title="Close Sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><line x1="18" y1="12" x2="6" y2="12" /></svg>
        </button>
      </div>

      {/* Content Panel — only visible when a tab is selected */}
      {activeTab && (
      <div className="zen-panel glass-sidebar flex flex-col w-60 border-l-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {tabIcons.find(t => t.id === activeTab)?.title}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {/* Bookmarks */}
          {activeTab === 'bookmarks' && (
            <div className="flex flex-col gap-0.5 fade-in">
              {bookmarks.length === 0 ? (
                <p className="text-[12px] text-[var(--text-secondary)] text-center py-6 opacity-70">No bookmarks yet</p>
              ) : bookmarks.map(bm => (
                <div key={bm.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--btn-hover)] transition-colors group cursor-pointer" onClick={() => onNavigate(bm.url)}>
                  <img src={getFaviconUrl(bm.url)} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text)] truncate leading-tight">{bm.title}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveBookmark(bm.id); }} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-0.5 fade-in">
              {sortedHistory.length > 0 && (
                <button onClick={onClearHistory} className="self-end text-[11px] px-2 py-0.5 rounded text-[var(--accent)] hover:bg-[var(--btn-hover)] transition-colors mb-0.5">Clear</button>
              )}
              {sortedHistory.length === 0 ? (
                <p className="text-[12px] text-[var(--text-secondary)] text-center py-6 opacity-70">No history yet</p>
              ) : sortedHistory.slice(0, 50).map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--btn-hover)] transition-colors cursor-pointer" onClick={() => onNavigate(entry.url)}>
                  <img src={getFaviconUrl(entry.url)} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text)] truncate leading-tight">{truncate(entry.title, 30)}</p>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{formatTime(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Note */}
          {activeTab === 'notes' && (
            <div className="flex flex-col gap-1.5 fade-in h-full">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Quick note..." className="flex-1 w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-md p-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--accent)] resize-none transition-colors min-h-[150px]" spellCheck={false} />
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] text-[var(--text-secondary)]">{note.length} chars</span>
                <button onClick={() => setNote('')} className="text-[11px] px-2 py-0.5 rounded text-[var(--accent)] hover:bg-[var(--btn-hover)] transition-colors">Clear</button>
              </div>
            </div>
          )}

          {/* Essentials Settings */}
          {activeTab === 'essentials' && (
            <div className="flex flex-col gap-2 fade-in">
              <p className="text-[11px] text-[var(--text-secondary)] px-1">Pin up to 5 sites to the sidebar rail for quick access.</p>

              {/* Add current page */}
              {canAddEssential && (
                <button
                  onClick={() => addEssential({ url: currentUrl!, title: currentTitle || currentUrl!, favicon: currentFavicon || '' })}
                  className="mx-1 flex items-center gap-2 px-2 py-2 rounded-md bg-[var(--accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Pin Current Page
                </button>
              )}
              {essentials.length >= 5 && (
                <p className="text-[11px] text-[var(--accent)] px-1">Maximum 5 essentials reached</p>
              )}

              {/* List */}
              <div className="flex flex-col gap-0.5">
                {essentials.length === 0 ? (
                  <p className="text-[12px] text-[var(--text-secondary)] text-center py-4 opacity-70">No essentials pinned</p>
                ) : essentials.map(ess => (
                  <div key={ess.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--btn-hover)] transition-colors group">
                    <img src={ess.favicon || getFaviconUrl(ess.url)} alt="" className="w-5 h-5 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = getFaviconUrl(ess.url); }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text)] truncate leading-tight">{ess.title}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate leading-tight">{truncate(ess.url, 30)}</p>
                    </div>
                    <button onClick={() => removeEssential(ess.id)} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0" title="Remove">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default Sidebar;
