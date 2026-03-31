import React, { useState, useEffect } from 'react';

interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
}

interface PasswordManagerProps {
  isVisible: boolean;
}

const PasswordManager: React.FC<PasswordManagerProps> = ({ isVisible }) => {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    try {
      const data = await window.auraAPI.passwords.get();
      setPasswords(data || []);
    } catch {
      // Fallback to localStorage
      try {
        setPasswords(JSON.parse(localStorage.getItem('aura-passwords') || '[]'));
      } catch { setPasswords([]); }
    }
  };

  const handleSave = async () => {
    if (!site.trim() || !username.trim() || !password.trim()) return;
    const entry: PasswordEntry = {
      id: editId || Date.now().toString(),
      site: site.trim(),
      username: username.trim(),
      password: password.trim(),
    };
    try {
      const updated = await window.auraAPI.passwords.save(entry);
      setPasswords(updated);
    } catch {
      // Fallback
      const existing = [...passwords];
      const idx = existing.findIndex(p => p.id === entry.id);
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      setPasswords(existing);
      localStorage.setItem('aura-passwords', JSON.stringify(existing));
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await window.auraAPI.passwords.delete(id);
      setPasswords(updated);
    } catch {
      const updated = passwords.filter(p => p.id !== id);
      setPasswords(updated);
      localStorage.setItem('aura-passwords', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setSite('');
    setUsername('');
    setPassword('');
  };

  const startEdit = (entry: PasswordEntry) => {
    setEditId(entry.id);
    setSite(entry.site);
    setUsername(entry.username);
    setPassword(entry.password);
    setShowForm(true);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredPasswords = passwords.filter(p =>
    p.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isVisible) return null;

  return (
    <div className="flex flex-col gap-1.5 fade-in h-full">
      {/* Search */}
      <div className="flex items-center gap-1.5 px-1.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search passwords..."
          className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] rounded-md px-2 py-1 text-[10px] text-[var(--text)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shrink-0"
          title="Add Password"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mx-1.5 p-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg flex flex-col gap-1.5 fade-in">
          <input type="text" value={site} onChange={(e) => setSite(e.target.value)} placeholder="Website (e.g. google.com)" className="bg-transparent border border-[var(--border)] rounded-md px-2 py-1 text-[10px] text-[var(--text)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]" />
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username / Email" className="bg-transparent border border-[var(--border)] rounded-md px-2 py-1 text-[10px] text-[var(--text)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="bg-transparent border border-[var(--border)] rounded-md px-2 py-1 text-[10px] text-[var(--text)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]" />
          <div className="flex gap-1">
            <button onClick={handleSave} className="flex-1 py-1 rounded-md bg-[var(--accent)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity">{editId ? 'Update' : 'Save'}</button>
            <button onClick={resetForm} className="px-3 py-1 rounded-md text-[10px] text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Password List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPasswords.length === 0 ? (
          <p className="text-[10px] text-[var(--text-secondary)] text-center py-6 opacity-70">
            {passwords.length === 0 ? 'No saved passwords' : 'No results'}
          </p>
        ) : filteredPasswords.map(entry => (
          <div key={entry.id} className="group flex flex-col gap-0.5 px-2 py-1.5 mx-1 rounded-md hover:bg-[var(--btn-hover)] transition-colors">
            <div className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              <span className="text-[11px] font-medium text-[var(--text)] flex-1 truncate">{entry.site}</span>
              <button onClick={() => startEdit(entry)} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] transition-all" title="Edit">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center hover:text-red-400 text-[var(--text-secondary)] transition-all" title="Delete">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-1 pl-4">
              <span className="text-[9px] text-[var(--text-secondary)] truncate">{entry.username}</span>
              <span className="text-[9px] text-[var(--text-secondary)] mx-0.5">·</span>
              <span className="text-[9px] text-[var(--text-secondary)] font-mono truncate">
                {revealedIds.has(entry.id) ? entry.password : '••••••••'}
              </span>
              <button onClick={() => toggleReveal(entry.id)} className="w-3.5 h-3.5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" title="Toggle visibility">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{revealedIds.has(entry.id) ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}</svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordManager;
