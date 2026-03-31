import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useThemeStore, ThemeName } from './stores/themeStore';
import Sidebar from './components/Sidebar';
import NewTab from './components/NewTab';
import Settings from './components/Settings';
import Downloads from './components/Downloads';
import DownloadsPage from './components/DownloadsPage';

declare global {
  interface Window {
    auraAPI: {
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        fullscreen: () => void;
        toggleDevTools: () => void;
      };
      contextMenu: {
        show: (params: any) => void;
        onOpenLink: (callback: (url: string) => void) => void;
        onBack: (callback: () => void) => void;
        onForward: (callback: () => void) => void;
        onReload: (callback: () => void) => void;
        onInspect: (callback: () => void) => void;
      };
      zoom: {
        onIn: (callback: () => void) => void;
        onOut: (callback: () => void) => void;
        onReset: (callback: () => void) => void;
      };
      passwords: {
        get: () => Promise<any[]>;
        save: (entry: any) => Promise<any[]>;
        delete: (id: string) => Promise<any[]>;
      };
      downloads: {
        onStart: (callback: (data: { id: string; filename: string; totalBytes: number }) => void) => () => void;
        onProgress: (callback: (data: { id: string; state: string; receivedBytes: number; totalBytes: number }) => void) => () => void;
        onComplete: (callback: (data: { id: string; filename: string }) => void) => () => void;
        onCancelled: (callback: (data: { id: string; filename: string }) => void) => () => void;
        pause: (id: string) => void;
        resume: (id: string) => void;
        cancel: (id: string) => void;
        openFolder: (filename: string) => void;
      };
      settings: {
        sync: (key: string, value: any) => void;
      };
      shortcuts: {
        onAction: (callback: (action: string) => void) => () => void;
      };
    };
  }
}

export interface Download {
  id: string;
  filename: string;
  state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  receivedBytes: number;
  totalBytes: number;
}

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface Bookmark {
  url: string;
  title: string;
  id: string;
}

interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
  isNewTab: boolean;
  zoomLevel: number;
}

const NEWTAB_URL = 'about:blank';

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return ''; }
};

const getDomain = (url: string): string => {
  try { return new URL(url).hostname; } catch { return ''; }
};

// Script injected into webviews to detect login form submissions
const CREDENTIAL_CAPTURE_SCRIPT = `
(function() {
  if (window.__auraCredCapture) return;
  window.__auraCredCapture = true;

  function findCredentials(form) {
    const inputs = form ? form.querySelectorAll('input') : document.querySelectorAll('input');
    let username = '';
    let password = '';
    inputs.forEach(function(input) {
      if (input.type === 'password' && input.value) {
        password = input.value;
      } else if ((input.type === 'text' || input.type === 'email' || input.type === 'tel' ||
                  input.name === 'username' || input.name === 'login' || input.name === 'email' ||
                  input.autocomplete === 'username' || input.autocomplete === 'email') && input.value) {
        username = input.value;
      }
    });
    return { username: username, password: password };
  }

  document.addEventListener('submit', function(e) {
    var creds = findCredentials(e.target);
    if (creds.username && creds.password) {
      console.log('__AURA_CRED__:' + JSON.stringify({ site: window.location.hostname, username: creds.username, password: creds.password }));
    }
  }, true);

  // Also detect click on submit buttons (some sites don't use form submit)
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button[type="submit"], input[type="submit"], button:not([type])');
    if (btn) {
      var form = btn.closest('form');
      var creds = findCredentials(form);
      if (creds.username && creds.password) {
        setTimeout(function() {
          console.log('__AURA_CRED__:' + JSON.stringify({ site: window.location.hostname, username: creds.username, password: creds.password }));
        }, 100);
      }
    }
  }, true);
})();
`;

// Script to autofill credentials into a page
const getAutofillScript = (username: string, password: string) => `
(function() {
  var inputs = document.querySelectorAll('input');
  var filled = false;
  inputs.forEach(function(input) {
    if (input.type === 'password') {
      input.value = ${JSON.stringify(password)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      filled = true;
    }
  });
  if (filled) {
    inputs.forEach(function(input) {
      if (input.type === 'text' || input.type === 'email' || input.type === 'tel' ||
          input.name === 'username' || input.name === 'login' || input.name === 'email' ||
          input.autocomplete === 'username' || input.autocomplete === 'email') {
        input.value = ${JSON.stringify(username)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
})();
`;

const createTab = (): Tab => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  url: NEWTAB_URL,
  title: 'New Tab',
  favicon: '',
  isLoading: false,
  isNewTab: true,
  zoomLevel: 1,
});

const App: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const [tabs, setTabs] = useState<Tab[]>(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [pendingCredential, setPendingCredential] = useState<{ site: string; username: string; password: string } | null>(null);
  const [autofillPrompt, setAutofillPrompt] = useState<{ matches: { site: string; username: string; password: string }[]; tabId: string } | null>(null);
  const [savedPasswords, setSavedPasswords] = useState<any[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('aura-history') || '[]'); } catch { return []; }
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try { return JSON.parse(localStorage.getItem('aura-bookmarks') || '[]'); } catch { return []; }
  });
  const [downloads, setDownloads] = useState<Download[]>(() => {
    try { return JSON.parse(localStorage.getItem('aura-downloads') || '[]'); } catch { return []; }
  });
  const [showFindId, setShowFindId] = useState<string | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [findText, setFindText] = useState<string>('');
  const [findResults, setFindResults] = useState<{ activeMatchOrdinal: number; matches: number }>({ activeMatchOrdinal: 0, matches: 0 });

  const webviewRefs = useRef<Map<string, HTMLWebViewElement>>(new Map());
  const listenersAttached = useRef<Set<string>>(new Set());
  const savedPasswordsRef = useRef<any[]>([]);
  const dismissedAutofillRef = useRef<Set<string>>(new Set());  // tracks tabId+domain combos where user dismissed autofill

  const closeFind = useCallback(() => {
    if (showFindId) {
      const wv = webviewRefs.current.get(showFindId) as any;
      if (wv) try { wv.stopFindInPage('clearSelection'); } catch {}
    }
    setShowFindId(null);
    setFindText('');
    setFindResults({ activeMatchOrdinal: 0, matches: 0 });
  }, [showFindId]);

  const findNext = useCallback(() => {
    if (!showFindId || !findText) return;
    const wv = webviewRefs.current.get(showFindId) as any;
    if (wv) try { wv.findInPage(findText, { forward: true, findNext: true }); } catch {}
  }, [showFindId, findText]);

  const findPrev = useCallback(() => {
    if (!showFindId || !findText) return;
    const wv = webviewRefs.current.get(showFindId) as any;
    if (wv) try { wv.findInPage(findText, { forward: false, findNext: true }); } catch {}
  }, [showFindId, findText]);

  useEffect(() => {
    if (showFindId && findText) {
      const wv = webviewRefs.current.get(showFindId) as any;
      if (wv) try { wv.findInPage(findText); } catch {}
    } else if (showFindId && !findText) {
      const wv = webviewRefs.current.get(showFindId) as any;
      if (wv) try { wv.stopFindInPage('clearSelection'); } catch {}
      setFindResults({ activeMatchOrdinal: 0, matches: 0 });
    }
  }, [findText, showFindId]);

  useEffect(() => {
    if (!activeTabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, []);

  // Load saved passwords on mount
  useEffect(() => {
    const loadPasswords = async () => {
      try {
        const data = await window.auraAPI.passwords.get();
        setSavedPasswords(data || []);
        savedPasswordsRef.current = data || [];
      } catch {
        try {
          const local = JSON.parse(localStorage.getItem('aura-passwords') || '[]');
          setSavedPasswords(local);
          savedPasswordsRef.current = local;
        } catch { setSavedPasswords([]); }
      }
    };
    loadPasswords();
  }, []);

  // Keep ref in sync whenever savedPasswords changes
  useEffect(() => {
    savedPasswordsRef.current = savedPasswords;
  }, [savedPasswords]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Persist
  useEffect(() => { localStorage.setItem('aura-history', JSON.stringify(history.slice(0, 200))); }, [history]);
  useEffect(() => { localStorage.setItem('aura-bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem('aura-downloads', JSON.stringify(downloads)); }, [downloads]);

  // Omnibox sync
  useEffect(() => {
    if (!activeTab) return;
    setInputValue(activeTab.isNewTab ? '' : activeTab.url);
    const webview = webviewRefs.current.get(activeTabId) as any;
    if (webview && !activeTab.isNewTab) {
      try { setCanGoBack(webview.canGoBack?.()); setCanGoForward(webview.canGoForward?.()); } catch { setCanGoBack(false); setCanGoForward(false); }
    } else { setCanGoBack(false); setCanGoForward(false); }
  }, [activeTabId, activeTab?.url, activeTab?.isNewTab]);

  // Sync settings on load
  useEffect(() => {
    if ((window as any).auraAPI?.settings) {
      (window as any).auraAPI.settings.sync('aura-ask-download', localStorage.getItem('aura-ask-download') === 'true');
    }
  }, []);

  // Context menu IPC listeners
  useEffect(() => {
    if (!window.auraAPI?.contextMenu) return;
    window.auraAPI.contextMenu.onOpenLink((url) => {
      const newTab = createTab();
      setTabs(prev => [...prev, { ...newTab, url, isNewTab: false, title: 'Loading...' }]);
      setActiveTabId(newTab.id);
      setTimeout(() => {
        const wv = webviewRefs.current.get(newTab.id) as any;
        if (wv) try { wv.loadURL(url); } catch {}
      }, 200);
    });
    window.auraAPI.contextMenu.onBack(() => goBack());
    window.auraAPI.contextMenu.onForward(() => goForward());
    window.auraAPI.contextMenu.onReload(() => reload());
    window.auraAPI.contextMenu.onInspect(() => {
      try {
        const wv = webviewRefs.current.get(activeTabId) as any;
        if (wv) {
          wv.openDevTools();
          if (localStorage.getItem('aura-dev-detach') !== 'true') {
            console.warn("Electron <webview> DevTools always open detached.");
          }
        }
      } catch (e) { console.error(e); }
    });
  }, []);

  // Zoom IPC
  useEffect(() => {
    if (!window.auraAPI?.zoom) return;
    window.auraAPI.zoom.onIn(() => {
      const wv = webviewRefs.current.get(activeTabId) as any;
      if (wv) try { wv.setZoomLevel((wv.getZoomLevel() || 0) + 0.5); } catch {}
    });
    window.auraAPI.zoom.onOut(() => {
      const wv = webviewRefs.current.get(activeTabId) as any;
      if (wv) try { wv.setZoomLevel((wv.getZoomLevel() || 0) - 0.5); } catch {}
    });
    window.auraAPI.zoom.onReset(() => {
      const wv = webviewRefs.current.get(activeTabId) as any;
      if (wv) try { wv.setZoomLevel(0); } catch {}
    });
  }, []);

  // Download Manager events
  useEffect(() => {
    if (!window.auraAPI?.downloads) return;

    const unsubs = [
      window.auraAPI.downloads.onStart(({ id, filename, totalBytes }) => {
        setDownloads(prev => [{ id, filename, state: 'progressing', receivedBytes: 0, totalBytes }, ...prev]);
        setShowDownloads(true);
      }),
      window.auraAPI.downloads.onProgress(({ id, state, receivedBytes, totalBytes }) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, state: state as any, receivedBytes, totalBytes } : d));
      }),
      window.auraAPI.downloads.onComplete(({ id, filename }) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, state: 'completed', receivedBytes: d.totalBytes } : d));
        setDownloadNotification(filename);
        setTimeout(() => setDownloadNotification(null), 4000);
      }),
      window.auraAPI.downloads.onCancelled(({ id }) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, state: 'cancelled' } : d));
      })
    ];

    return () => {
      unsubs.forEach(fn => fn && fn());
    };
  }, []);

  // ===== BROWSER KEYBOARD SHORTCUTS (IPC from main process) =====
  // These work even when a webview has focus because they're intercepted
  // at the Electron main process level via before-input-event
  useEffect(() => {
    if (!window.auraAPI?.shortcuts) return;

    const getWv = () => webviewRefs.current.get(activeTabId) as any;

    const cleanup = window.auraAPI.shortcuts.onAction((action: string) => {
      switch (action) {
        case 'new-tab':
          addTab();
          break;

        case 'close-tab':
          closeTab(activeTabId);
          break;

        case 'reopen-tab':
          if (history.length > 0) {
            const lastUrl = history[0].url;
            const newTab = createTab();
            setTabs(prev => [...prev, { ...newTab, url: lastUrl, isNewTab: false, title: 'Loading...' }]);
            setActiveTabId(newTab.id);
            setTimeout(() => {
              const wv = webviewRefs.current.get(newTab.id) as any;
              if (wv) try { wv.loadURL(lastUrl); } catch {}
            }, 200);
          }
          break;

        case 'next-tab': {
          const idx = tabs.findIndex(t => t.id === activeTabId);
          if (idx >= 0 && tabs.length > 1) {
            setActiveTabId(tabs[(idx + 1) % tabs.length].id);
          }
          break;
        }

        case 'prev-tab': {
          const idx2 = tabs.findIndex(t => t.id === activeTabId);
          if (idx2 >= 0 && tabs.length > 1) {
            setActiveTabId(tabs[(idx2 - 1 + tabs.length) % tabs.length].id);
          }
          break;
        }

        case 'focus-url':
          document.getElementById('omnibox')?.focus();
          break;

        case 'reload': {
          const wv = getWv();
          if (wv) try { wv.reload(); } catch {}
          break;
        }

        case 'hard-reload': {
          const wv = getWv();
          if (wv) try { wv.reloadIgnoringCache(); } catch {}
          break;
        }

        case 'toggle-bookmark':
          toggleBookmark();
          break;

        case 'open-history':
          setSidebarOpen(true);
          break;

        case 'toggle-sidebar':
          setSidebarOpen(prev => !prev);
          break;

        case 'webview-devtools':
          // Opens DevTools for the WEBSITE inside the webview
          try {
            const wv = getWv();
            if (wv) {
              wv.openDevTools();
            }
          } catch (e) {
            console.error("Failed to open DevTools:", e);
          }
          break;

        case 'host-devtools':
          // Opens DevTools for the browser shell (for developers of the browser itself)
          try { window.auraAPI?.window.toggleDevTools(); } catch {}
          break;

        case 'find':
          setShowFindId(activeTabId);
          setTimeout(() => document.getElementById('in-page-search-input')?.focus(), 50);
          break;

        case 'print':
          try { getWv()?.print(); } catch {}
          break;

        case 'zoom-in': {
          const wv = getWv();
          if (wv) try { wv.setZoomLevel((wv.getZoomLevel() || 0) + 0.5); } catch {}
          break;
        }

        case 'zoom-out': {
          const wv = getWv();
          if (wv) try { wv.setZoomLevel((wv.getZoomLevel() || 0) - 0.5); } catch {}
          break;
        }

        case 'zoom-reset': {
          const wv = getWv();
          if (wv) try { wv.setZoomLevel(0); } catch {}
          break;
        }

        case 'go-back':
          goBack();
          break;

        case 'go-forward':
          goForward();
          break;

        case 'go-home':
          goHome();
          break;

        case 'fullscreen':
          try { window.auraAPI?.window.fullscreen(); } catch {}
          break;

        case 'escape':
          if (showDownloads) { setShowDownloads(false); break; }
          if (showFindId) { closeFind(); break; }
          try { getWv()?.stop(); } catch {}
          break;

        case 'open-settings':
          openSystemTab('aura://settings', 'Settings');
          break;

        default:
          // Handle switch-tab-N
          if (action.startsWith('switch-tab-')) {
            const num = parseInt(action.split('-')[2]);
            if (num === 9) {
              setActiveTabId(tabs[tabs.length - 1].id);
            } else if (num <= tabs.length) {
              setActiveTabId(tabs[num - 1].id);
            }
          }
          break;
      }
    });

    return cleanup;
  }, [activeTabId, tabs, history, showFindId, showDownloads, closeFind]);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  }, []);

  const attachListeners = useCallback((webview: any, tabId: string) => {
    if (listenersAttached.current.has(tabId)) return;
    listenersAttached.current.add(tabId);

    const safeCall = (fn: () => void) => { try { fn(); } catch (e) { console.warn('Webview event error:', e); } };

    webview.addEventListener('did-start-loading', () => safeCall(() => updateTab(tabId, { isLoading: true })));

    webview.addEventListener('did-stop-loading', () => {
      safeCall(() => {
        updateTab(tabId, { isLoading: false });
        try { setCanGoBack(webview.canGoBack()); setCanGoForward(webview.canGoForward()); } catch {}
        // Favicon fallback: if no page-favicon-updated, use Google service
        setTimeout(() => {
          setTabs(prev => prev.map(t => {
            if (t.id === tabId && !t.favicon && t.url && t.url !== 'about:blank') {
              return { ...t, favicon: getFaviconUrl(t.url) };
            }
            return t;
          }));
        }, 500);
      });
    });

    webview.addEventListener('page-title-updated', (e: any) => safeCall(() => updateTab(tabId, { title: e.title || 'Aether Browser' })));

    webview.addEventListener('did-navigate', (e: any) => {
      safeCall(() => {
        const newUrl = e.url || '';
        if (newUrl && newUrl !== 'about:blank') {
          updateTab(tabId, { url: newUrl, favicon: '' }); // reset favicon so fallback triggers
          setInputValue(newUrl);
          setHistory(prev => [{ url: newUrl, title: e.title || newUrl, timestamp: Date.now() }, ...prev.filter(h => h.url !== newUrl)].slice(0, 200));
        }
      });
    });

    webview.addEventListener('did-navigate-in-page', (e: any) => {
      safeCall(() => { if (e.url && e.url !== 'about:blank') updateTab(tabId, { url: e.url }); });
    });

    webview.addEventListener('page-favicon-updated', (e: any) => {
      safeCall(() => {
        if (e.favicons && e.favicons.length > 0) {
          updateTab(tabId, { favicon: e.favicons[0] });
        }
      });
    });

    webview.addEventListener('found-in-page', (e: any) => {
      safeCall(() => {
        if (e.result) {
          setFindResults({
            activeMatchOrdinal: e.result.activeMatchOrdinal,
            matches: e.result.matches,
          });
        }
      });
    });

    // Right-click context menu
    webview.addEventListener('context-menu', (e: any) => {
      if (window.auraAPI?.contextMenu) {
        window.auraAPI.contextMenu.show({
          x: e.params.x,
          y: e.params.y,
          linkURL: e.params.linkURL || undefined,
          srcURL: e.params.srcURL || undefined,
          selectionText: e.params.selectionText || undefined,
          isEditable: e.params.isEditable || false,
          mediaType: e.params.mediaType || undefined,
        });
      }
    });

    // Handle new-window requests (target="_blank" links)
    webview.addEventListener('new-window', (e: any) => {
      e.preventDefault();
      const newUrl = e.url;
      if (newUrl) {
        const newTab = createTab();
        setTabs(prev => [...prev, { ...newTab, url: newUrl, isNewTab: false, title: 'Loading...' }]);
        setActiveTabId(newTab.id);
        setTimeout(() => {
          const wv = webviewRefs.current.get(newTab.id) as any;
          if (wv) try { wv.loadURL(newUrl); } catch {}
        }, 200);
      }
    });

    webview.addEventListener('did-fail-load', (e: any) => {
      if (e.errorCode === -3 || e.errorCode === -2) return; // -3 = aborted, -2 = ERR_FAILED (tab destroyed)
      console.warn('Load failed:', e.errorDescription);
    });

    // Inject credential capture script after each page load
    webview.addEventListener('did-stop-loading', () => {
      // Guard: check webview is still alive before executing JS
      const isAlive = () => {
        try { return !!webview.getURL && webviewRefs.current.has(tabId); } catch { return false; }
      };

      if (!isAlive()) return;

      try {
        webview.executeJavaScript(CREDENTIAL_CAPTURE_SCRIPT).catch(() => {});
      } catch {}

      // Inject Ctrl+Click listener for reopening autofill
      if (!isAlive()) return;
      try {
        webview.executeJavaScript(`
          (function() {
            if (window.__auraCTRLClick) return;
            window.__auraCTRLClick = true;
            document.addEventListener('click', function(e) {
              if (e.ctrlKey || e.metaKey) {
                var el = e.target;
                if (el.tagName === 'INPUT' && (el.type === 'password' || el.type === 'text' || el.type === 'email')) {
                  e.preventDefault();
                  console.log('__AURA_AUTOFILL_REOPEN__');
                }
              }
            }, true);
          })();
        `).catch(() => {});
      } catch {}

      // Check if we have saved credentials for this domain
      // Uses ref so it always reads the latest passwords (not a stale closure)
      const checkForAutofill = () => {
        if (!isAlive()) return;
        // Skip if user already dismissed for this tab+domain
        try {
          const currentUrl = webview.getURL();
          const domain = getDomain(currentUrl);
          const dismissKey = tabId + ':' + domain;
          if (!domain || dismissedAutofillRef.current.has(dismissKey)) return;
          const passwords = savedPasswordsRef.current;
          const matches = passwords.filter((p: any) => {
            try { return getDomain('https://' + p.site) === domain || p.site === domain; } catch { return false; }
          });
          if (matches.length > 0) {
            if (!isAlive()) return;
            webview.executeJavaScript(`
              (function() {
                var pwFields = document.querySelectorAll('input[type="password"]');
                return pwFields.length > 0;
              })();
            `).then((hasPasswordField: boolean) => {
              if (hasPasswordField && !dismissedAutofillRef.current.has(dismissKey)) {
                setAutofillPrompt({ matches, tabId });
              }
            }).catch(() => {});
          }
        } catch {}
      };

      // Check immediately, then retry for SPAs that render forms late (like GitHub)
      checkForAutofill();
      setTimeout(() => { if (isAlive()) checkForAutofill(); }, 1500);
      setTimeout(() => { if (isAlive()) checkForAutofill(); }, 3000);
    });

    // Clear dismissed state on new navigation so autofill can re-trigger on a different page
    webview.addEventListener('did-navigate', () => {
      // Clear dismissals for this tab (new page = fresh start)
      const keysToRemove: string[] = [];
      dismissedAutofillRef.current.forEach(key => { if (key.startsWith(tabId + ':')) keysToRemove.push(key); });
      keysToRemove.forEach(k => dismissedAutofillRef.current.delete(k));
    });

    // Listen for credential captures via console messages
    webview.addEventListener('console-message', (e: any) => {
      try {
        const msg = e.message;
        if (msg === '__AURA_AUTOFILL_REOPEN__') {
          // User Ctrl+Clicked a login field — reopen autofill
          const currentUrl = webview.getURL();
          const domain = getDomain(currentUrl);
          const dismissKey = tabId + ':' + domain;
          dismissedAutofillRef.current.delete(dismissKey);
          const passwords = savedPasswordsRef.current;
          const matches = passwords.filter((p: any) => {
            try { return getDomain('https://' + p.site) === domain || p.site === domain; } catch { return false; }
          });
          if (matches.length > 0) {
            setAutofillPrompt({ matches, tabId });
          }
          return;
        }
        if (msg && msg.startsWith('__AURA_CRED__:')) {
          const cred = JSON.parse(msg.slice('__AURA_CRED__:'.length));
          if (cred.username && cred.password && cred.site) {
            const passwords = savedPasswordsRef.current;
            const alreadySaved = passwords.some((p: any) => p.site === cred.site && p.username === cred.username && p.password === cred.password);
            if (!alreadySaved) {
              setPendingCredential(cred);
            }
          }
        }
      } catch {}
    });
  }, [updateTab]);

  const navigateTo = useCallback((input: string, tabId?: string) => {
    const targetTabId = tabId || activeTabId;
    let target = input.trim();
    if (!target) return;

    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    const isLocalhost = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$/.test(target);

    if (urlPattern.test(target) || isLocalhost) {
      if (!/^https?:\/\//.test(target)) target = 'https://' + target;
    } else {
      target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    }

    updateTab(targetTabId, { url: target, isNewTab: false, title: 'Loading...', favicon: '' });
    setInputValue(target);

    const tryLoad = (attempts: number) => {
      const webview = webviewRefs.current.get(targetTabId) as any;
      if (webview) { 
        if (!target.startsWith('aura://')) {
          try { webview.loadURL(target); } catch (e) { console.warn('loadURL error:', e); } 
        }
      }
      else if (attempts < 10) setTimeout(() => tryLoad(attempts + 1), 100);
    };
    setTimeout(() => tryLoad(0), 50);

    setShowDownloads(false);
  }, [activeTabId, updateTab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { navigateTo(inputValue); (e.target as HTMLInputElement).blur(); }
  };

  const goBack = () => { try { (webviewRefs.current.get(activeTabId) as any)?.goBack(); } catch {} };
  const goForward = () => { try { (webviewRefs.current.get(activeTabId) as any)?.goForward(); } catch {} };
  const reload = () => { try { (webviewRefs.current.get(activeTabId) as any)?.reload(); } catch {} };
  const goHome = () => {
    updateTab(activeTabId, { url: NEWTAB_URL, isNewTab: true, title: 'New Tab', favicon: '', isLoading: false });
    setInputValue(''); setCanGoBack(false); setCanGoForward(false);
  };

  const clearDownloads = () => setDownloads([]);

  const openSystemTab = (url: string, title: string) => {
    const active = tabs.find(t => t.id === activeTabId);
    if (active && active.isNewTab && active.url === 'about:blank') {
      updateTab(active.id, { url, isNewTab: false, title, favicon: '' });
      setInputValue(url);
    } else {
      const nt = createTab();
      setTabs(prev => [...prev, { ...nt, url, isNewTab: false, title, favicon: '' }]);
      setActiveTabId(nt.id);
      setInputValue(url);
    }
    setSidebarOpen(false);
    setShowDownloads(false);
  };

  const addTab = () => {
    const newTab = createTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setShowDownloads(false);
  };

  const closeTab = (tabId: string) => {
    webviewRefs.current.delete(tabId);
    listenersAttached.current.delete(tabId);
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== tabId);
      if (remaining.length === 0) { const nt = createTab(); setActiveTabId(nt.id); return [nt]; }
      if (tabId === activeTabId) {
        const idx = prev.findIndex(t => t.id === tabId);
        setActiveTabId(remaining[Math.min(idx, remaining.length - 1)].id);
      }
      return remaining;
    });
  };

  const toggleBookmark = () => {
    if (!activeTab || activeTab.isNewTab) return;
    const existing = bookmarks.find(b => b.url === activeTab.url);
    if (existing) {
      setBookmarks(prev => prev.filter(b => b.id !== existing.id));
    } else {
      setBookmarks(prev => [...prev, { url: activeTab.url, title: activeTab.title, id: Date.now().toString() }]);
    }
  };
  const bookmarkTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.isNewTab) return;
    if (!bookmarks.some(b => b.url === tab.url)) {
      setBookmarks(prev => [...prev, { url: tab.url, title: tab.title, id: Date.now().toString() }]);
    }
  };
  const removeBookmark = (id: string) => setBookmarks(prev => prev.filter(b => b.id !== id));
  const isBookmarked = bookmarks.some(b => b.url === activeTab?.url);
  const duplicateTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const nt = createTab();
    setTabs(prev => [...prev, { ...nt, url: tab.url, title: tab.title, favicon: tab.favicon, isNewTab: tab.isNewTab }]);
    setActiveTabId(nt.id);
    if (!tab.isNewTab) setTimeout(() => { const wv = webviewRefs.current.get(nt.id) as any; if (wv) try { wv.loadURL(tab.url); } catch {} }, 200);
  };
  const closeOtherTabs = (tabId: string) => {
    tabs.filter(t => t.id !== tabId).forEach(t => { webviewRefs.current.delete(t.id); listenersAttached.current.delete(t.id); });
    setTabs(prev => prev.filter(t => t.id === tabId));
    setActiveTabId(tabId);
  };
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setTabContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const themeOptions: { id: ThemeName; label: string; preview: string }[] = [
    { id: 'aura-light', label: 'Aether Light', preview: '#f4f2f7' },
    { id: 'deep-night', label: 'Deep Night', preview: '#0a0a0f' },
    { id: 'cyberpunk', label: 'Cyberpunk Purple', preview: '#0d0015' },
  ];

  return (
    <div data-theme={theme} className="theme-transition flex flex-col w-full h-full">
      {/* TITLE BAR */}
      <div className="glass-topbar drag-region flex items-center h-12 px-3 gap-2 z-50 relative shrink-0">
        <button id="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} className="no-drag w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text)]" title="Toggle Sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
        </button>

        <div className="no-drag flex items-center gap-1">
          <button id="nav-back" onClick={goBack} disabled={!canGoBack} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors disabled:opacity-30 text-[var(--text)]" title="Go Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button id="nav-forward" onClick={goForward} disabled={!canGoForward} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors disabled:opacity-30 text-[var(--text)]" title="Go Forward">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button id="nav-reload" onClick={reload} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text)]" title="Reload">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={activeTab?.isLoading ? 'animate-spin' : ''}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          </button>
          <button id="nav-home" onClick={goHome} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text)]" title="Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </button>
        </div>

        <div className="no-drag flex-1 mx-2 relative">
          <div className="flex items-center rounded-lg bg-[var(--input-bg)] border border-[var(--border)] focus-within:border-[var(--accent)] transition-colors px-3 py-1.5 gap-2">
            {activeTab?.isLoading ? (
              <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            )}
            <input id="omnibox" type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} onFocus={(e) => e.target.select()} placeholder="Search or enter URL..." className="flex-1 bg-transparent outline-none text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)]" spellCheck={false} />
          </div>
        </div>

        <button id="bookmark-btn" onClick={toggleBookmark} className="no-drag w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text)]" title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'var(--accent)' : 'none'} stroke={isBookmarked ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </button>

        <div className="no-drag flex items-center gap-0.5 ml-1">
          <button id="win-minimize" onClick={() => window.auraAPI?.window.minimize()} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg></button>
          <button id="win-maximize" onClick={() => window.auraAPI?.window.maximize()} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg></button>
          <button id="win-close" onClick={() => window.auraAPI?.window.close()} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors text-[var(--text)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="tab-bar glass-topbar flex items-center h-10 px-1.5 gap-1 shrink-0 overflow-x-auto no-drag" style={{ borderTop: 'none' }}>
        {tabs.map(tab => (
          <div key={tab.id} className={`tab-item group flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all min-w-0 max-w-[200px] shrink-0 ${tab.id === activeTabId ? 'bg-[var(--surface-hover)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] hover:text-[var(--text)]'}`} onClick={() => { setActiveTabId(tab.id); setShowDownloads(false); }} onContextMenu={(e) => handleTabContextMenu(e, tab.id)}>
            {(tab.favicon || (!tab.isNewTab && tab.url !== 'about:blank')) ? (
              <img src={tab.favicon || getFaviconUrl(tab.url)} alt="" className="w-4 h-4 shrink-0 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).src = getFaviconUrl(tab.url); }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><circle cx="12" cy="12" r="10" /></svg>
            )}
            <span className="truncate flex-1">{tab.title}</span>
            <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
        <button onClick={addTab} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--btn-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text)] shrink-0 ml-1" title="New Tab (Ctrl+T)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        {/* Tab Context Menu */}
        {tabContextMenu && (
          <>
            <div className="fixed inset-0 z-[998]" onClick={() => setTabContextMenu(null)} />
            <div className="fixed glass rounded-lg py-1 w-48 shadow-xl z-[999] fade-in" style={{ left: tabContextMenu.x, top: tabContextMenu.y }} onClick={() => setTabContextMenu(null)}>
              {(() => { const t = tabs.find(tab => tab.id === tabContextMenu.tabId); const isBm = t ? bookmarks.some(b => b.url === t.url) : false; return (<>
                <button onClick={() => bookmarkTab(tabContextMenu.tabId)} disabled={!t || t.isNewTab || isBm} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--btn-hover)] transition-colors disabled:opacity-30 text-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  {isBm ? 'Already Bookmarked' : 'Bookmark Tab'}
                </button>
                <button onClick={() => { if (t && !t.isNewTab) { const { useEssentialsStore } = require('./stores/essentialsStore'); useEssentialsStore.getState().addEssential({ url: t.url, title: t.title, favicon: t.favicon }); }}} disabled={!t || t.isNewTab} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--btn-hover)] transition-colors disabled:opacity-30 text-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                  Pin as Essential
                </button>
                <div className="h-px bg-[var(--border)] my-0.5 mx-2" />
                <button onClick={() => duplicateTab(tabContextMenu.tabId)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--btn-hover)] transition-colors text-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Duplicate Tab
                </button>
                <div className="h-px bg-[var(--border)] my-0.5 mx-2" />
                <button onClick={() => closeTab(tabContextMenu.tabId)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--btn-hover)] transition-colors text-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  Close Tab
                </button>
                {tabs.length > 1 && (
                  <button onClick={() => closeOtherTabs(tabContextMenu.tabId)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors text-left">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    Close Other Tabs
                  </button>
                )}
              </>); })()}
            </div>
          </>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
          <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          bookmarks={bookmarks}
          history={history}
          onNavigate={(url) => navigateTo(url)}
          onRemoveBookmark={removeBookmark}
          onClearHistory={() => setHistory([])}
          onOpenSettings={() => openSystemTab('aura://settings', 'Settings')}
          onOpenDownloads={(e: React.MouseEvent) => {
            if (e.ctrlKey || e.metaKey) {
              openSystemTab('aura://downloads', 'Downloads');
            } else {
              setShowDownloads(prev => !prev);
            }
          }}
          currentUrl={activeTab?.url}
          currentTitle={activeTab?.title}
          currentFavicon={activeTab?.favicon}
        />

        <div className="flex-1 relative overflow-hidden">
          {tabs.map(tab => (
            <div key={tab.id} className="absolute inset-0" style={{ visibility: tab.id === activeTabId ? 'visible' : 'hidden', zIndex: tab.id === activeTabId ? 1 : 0 }}>
              {tab.isNewTab && !tab.url.startsWith('aura://') && (
                <div className="absolute inset-0 z-10">
                  <NewTab onNavigate={(url) => navigateTo(url, tab.id)} />
                </div>
              )}
              {tab.url === 'aura://settings' && (
                <div className="absolute inset-0 z-20 bg-[var(--bg)]">
                  <Settings onClose={() => closeTab(tab.id)} />
                </div>
              )}
              {tab.url === 'aura://downloads' && (
                <div className="absolute inset-0 z-20 bg-[var(--bg)]">
                  <DownloadsPage onClose={() => closeTab(tab.id)} downloads={downloads} onClear={clearDownloads} />
                </div>
              )}
              {showDownloads && tab.id === activeTabId && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                  <div className="pointer-events-auto w-full h-full relative">
                    <Downloads onClose={() => setShowDownloads(false)} downloads={downloads} onClear={clearDownloads} />
                  </div>
                </div>
              )}
              <webview
                ref={(el) => {
                  if (el && !webviewRefs.current.has(tab.id)) {
                    webviewRefs.current.set(tab.id, el);
                    (el as any).addEventListener('dom-ready', () => attachListeners(el, tab.id));
                  }
                }}
                src={NEWTAB_URL}
                className="absolute inset-0"
                style={{ width: '100%', height: '100%', display: tab.url?.startsWith('aura://') ? 'none' : 'flex' }}
              />
            </div>
          ))}

          {/* Download notification toast */}
          {downloadNotification && (
            <div className="absolute bottom-4 right-4 z-50 glass rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-xl fade-in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span className="text-sm text-[var(--text)]">Downloaded: {downloadNotification}</span>
            </div>
          )}

          {/* Save Password Prompt — top-right */}
          {pendingCredential && (
            <div className="absolute top-3 right-3 z-50 glass rounded-xl px-5 py-3 flex items-center gap-3 shadow-2xl fade-in" style={{ minWidth: '320px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">Save password for {pendingCredential.site}?</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">User: {pendingCredential.username}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const entry = { id: Date.now().toString(), site: pendingCredential.site, username: pendingCredential.username, password: pendingCredential.password };
                    const updated = await window.auraAPI.passwords.save(entry);
                    setSavedPasswords(updated);
                  } catch {
                    const entry = { id: Date.now().toString(), ...pendingCredential };
                    const updated = [...savedPasswords, entry];
                    setSavedPasswords(updated);
                    localStorage.setItem('aura-passwords', JSON.stringify(updated));
                  }
                  setPendingCredential(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
              >Save</button>
              <button
                onClick={() => setPendingCredential(null)}
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--btn-hover)] transition-colors shrink-0"
              >No</button>
            </div>
          )}

          {/* Autofill Prompt — top-right, supports multiple credentials */}
          {autofillPrompt && (
            <div className="absolute top-3 right-3 z-50 glass rounded-xl shadow-2xl fade-in" style={{ minWidth: '300px', maxWidth: '360px' }}>
              <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--border)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <p className="text-sm font-medium text-[var(--text)] flex-1">
                  {autofillPrompt.matches.length > 1 ? 'Choose an account' : `Autofill for ${autofillPrompt.matches[0]?.site}?`}
                </p>
                <button onClick={() => {
                  // Mark as dismissed for this tab+domain so retries don't re-show
                  if (autofillPrompt.matches.length > 0) {
                    const domain = autofillPrompt.matches[0].site;
                    dismissedAutofillRef.current.add(autofillPrompt.tabId + ':' + domain);
                  }
                  setAutofillPrompt(null);
                }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--btn-hover)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="py-1">
                {autofillPrompt.matches.map((cred, i) => (
                  <button
                    key={`${cred.username}-${i}`}
                    onClick={() => {
                      const wv = webviewRefs.current.get(autofillPrompt.tabId) as any;
                      if (wv) {
                        try { wv.executeJavaScript(getAutofillScript(cred.username, cred.password)).catch(() => {}); } catch {}
                      }
                      setAutofillPrompt(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--btn-hover)] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {cred.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text)] truncate">{cred.username}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{'•'.repeat(8)}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="shrink-0 opacity-60"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* In-Page Search Bar */}
          {showFindId && showFindId === activeTabId && (
            <div className="absolute top-3 right-6 z-50 glass rounded-xl px-2 py-1.5 flex items-center gap-2 shadow-2xl fade-in border border-[var(--border)]" style={{ minWidth: '280px' }}>
              <div className="flex items-center flex-1 bg-[var(--input-bg)] rounded-md px-2 py-1 gap-2 border border-transparent focus-within:border-[var(--accent)] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  id="in-page-search-input"
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.shiftKey ? findPrev() : findNext();
                    } else if (e.key === 'Escape') {
                      closeFind();
                    }
                  }}
                  placeholder="Find in page..."
                  className="flex-1 bg-transparent outline-none text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)]"
                />
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {findResults.matches > 0 ? `${findResults.activeMatchOrdinal} / ${findResults.matches}` : '0 / 0'}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={findPrev} disabled={!findText || findResults.matches === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--btn-hover)] text-[var(--text)] disabled:opacity-30 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button onClick={findNext} disabled={!findText || findResults.matches === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--btn-hover)] text-[var(--text)] disabled:opacity-30 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <div className="w-px h-4 bg-[var(--border)] mx-1" />
                <button onClick={closeFind} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
