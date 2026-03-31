import React, { useState } from 'react';
import { useThemeStore, ThemeName } from '../stores/themeStore';
import PasswordManager from './PasswordManager';
import logoSrc from '../logo-app.png';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { theme, setTheme } = useThemeStore();
  const [activeSection, setActiveSection] = useState<'general' | 'passwords' | 'about' | 'developer'>('general');
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isDevMode, setIsDevMode] = useState(() => localStorage.getItem('aura-dev-mode') === 'true');
  const [isDevDetach, setIsDevDetach] = useState(() => localStorage.getItem('aura-dev-detach') === 'true');
  const [askDownload, setAskDownload] = useState(() => localStorage.getItem('aura-ask-download') === 'true');

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 500) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount === 10) {
        if (!isDevMode) {
          localStorage.setItem('aura-dev-mode', 'true');
          setIsDevMode(true);
          alert('Developer Mode Enabled!');
        } else {
          localStorage.setItem('aura-dev-mode', 'false');
          setIsDevMode(false);
          setActiveSection('general');
          alert('Developer Mode Disabled!');
        }
        setClickCount(0);
      }
    }
    setLastClickTime(now);
  };

  const themeOptions: { id: ThemeName; label: string; preview: string; description: string }[] = [
    { id: 'aura-light', label: 'Aether Light', preview: '#f4f2f7', description: 'Clean and bright' },
    { id: 'deep-night', label: 'Deep Night', preview: '#0a0a0f', description: 'Dark and immersive' },
    { id: 'cyberpunk', label: 'Cyberpunk Purple', preview: '#0d0015', description: 'Neon-lit vibes' },
  ];

  const sections: { id: 'general' | 'passwords' | 'about' | 'developer'; label: string; icon: JSX.Element }[] = [
    { id: 'general' as const, label: 'General', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
    { id: 'passwords' as const, label: 'Passwords', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
    { id: 'about' as const, label: 'About', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
  ];

  if (isDevMode) {
    sections.push({ id: 'developer' as const, label: 'Developer', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> });
  }

  return (
    <div className="absolute inset-0 z-50 flex fade-in" style={{ background: 'var(--bg)' }}>
      {/* Sidebar nav */}
      <div className="w-56 shrink-0 flex flex-col border-r border-[var(--border)] py-6 px-3 gap-1" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 px-3 mb-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-lg font-semibold text-[var(--text)]">Settings</h2>
        </div>

        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              activeSection === sec.id
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] hover:text-[var(--text)]'
            }`}
          >
            {sec.icon}
            {sec.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-8 px-10">
        {/* General */}
        {activeSection === 'general' && (
          <div className="max-w-xl fade-in">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-1">General Settings</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Customize your browser experience</p>

            {/* Theme */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Appearance</h4>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === opt.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-md'
                        : 'border-[var(--border)] hover:border-[var(--text-secondary)] bg-[var(--surface)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] shadow-inner" style={{ background: opt.preview }} />
                    <span className={`text-sm font-medium ${theme === opt.id ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{opt.label}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Engine */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Search Engine</h4>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <img src="https://www.google.com/s2/favicons?domain=google.com&sz=32" alt="" className="w-5 h-5 rounded-sm" />
                <span className="text-sm text-[var(--text)]">Google</span>
                <span className="text-xs text-[var(--text-secondary)] ml-auto">Default</span>
              </div>
            </div>

            {/* Downloads */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Downloads</h4>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div>
                  <p className="font-medium text-[var(--text)]">Ask where to save each file before downloading</p>
                  <p className="text-xs text-[var(--text-secondary)]">Otherwise, files save automatically to your Downloads folder</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={askDownload} onChange={(e) => {
                    const val = e.target.checked;
                    localStorage.setItem('aura-ask-download', val ? 'true' : 'false');
                    setAskDownload(val);
                    if ((window as any).auraAPI?.settings) {
                      (window as any).auraAPI.settings.sync('aura-ask-download', val);
                    }
                  }} />
                  <div className="w-9 h-5 bg-gray-500/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                </label>
              </div>
            </div>

            {/* Data */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Data</h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (confirm('Clear all browsing history?')) {
                      localStorage.removeItem('aura-history');
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--btn-hover)] transition-colors text-left"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  <div>
                    <p className="text-sm text-[var(--text)]">Clear Browsing History</p>
                    <p className="text-xs text-[var(--text-secondary)]">Remove all visited page records</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Clear all bookmarks?')) {
                      localStorage.removeItem('aura-bookmarks');
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--btn-hover)] transition-colors text-left"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  <div>
                    <p className="text-sm text-[var(--text)]">Clear Bookmarks</p>
                    <p className="text-xs text-[var(--text-secondary)]">Remove all saved bookmarks</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Passwords */}
        {activeSection === 'passwords' && (
          <div className="max-w-xl fade-in">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-1">Password Manager</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Manage your saved login credentials</p>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 overflow-hidden">
              <PasswordManager isVisible={true} />
            </div>
          </div>
        )}

        {/* About */}
        {activeSection === 'about' && (
          <div className="max-w-xl fade-in">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-1">About Aether Browser</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Your modern, privacy-focused browser</p>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <img onClick={handleLogoClick} src={logoSrc} alt="Aether" className="w-14 h-14 rounded-2xl shadow-lg object-contain cursor-pointer" style={{ filter: 'drop-shadow(0 0 12px rgba(138,92,246,0.3))' }} title="Click 10 times to toggle Developer Mode" />
                <div>
                  <p className="text-lg font-semibold text-[var(--text)]">Aether Browser</p>
                  <p className="text-sm text-[var(--text-secondary)]">Version 1.0.0</p>
                </div>
              </div>
              <div className="h-px bg-[var(--border)]" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[var(--text-secondary)]">Engine</p>
                  <p className="text-[var(--text)] font-medium">Chromium (Electron)</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">Runtime</p>
                  <p className="text-[var(--text)] font-medium">Bun</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">UI Framework</p>
                  <p className="text-[var(--text)] font-medium">React + Tailwind</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">License</p>
                  <p className="text-[var(--text)] font-medium">MIT</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Developer */}
        {activeSection === 'developer' && isDevMode && (
          <div className="max-w-xl fade-in">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-1">Developer Options</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Advanced settings for testing and debugging</p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-[var(--text)]">Open DevTools in Separate Window</p>
                  <p className="text-xs text-[var(--text-secondary)]">Detaches DevTools from the active tab</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isDevDetach} onChange={(e) => {
                    localStorage.setItem('aura-dev-detach', e.target.checked ? 'true' : 'false');
                    setIsDevDetach(e.target.checked);
                  }} />
                  <div className="w-9 h-5 bg-gray-500/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
