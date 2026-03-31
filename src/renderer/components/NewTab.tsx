import React, { useState, useEffect } from 'react';
import logoSrc from '../logo-comp-transparent.png';

interface NewTabProps {
  onNavigate: (url: string) => void;
}

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: '1', name: 'Google', url: 'https://www.google.com' },
  { id: '2', name: 'YouTube', url: 'https://www.youtube.com' },
  { id: '3', name: 'GitHub', url: 'https://www.github.com' },
  { id: '4', name: 'Reddit', url: 'https://www.reddit.com' },
  { id: '5', name: 'Twitter', url: 'https://x.com' },
  { id: '6', name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { id: '7', name: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { id: '8', name: 'Gmail', url: 'https://mail.google.com' },
];

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch { return ''; }
};

const NewTab: React.FC<NewTabProps> = ({ onNavigate }) => {
  const [searchValue, setSearchValue] = useState('');
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    try {
      const saved = localStorage.getItem('aura-newtab-shortcuts');
      return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    } catch { return DEFAULT_SHORTCUTS; }
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shortcutId: string } | null>(null);
  const [editDialog, setEditDialog] = useState<{ mode: 'add' | 'edit'; shortcut: Shortcut } | null>(null);

  useEffect(() => {
    localStorage.setItem('aura-newtab-shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  // Close context menu on click anywhere
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      if (urlPattern.test(searchValue.trim())) {
        const url = searchValue.trim().startsWith('http') ? searchValue.trim() : 'https://' + searchValue.trim();
        onNavigate(url);
      } else {
        onNavigate(`https://www.google.com/search?q=${encodeURIComponent(searchValue.trim())}`);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, shortcutId: id });
  };

  const removeShortcut = (id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
    setContextMenu(null);
  };

  const openEdit = (shortcut: Shortcut) => {
    setEditDialog({ mode: 'edit', shortcut: { ...shortcut } });
    setContextMenu(null);
  };

  const openAdd = () => {
    setEditDialog({ mode: 'add', shortcut: { id: Date.now().toString(), name: '', url: 'https://' } });
  };

  const saveEdit = () => {
    if (!editDialog) return;
    const { mode, shortcut } = editDialog;
    if (!shortcut.name.trim() || !shortcut.url.trim()) return;
    // Ensure URL has protocol
    let url = shortcut.url.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    const finalShortcut = { ...shortcut, url, name: shortcut.name.trim() };

    if (mode === 'add') {
      setShortcuts(prev => [...prev, finalShortcut]);
    } else {
      setShortcuts(prev => prev.map(s => s.id === finalShortcut.id ? finalShortcut : s));
    }
    setEditDialog(null);
  };

  return (
    <div className="newtab-page">
      <div className="newtab-content">
        {/* Logo */}
        <div className="newtab-logo">
          <img src={logoSrc} alt="Aether" className="newtab-logo-img" style={{ width: '96px', height: '96px', objectFit: 'contain', marginBottom: '8px', filter: 'drop-shadow(0 0 24px rgba(138,92,246,0.4))' }} />
          <p className="newtab-subtitle">Where browsing begins</p>
        </div>

        {/* Search */}
        <div className="newtab-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search the web or enter a URL..."
            className="newtab-search-input"
            autoFocus
            spellCheck={false}
          />
        </div>

        {/* Shortcuts Grid */}
        <div className="newtab-shortcuts">
          {shortcuts.map((s) => (
            <button
              key={s.id}
              className="newtab-shortcut"
              onClick={() => onNavigate(s.url)}
              onContextMenu={(e) => handleContextMenu(e, s.id)}
            >
              <span className="newtab-shortcut-icon">
                <img
                  src={getFaviconUrl(s.url)}
                  alt=""
                  style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent && !parent.querySelector('.fallback-icon')) {
                      const span = document.createElement('span');
                      span.className = 'fallback-icon';
                      span.style.cssText = 'font-size:20px;font-weight:700;color:var(--accent);';
                      span.textContent = s.name.charAt(0).toUpperCase();
                      parent.appendChild(span);
                    }
                  }}
                />
              </span>
              <span className="newtab-shortcut-name">{s.name}</span>
            </button>
          ))}

          {/* Add shortcut button */}
          {shortcuts.length < 12 && (
            <button className="newtab-shortcut" onClick={openAdd} style={{ opacity: 0.5 }}>
              <span className="newtab-shortcut-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span className="newtab-shortcut-name">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[997]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed glass rounded-lg py-1 w-44 shadow-xl z-[999] fade-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                const sc = shortcuts.find(s => s.id === contextMenu.shortcutId);
                if (sc) openEdit(sc);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--btn-hover)] transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Edit Shortcut
            </button>
            <button
              onClick={() => {
                const sc = shortcuts.find(s => s.id === contextMenu.shortcutId);
                if (sc) onNavigate(sc.url);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--btn-hover)] transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              Open
            </button>
            <div className="h-px bg-[var(--border)] my-0.5 mx-2" />
            <button
              onClick={() => removeShortcut(contextMenu.shortcutId)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              Remove
            </button>
          </div>
        </>
      )}

      {/* Edit / Add dialog */}
      {editDialog && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[998]" onClick={() => setEditDialog(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass rounded-2xl p-5 w-80 shadow-2xl z-[999] fade-in">
            <h3 className="text-base font-semibold text-[var(--text)] mb-4">
              {editDialog.mode === 'add' ? 'Add Shortcut' : 'Edit Shortcut'}
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Name</label>
                <input
                  type="text"
                  value={editDialog.shortcut.name}
                  onChange={(e) => setEditDialog(prev => prev ? { ...prev, shortcut: { ...prev.shortcut, name: e.target.value } } : null)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="Google"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">URL</label>
                <input
                  type="text"
                  value={editDialog.shortcut.url}
                  onChange={(e) => setEditDialog(prev => prev ? { ...prev, shortcut: { ...prev.shortcut, url: e.target.value } } : null)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="https://www.google.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); }}
                />
              </div>
              {/* Preview */}
              {editDialog.shortcut.url && editDialog.shortcut.url.length > 8 && (
                <div className="flex items-center gap-2 px-1">
                  <img src={getFaviconUrl(editDialog.shortcut.url)} alt="" style={{ width: '20px', height: '20px', borderRadius: '3px' }} />
                  <span className="text-xs text-[var(--text-secondary)] truncate">{editDialog.shortcut.url}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditDialog(null)}
                className="px-4 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] transition-colors"
              >Cancel</button>
              <button
                onClick={saveEdit}
                disabled={!editDialog.shortcut.name.trim() || !editDialog.shortcut.url.trim()}
                className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
              >Save</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewTab;
