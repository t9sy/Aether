import { contextBridge, ipcRenderer } from 'electron';

export interface AuraAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    fullscreen: () => void;
    toggleDevTools: () => void;
  };
  contextMenu: {
    show: (params: { x: number; y: number; linkURL?: string; srcURL?: string; selectionText?: string; isEditable?: boolean; mediaType?: string }) => void;
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
    save: (entry: { id: string; site: string; username: string; password: string }) => Promise<any[]>;
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
    onAction: (callback: (action: string) => void) => void;
  };
}

const auraAPI: AuraAPI = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    fullscreen: () => ipcRenderer.send('window:fullscreen'),
    toggleDevTools: () => ipcRenderer.send('window:toggle-devtools'),
  },
  contextMenu: {
    show: (params) => ipcRenderer.send('context-menu:show', params),
    onOpenLink: (callback) => ipcRenderer.on('context-menu:open-link', (_e, url) => callback(url)),
    onBack: (callback) => ipcRenderer.on('context-menu:back', () => callback()),
    onForward: (callback) => ipcRenderer.on('context-menu:forward', () => callback()),
    onReload: (callback) => ipcRenderer.on('context-menu:reload', () => callback()),
    onInspect: (callback) => ipcRenderer.on('context-menu:inspect', () => callback()),
  },
  zoom: {
    onIn: (callback) => ipcRenderer.on('zoom:in', () => callback()),
    onOut: (callback) => ipcRenderer.on('zoom:out', () => callback()),
    onReset: (callback) => ipcRenderer.on('zoom:reset', () => callback()),
  },
  passwords: {
    get: () => ipcRenderer.invoke('passwords:get'),
    save: (entry) => ipcRenderer.invoke('passwords:save', entry),
    delete: (id) => ipcRenderer.invoke('passwords:delete', id),
  },
  downloads: {
    onStart: (callback) => {
      const handler = (_e: any, data: any) => callback(data);
      ipcRenderer.on('download:start', handler);
      return () => ipcRenderer.off('download:start', handler);
    },
    onProgress: (callback) => {
      const handler = (_e: any, data: any) => callback(data);
      ipcRenderer.on('download:progress', handler);
      return () => ipcRenderer.off('download:progress', handler);
    },
    onComplete: (callback) => {
      const handler = (_e: any, data: any) => callback(data);
      ipcRenderer.on('download:complete', handler);
      return () => ipcRenderer.off('download:complete', handler);
    },
    onCancelled: (callback) => {
      const handler = (_e: any, data: any) => callback(data);
      ipcRenderer.on('download:cancelled', handler);
      return () => ipcRenderer.off('download:cancelled', handler);
    },
    pause: (id) => ipcRenderer.send('download:pause', id),
    resume: (id) => ipcRenderer.send('download:resume', id),
    cancel: (id) => ipcRenderer.send('download:cancel', id),
    openFolder: (filename) => ipcRenderer.send('download:open-folder', filename),
  },
  settings: {
    sync: (key, value) => ipcRenderer.send('settings:sync', { key, value }),
  },
  shortcuts: {
    onAction: (callback) => {
      const handler = (_e: any, action: string) => callback(action);
      ipcRenderer.on('shortcut', handler);
      return () => ipcRenderer.off('shortcut', handler);
    },
  },
};

contextBridge.exposeInMainWorld('auraAPI', auraAPI);
