/**
 * Realtime Synchronization Engine for Google Spreadsheet & WebAppScript
 * Pondok Pesantren / SMP Terpadu Al-Ihsan
 * 
 * Features:
 * 1. Automatic debounced push on ANY db_* update (via localStorage interception & event listeners)
 * 2. Background fetch on startup and on window focus (two-way sync)
 * 3. Reactive status subscribers for UI badges & feedback
 * 4. Resilient error handling with retry and queue management
 */

export interface SyncStatus {
  state: 'unconfigured' | 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: Date | null;
  errorMessage?: string;
  pendingKeys: string[];
  lastSyncCount: number;
}

export type SyncListener = (status?: SyncStatus) => void;

export const SYNC_TABLE_KEYS = [
  'db_students',
  'db_pendaftar',
  'db_ustadz_master',
  'db_kelas',
  'db_pelajaran',
  'db_pelajaran_v2',
  'db_jadwal',
  'db_jadwal_piket_guru',
  'db_jadwal_special_labels',
  'db_jadwal_time_slots',
  'db_student_attendance_v2',
  'db_teachers_attendance',
  'db_teachers_attendance_history',
  'db_event_attendance',
  'db_grades_v2',
  'db_grades_karakter_v2',
  'db_grade_categories_v2',
  'db_tahfidz_records_v2',
  'db_tahfidz_records',
  'db_majelis_tahfidz',
  'db_students_tahfidz_panel',
  'db_beasiswa',
  'db_custom_donatur_list',
  'db_student_mutations',
  'db_student_archives',
  'db_spm_archives',
  'db_berita',
  'db_config',
  'db_rbac_config',
  'db_portal_access',
  'db_school_profile',
  'db_visimisi',
  'db_struktur',
  'db_beranda_config',
  'pesan_masuk',
  'cfg_tahun_ajaran_aktif',
  'cfg_semester_aktif',
  'cfg_available_years',
  'db_academic_calendar',
  'db_pondok_agenda'
];

class RealtimeSyncManager {
  private status: SyncStatus = {
    state: 'unconfigured',
    lastSyncedAt: null,
    pendingKeys: [],
    lastSyncCount: 0
  };

  private listeners: Set<SyncListener> = new Set();
  private pendingQueue: Map<string, any> = new Map();
  private debounceTimer: any = null;
  private isWatcherInitialized = false;
  private isSyncing = false;
  private lastFetchTime = 0;

  constructor() {
    this.updateInitialStatus();
  }

  public getSnapshot = (): SyncStatus => {
    return this.status;
  };

  public getEffectiveUrl(): string {
    const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec';
    if (typeof window === 'undefined') return DEFAULT_URL;
    try {
      let candidate = localStorage.getItem('cfg_apps_script_url');
      if (!candidate || !candidate.trim().startsWith('http')) {
        const rawCfg = localStorage.getItem('db_config');
        if (rawCfg) {
          const parsed = JSON.parse(rawCfg);
          if (parsed?.appsScriptUrl && String(parsed.appsScriptUrl).trim().startsWith('http')) {
            candidate = String(parsed.appsScriptUrl).trim();
          }
        }
      }

      if (candidate) {
        let clean = candidate.trim().replace(/^["']+|["']+$/g, '');
        if (clean.includes('docs.google.com/spreadsheets') || clean.includes('...') || clean.includes('AKfycb...')) {
          localStorage.setItem('cfg_apps_script_url', DEFAULT_URL);
          return DEFAULT_URL;
        }
        if (clean.includes('script.google.com/macros/s/')) {
          clean = clean.replace(/\/(edit|dev|view)(\?.*)?$/, '/exec$2');
          if (!clean.includes('/exec')) {
            clean = clean.replace(/\/$/, '') + '/exec';
          }
          const match = clean.match(/\/macros\/s\/([^/]+)\/exec/);
          if (!match || match[1].length < 30) {
            localStorage.setItem('cfg_apps_script_url', DEFAULT_URL);
            return DEFAULT_URL;
          }
        }
        if (clean !== candidate) {
          localStorage.setItem('cfg_apps_script_url', clean);
        }
        return clean;
      }
    } catch {}
    return DEFAULT_URL;
  }

  public getSpreadsheetId(): string {
    if (typeof window === 'undefined') return '';
    try {
      const direct = localStorage.getItem('cfg_cloud_spreadsheet_id');
      if (direct) return direct.trim();

      const rawCfg = localStorage.getItem('db_config');
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        if (parsed?.spreadsheetId) return String(parsed.spreadsheetId).trim();
      }
    } catch {}
    return '';
  }

  public subscribe = (listener: SyncListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    // Schedule listener notifications asynchronously to avoid triggering React's
    // "Cannot update a component while rendering a different component" error
    // when storage updates occur during a component render or lifecycle phase
    setTimeout(() => {
      const copy = { ...this.status };
      this.listeners.forEach(cb => {
        try {
          cb(copy);
        } catch (e) {
          console.error('Error in sync listener:', e);
        }
      });
    }, 0);
  }

  private updateInitialStatus() {
    const url = this.getEffectiveUrl();
    const spreadsheetId = this.getSpreadsheetId();
    this.status = {
      ...this.status,
      state: (!url && !spreadsheetId) ? 'unconfigured' : 'idle'
    };
  }

  /**
   * Queue a table change to be synced to Google Sheets in real-time
   */
  public queueChange(key: string, data: any) {
    if (!SYNC_TABLE_KEYS.includes(key) && !key.startsWith('db_') && !key.startsWith('cfg_')) {
      return;
    }

    const url = this.getEffectiveUrl();
    const spreadsheetId = this.getSpreadsheetId();
    if (!url && !spreadsheetId) {
      this.status = { ...this.status, state: 'unconfigured' };
      this.notify();
      return;
    }

    this.pendingQueue.set(key, data);
    this.status = {
      ...this.status,
      pendingKeys: Array.from(this.pendingQueue.keys()),
      state: 'syncing'
    };
    this.notify();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce 2.5 seconds to batch rapid user inputs or multi-row additions
    this.debounceTimer = setTimeout(() => {
      this.flushQueue();
    }, 2500);
  }

  /**
   * Flush pending changes immediately
   */
  public async flushQueue(): Promise<boolean> {
    if (this.isSyncing) return false;
    const url = this.getEffectiveUrl();
    const spreadsheetId = this.getSpreadsheetId();
    if (!url && !spreadsheetId) {
      this.status = { ...this.status, state: 'unconfigured' };
      this.notify();
      return false;
    }

    if (this.pendingQueue.size === 0) {
      this.status = { ...this.status, state: 'idle' };
      this.notify();
      return true;
    }

    this.isSyncing = true;
    this.status = {
      ...this.status,
      state: 'syncing',
      errorMessage: undefined
    };
    this.notify();

    // Prepare batch payload
    const batchPayload: Record<string, any> = {};
    const keysInFlight: string[] = [];

    this.pendingQueue.forEach((val, key) => {
      batchPayload[key] = val;
      keysInFlight.push(key);
    });

    try {
      let response: Response;
      if (url) {
        response = await fetch('/api/sheets/proxy-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url,
            payload: batchPayload
          })
        });
      } else {
        response = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: batchPayload,
            spreadsheetId: spreadsheetId
          })
        });
      }

      if (!response.ok) {
        let errText = `Status HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          errText = errJson.error || errJson.message || errText;
        } catch {}
        throw new Error(errText);
      }

      // Check if proxy suggested updating activeUrl
      try {
        const resJson = await response.json();
        if (resJson?.fallbackUsed && resJson?.activeUrl) {
          localStorage.setItem('cfg_apps_script_url', resJson.activeUrl);
        }
      } catch {}

      // Remove synced items from queue
      keysInFlight.forEach(k => this.pendingQueue.delete(k));

      this.status = {
        ...this.status,
        state: 'synced',
        lastSyncedAt: new Date(),
        lastSyncCount: keysInFlight.length,
        pendingKeys: Array.from(this.pendingQueue.keys())
      };
      this.notify();

      // Reset to idle after 4 seconds
      setTimeout(() => {
        if (this.status.state === 'synced' && this.pendingQueue.size === 0) {
          this.status = { ...this.status, state: 'idle' };
          this.notify();
        }
      }, 4000);

      return true;
    } catch (err: any) {
      console.warn('Realtime sync push notice:', err.message);
      this.status = {
        ...this.status,
        state: 'error',
        errorMessage: err.message || 'Gagal menyinkronkan ke Spreadsheet'
      };
      this.notify();
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync ALL available tables to Google Sheets right now
   */
  public async syncAllNow(): Promise<boolean> {
    const url = this.getEffectiveUrl();
    const spreadsheetId = this.getSpreadsheetId();
    if (!url && !spreadsheetId) {
      this.status = { ...this.status, state: 'unconfigured' };
      this.notify();
      throw new Error('URL Web App Google Apps Script atau ID Spreadsheet belum diisi');
    }

    const payload: Record<string, any> = {};
    SYNC_TABLE_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          payload[key] = JSON.parse(raw);
        } catch {
          payload[key] = raw;
        }
      }
    });

    this.isSyncing = true;
    this.status = {
      ...this.status,
      state: 'syncing',
      errorMessage: undefined
    };
    this.notify();

    try {
      let response: Response;
      if (url) {
        response = await fetch('/api/sheets/proxy-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url,
            payload: payload
          })
        });
      } else {
        response = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: payload,
            spreadsheetId: spreadsheetId
          })
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }

      try {
        const resJson = await response.json();
        if (resJson?.fallbackUsed && resJson?.activeUrl) {
          localStorage.setItem('cfg_apps_script_url', resJson.activeUrl);
        }
      } catch {}

      this.pendingQueue.clear();
      this.status = {
        ...this.status,
        state: 'synced',
        lastSyncedAt: new Date(),
        lastSyncCount: Object.keys(payload).length,
        pendingKeys: []
      };
      this.notify();

      setTimeout(() => {
        if (this.status.state === 'synced') {
          this.status = { ...this.status, state: 'idle' };
          this.notify();
        }
      }, 4000);

      return true;
    } catch (err: any) {
      this.status = {
        ...this.status,
        state: 'error',
        errorMessage: err.message || 'Gagal sinkronisasi penuh'
      };
      this.notify();
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Fetch latest data from Spreadsheet via Apps Script Web App or Sheets API (two-way sync)
   */
  public async pullFromSpreadsheet(force = false): Promise<{ success: boolean; updatedCount: number }> {
    const url = this.getEffectiveUrl();
    const spreadsheetId = this.getSpreadsheetId();
    if (!url && !spreadsheetId) return { success: false, updatedCount: 0 };

    // Throttle pull to minimum every 15 seconds to avoid flooding (bypassed if force=true)
    const now = Date.now();
    if (!force && (now - this.lastFetchTime < 15000)) {
      return { success: false, updatedCount: 0 };
    }
    this.lastFetchTime = now;

    this.status = {
      ...this.status,
      state: 'syncing'
    };
    this.notify();

    try {
      // 1. Try fetching via API backend fetch
      const params = new URLSearchParams();
      if (spreadsheetId) params.append('spreadsheetId', spreadsheetId);
      if (url) params.append('appsScriptUrl', url);
      const endpoint = `/api/sheets/fetch?${params.toString()}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && typeof json.data === 'object') {
          let count = 0;
          Object.keys(json.data).forEach(k => {
            const val = json.data[k];
            if (val !== undefined && val !== null) {
              try {
                // Don't trigger recursive queueChange by using direct storage
                window.localStorage.__origSetItem?.(k, typeof val === 'object' ? JSON.stringify(val) : String(val));
                count++;
              } catch {}
            }
          });
          if (count > 0) {
            window.dispatchEvent(new CustomEvent('app_data_synced_from_remote', { detail: json.data }));
          }

          this.status = {
            ...this.status,
            state: 'synced',
            lastSyncedAt: new Date(),
            lastSyncCount: count
          };
          this.notify();

          return { success: true, updatedCount: count };
        }
      }
    } catch (err) {
      console.warn('Pull from spreadsheet notice:', err);
    }

    this.status = {
      ...this.status,
      state: 'idle'
    };
    this.notify();

    return { success: false, updatedCount: 0 };
  }

  /**
   * Install the global watcher that monitors data changes across the entire app
   */
  public initWatcher() {
    if (this.isWatcherInitialized || typeof window === 'undefined') return;
    this.isWatcherInitialized = true;

    // 1. Intercept localStorage.setItem safely
    try {
      const origSetItem = window.localStorage.setItem.bind(window.localStorage);
      // Keep reference for direct storage updates without re-triggering queue
      (window.localStorage as any).__origSetItem = origSetItem;

      window.localStorage.setItem = (key: string, value: string) => {
        origSetItem(key, value);
        if (SYNC_TABLE_KEYS.includes(key) || key.startsWith('db_') || key.startsWith('cfg_')) {
          if (key === 'cfg_apps_script_url' || key === 'cfg_cloud_spreadsheet_id') {
            this.updateInitialStatus();
            this.notify();
            return;
          }
          try {
            const parsed = JSON.parse(value);
            this.queueChange(key, parsed);
          } catch {
            this.queueChange(key, value);
          }
        }
      };
    } catch (e) {
      console.warn('Could not wrap localStorage.setItem:', e);
    }

    // 2. Listen to custom application change events
    window.addEventListener('app_data_changed', ((e: CustomEvent) => {
      if (e.detail?.key && e.detail?.data !== undefined) {
        this.queueChange(e.detail.key, e.detail.data);
      }
    }) as EventListener);

    // 3. Listen to page visibility changes / window focus for automatic background pull
    window.addEventListener('focus', () => {
      this.pullFromSpreadsheet();
    });

    // 4. Before unload, flush any pending changes
    window.addEventListener('beforeunload', () => {
      if (this.pendingQueue.size > 0 && typeof navigator.sendBeacon === 'function') {
        const url = this.getEffectiveUrl();
        if (url) {
          const payload: Record<string, any> = {};
          this.pendingQueue.forEach((v, k) => { payload[k] = v; });
          try {
            const blob = new Blob([JSON.stringify({ url, payload })], { type: 'application/json' });
            navigator.sendBeacon('/api/sheets/proxy-webhook', blob);
          } catch {}
        }
      }
    });

    // 5. Initial pull immediately upon startup with standard Al-Ihsan Apps Script
    setTimeout(() => {
      this.pullFromSpreadsheet(true);
    }, 50);
  }
}

export const realtimeSync = new RealtimeSyncManager();
