import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import multer from "multer";
import { Readable } from "stream";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Persistent Server-side Configuration Store for instant cross-device synchronization
  const configFilePath = path.join(process.cwd(), '.server_config.json');
  let inMemoryConfig: any = null;

  const loadServerConfig = () => {
    if (inMemoryConfig) return inMemoryConfig;
    try {
      if (fs.existsSync(configFilePath)) {
        const raw = fs.readFileSync(configFilePath, 'utf8');
        inMemoryConfig = JSON.parse(raw);
        return inMemoryConfig;
      }
    } catch (e) {
      console.log("Server config file notice (using memory defaults):", e);
    }
    return null;
  };

  const saveServerConfig = (cfg: any) => {
    inMemoryConfig = cfg;
    try {
      fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.log("Server config file write notice:", e);
    }
  };

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Assistant / Text generation route (with lazy initialization)
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, model = "gemini-2.5-flash" } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate content" });
    }
  });

  // Config routes for universal cross-device password & system settings sync
  app.get("/api/config", (req, res) => {
    const cfg = loadServerConfig() || {};
    if (!cfg.appsScriptUrl) {
      cfg.appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
    }
    res.json({ success: true, config: cfg });
  });

  app.post("/api/config", (req, res) => {
    const newCfg = req.body;
    if (newCfg && typeof newCfg === 'object') {
      const existing = loadServerConfig() || {};
      const merged = { ...existing, ...newCfg };
      saveServerConfig(merged);
      return res.json({ success: true, config: merged });
    }
    res.status(400).json({ success: false, error: "Invalid config payload" });
  });

  app.post("/api/verify-portal-password", async (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: "Password required" });
    }
    const inputPass = password.trim();
    const cfg = loadServerConfig();
    const portalAccessConfigs = cfg?.portalAccessConfigs || [];
    
    let match = portalAccessConfigs.find((c: any) => (c.password || '').trim() === inputPass);
    // 3. If not matched, try live fetch from spreadsheet if spreadsheetId is known
    let targetSpreadsheetId = cfg?.spreadsheetId || '1pANnXmFHN1KOIFavrjMJ5NgfobMuGdMiBcsSb0EjE9Q';
    if (!match && targetSpreadsheetId) {
      try {
        const cleanId = extractSpreadsheetId(targetSpreadsheetId);
        const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('AKSES_PORTAL')}`;
        const sheetRes = await axios.get(url, { timeout: 4000 });
        if (sheetRes.status === 200 && typeof sheetRes.data === 'string' && sheetRes.data.length > 5 && !sheetRes.data.includes('<!DOCTYPE html>')) {
          const rows = parseCSVToObjects(sheetRes.data);
          const parsedConfigs = parsePortalRecords(rows);
          if (parsedConfigs.length > 0) {
            match = parsedConfigs.find((c: any) => (c.password || '').trim() === inputPass);
            const currentCfg = loadServerConfig() || {};
            saveServerConfig({ ...currentCfg, portalAccessConfigs: parsedConfigs });
          }
        }
      } catch (sheetErr: any) {
        console.log("Spreadsheet live password check notice:", sheetErr.message);
      }
    }

    const isMasterAdmin = inputPass.toLowerCase() === 'adminalwa' || inputPass === 'admin';
    if (!match && isMasterAdmin) {
      match = {
        id: 'portal-superadmin',
        label: inputPass.toLowerCase() === 'adminalwa' ? 'Super Administrator (Alwa)' : 'Super Administrator',
        password: inputPass,
        menuPermissions: {
          dashboard_utama: 'write',
          master_siswa: 'write',
          master_kelas: 'write',
          master_pelajaran: 'write',
          master_ustadz: 'write',
          master_beasiswa: 'write',
          akademik_jadwal: 'write',
          akademik_kehadiran_siswa: 'write',
          akademik_barcode: 'write',
          akademik_kehadiran_guru: 'write',
          akademik_nilai: 'write',
          akademik_tahfidz: 'write',
          akademik_card_generator: 'write',
          laporan_akademik: 'write',
          _ppdb_eval: 'write',
          berkas_pendaftaran: 'write',
          _ppdb_berita: 'write',
          sistem_mutasi_alokasi: 'write',
          _ekspor_backup_sheets: 'write',
          sistem_pengaturan: 'write'
        }
      };
    }
    if (match) {
      return res.json({ success: true, match, config: loadServerConfig() || cfg });
    }
    return res.json({ success: false, error: "Sandi tidak cocok" });
  });

  // Google Drive Helper with OAuth Token support
  const getDriveService = (authHeader?: string) => {
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: token });
      return google.drive({ version: "v3", auth: oauth2Client });
    }
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  };

  app.get("/api/drive/service-account", async (req, res) => {
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      const client = await auth.getClient();
      // Try multiple ways to get the email
      const email = (client as any).email || 
                    (client as any).client_email || 
                    (client as any).credentials?.client_email ||
                    (client as any).issuer ||
                    (client as any).serviceAccountEmail;

      if (!email) {
        return res.json({ email: null, message: "No service account credentials detected (Use Google OAuth login)" });
      }

      res.json({ email });
    } catch (err: any) {
      console.log("Service account info notice (OAuth is active):", err.message);
      res.json({ email: null, message: "No service account credentials detected (Use Google OAuth login)" });
    }
  });

  // 1. Upload File to Google Drive
  app.post("/api/drive/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const drive = getDriveService(req.headers.authorization);
      let { name, parentId, description } = req.body;

      // Robust ID Extraction from URL
      if (parentId && parentId.includes("drive.google.com")) {
        const match = parentId.match(/([a-zA-Z0-9_-]{25,})/);
        if (match) parentId = match[1];
      }

      const fileMetadata = {
        name: name || req.file.originalname,
        parents: parentId ? [parentId] : undefined,
        description: description || "",
      };

      const media = {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink",
      });

      // Make file public
      try {
        await drive.permissions.create({
          fileId: response.data.id!,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });
      } catch (pErr) {
        console.log("Drive permissions notice:", pErr);
      }

      res.json({
        id: response.data.id,
        url: response.data.webViewLink,
        downloadUrl: response.data.webContentLink,
      });
    } catch (err: any) {
      console.error("Drive upload error:", err);
      let message = err.message;
      if (message.includes("has not been used in project") || message.includes("disabled")) {
        message = "Google Drive API belum diaktifkan di Google Cloud Console. Silakan buka: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=857581274741";
      }
      res.status(500).json({ error: message });
    }
  });

  // 2. Create Folder in Google Drive
  app.post("/api/drive/create-folder", async (req, res) => {
    try {
      let { name, parentId } = req.body;
      const drive = getDriveService(req.headers.authorization);

      // Robust ID Extraction from URL
      if (parentId && parentId.includes("drive.google.com")) {
        const match = parentId.match(/([a-zA-Z0-9_-]{25,})/);
        if (match) parentId = match[1];
      }

      const fileMetadata = {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id",
      });

      res.json({ id: response.data.id });
    } catch (err: any) {
      console.error("Drive folder creation error:", err);
      let message = err.message;
      if (message.includes("has not been used in project") || message.includes("disabled")) {
        message = "Google Drive API belum diaktifkan.";
      }
      res.status(500).json({ error: message });
    }
  });

  // 3. List Folders in Google Drive
  app.get("/api/drive/folders", async (req, res) => {
    try {
      let { parentId } = req.query as any;
      const drive = getDriveService(req.headers.authorization as string);

      // Robust ID Extraction from URL
      if (parentId && parentId.includes("drive.google.com")) {
        const match = parentId.match(/([a-zA-Z0-9_-]{25,})/);
        if (match) parentId = match[1];
      }

      const q = `mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`;
      
      const response = await drive.files.list({
        q: q,
        fields: "files(id, name)",
        spaces: "drive",
      });

      res.json(response.data.files);
    } catch (err: any) {
      console.error("Drive folder list error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Indonesion regional administrative data proxy
  app.get("/api/wilayah/provinces", async (req, res) => {
    try {
      const response = await axios.get("https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json", { timeout: 10000 });
      res.json(response.data);
    } catch (err: any) {
      console.error("Proxy error fetching provinces, trying backup...", err.message);
      try {
        const responseBackup = await axios.get("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json", { timeout: 10000 });
        res.json(responseBackup.data);
      } catch (backupErr: any) {
        console.error("All province fetches failed, using fallback preset data:", backupErr.message);
        // Resilient fallback so the app is always functional
        res.json([
          { id: "32", name: "JAWA BARAT" },
          { id: "31", name: "DKI JAKARTA" },
          { id: "33", name: "JAWA TENGAH" },
          { id: "35", name: "JAWA TIMUR" },
          { id: "36", name: "BANTEN" }
        ]);
      }
    }
  });

  app.get("/api/wilayah/regencies/:provId", async (req, res) => {
    const { provId } = req.params;
    try {
      const response = await axios.get(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provId}.json`, { timeout: 10000 });
      res.json(response.data);
    } catch (err: any) {
      console.error(`Proxy error fetching regencies for ${provId}, trying backup...`, err.message);
      try {
        const responseBackup = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`, { timeout: 10000 });
        res.json(responseBackup.data);
      } catch (backupErr: any) {
        console.error("All regencies fetches failed, using fallback preset data:", backupErr.message);
        if (provId === "32") {
          res.json([
            { id: "3201", province_id: "32", name: "KABUPATEN BOGOR" },
            { id: "3273", province_id: "32", name: "KOTA BANDUNG" },
            { id: "3276", province_id: "32", name: "KOTA DEPOK" },
            { id: "3275", province_id: "32", name: "KOTA BEKASI" }
          ]);
        } else {
          res.json([]);
        }
      }
    }
  });

  app.get("/api/wilayah/districts/:kabId", async (req, res) => {
    const { kabId } = req.params;
    try {
      const response = await axios.get(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${kabId}.json`, { timeout: 10000 });
      res.json(response.data);
    } catch (err: any) {
      console.error(`Proxy error fetching districts for ${kabId}, trying backup...`, err.message);
      try {
        const responseBackup = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${kabId}.json`, { timeout: 10000 });
        res.json(responseBackup.data);
      } catch (backupErr: any) {
        console.error("All districts fetches failed, using fallback preset data:", backupErr.message);
        if (kabId === "3201") {
          res.json([
            { id: "3201010", regency_id: "3201", name: "CIAWI" },
            { id: "3201020", regency_id: "3201", name: "CISARUA" },
            { id: "3201030", regency_id: "3201", name: "MEGAMENDUNG" }
          ]);
        } else {
          res.json([]);
        }
      }
    }
  });

  app.get("/api/wilayah/villages/:kecId", async (req, res) => {
    const { kecId } = req.params;
    try {
      const response = await axios.get(`https://emsifa.github.io/api-wilayah-indonesia/api/villages/${kecId}.json`, { timeout: 10000 });
      res.json(response.data);
    } catch (err: any) {
      console.error(`Proxy error fetching villages for ${kecId}, trying backup...`, err.message);
      try {
        const responseBackup = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${kecId}.json`, { timeout: 10000 });
        res.json(responseBackup.data);
      } catch (backupErr: any) {
        console.error("All villages fetches failed, using fallback preset data:", backupErr.message);
        if (kecId === "3201010") {
          res.json([
            { id: "3201010001", district_id: "3201010", name: "CIAWI" },
            { id: "3201010002", district_id: "3201010", name: "PANDANSARI" },
            { id: "3201010003", district_id: "3201010", name: "BENDUNGAN" }
          ]);
        } else {
          res.json([]);
        }
      }
    }
  });

  // Default official working Google Apps Script Web App for Pondok Tahfidz Al-Ihsan
  const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec";
  const FALLBACK_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwmnw9FAQ2O3P6xEeGZZA9jd5-8oE9tqJbMmE9CagoKyIX4GU73DFBhgSQM8KeFJAaKDA/exec";

  const normalizeAppsScriptUrl = (rawUrl?: string): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_APPS_SCRIPT_URL;
    let clean = rawUrl.trim().replace(/^["']+|["']+$/g, '');
    if (!clean.startsWith('http')) return DEFAULT_APPS_SCRIPT_URL;

    // If user mistakenly pasted a Google Sheets URL instead of an Apps Script Web App URL
    if (clean.includes('docs.google.com/spreadsheets')) {
      return DEFAULT_APPS_SCRIPT_URL;
    }

    // If placeholder or truncated string was passed
    if (clean.includes('...') || clean.includes('AKfycb...')) {
      return DEFAULT_APPS_SCRIPT_URL;
    }

    // Normalize Apps Script /edit, /dev, /view to /exec
    if (clean.includes('script.google.com/macros/s/')) {
      clean = clean.replace(/\/(edit|dev|view)(\?.*)?$/, '/exec$2');
      if (!clean.includes('/exec')) {
        clean = clean.replace(/\/$/, '') + '/exec';
      }

      const match = clean.match(/\/macros\/s\/([^/]+)\/exec/);
      if (!match || match[1].length < 30) {
        return DEFAULT_APPS_SCRIPT_URL;
      }
      return clean;
    }

    return clean;
  };

  // Proxy for Google Apps Script Webhook to avoid CORS in frontend
  app.post("/api/sheets/proxy-webhook", async (req, res) => {
    const rawUrl = req.body.url;
    let targetUrl = normalizeAppsScriptUrl(rawUrl);
    const payload = req.body.payload;

    // SAFETY & SEPARATION GUARDS FOR GOOGLE SHEETS
    if (payload && typeof payload === 'object') {
      // 1. Anti-Wipeout Guard: Never push empty array of students or ustadz to webhook
      if (Array.isArray(payload.db_students) && payload.db_students.length === 0) {
        console.warn("[SAFETY GUARD] Blocked empty payload.db_students from being forwarded to Apps Script webhook.");
        delete payload.db_students;
      }
      if (Array.isArray(payload.db_students_academic) && payload.db_students_academic.length === 0) {
        delete payload.db_students_academic;
      }
      if (Array.isArray(payload.db_ustadz_master) && payload.db_ustadz_master.length === 0) {
        delete payload.db_ustadz_master;
      }

      // 2. Separate Sheets: If db_students is present, split into Master (tanpa kelas dan TA) and Akademik (dengan kelas dan TA)
      if (Array.isArray(payload.db_students) && payload.db_students.length > 0) {
        const fullStudents = payload.db_students;
        const defaultTA = payload.cfg_tahun_ajaran_aktif || '2026/2027';
        const defaultSemester = payload.cfg_semester_aktif || 'Ganjil';

        // Academic table (dengan kelas dan TA)
        payload.db_students_academic = fullStudents.map((s: any) => ({
          id: String(s.id || '').trim(),
          nis: String(s.nis || '').trim(),
          nisn: String(s.nisn || '').trim(),
          nama: String(s.nama || s.namaLengkap || '').trim(),
          jenisKelamin: String(s.jenisKelamin || s.gender || 'LAKI-LAKI').trim(),
          kelas: String(s.kelas || 'Belum Diatur').trim(),
          tahunAjaran: String(s.academicYear || s.tahunAjaran || defaultTA).trim(),
          semester: String(s.semester || defaultSemester).trim(),
          status: String(s.status || 'Aktif').trim(),
          jenjang: String(s.jenjang || 'SMP Terpadu').trim(),
          waliKelas: String(s.waliKelas || '-').trim(),
          kelompokBelajar: String(s.kelompokBelajar || '-').trim(),
          halaqahTahfidz: String(s.halaqahTahfidz || '-').trim(),
          asrama: String(s.asrama || '-').trim(),
          kamar: String(s.kamar || '-').trim(),
          catatanAkademik: String(s.catatanAkademik || '').trim()
        }));

        // Master biodata table (tanpa kelas dan TA)
        payload.db_students = fullStudents.map((s: any) => {
          const masterCopy = { ...s };
          delete masterCopy.kelas;
          delete masterCopy.academicYear;
          delete masterCopy.tahunAjaran;
          delete masterCopy.semester;
          delete masterCopy.rombel;
          delete masterCopy.academicHistory;
          return masterCopy;
        });
      }
    }

    console.log(`Proxying POST request to Apps Script: ${targetUrl.substring(0, 60)}...`);

    try {
      let response: any;
      let fallbackUsed = false;
      try {
        response = await axios.post(targetUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 60000, // Apps Script can be slow (up to 60s)
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          maxRedirects: 5
        });
      } catch (postErr: any) {
        // If the custom URL resulted in 404/403 or connection failure and is not the default, fallback to default
        if (targetUrl !== DEFAULT_APPS_SCRIPT_URL && (postErr.response?.status === 404 || postErr.response?.status === 403 || !postErr.response)) {
          console.log(`Switching custom Apps Script endpoint to default production endpoint...`);
          try {
            response = await axios.post(DEFAULT_APPS_SCRIPT_URL, payload, {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              timeout: 60000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              maxRedirects: 5
            });
            targetUrl = DEFAULT_APPS_SCRIPT_URL;
            fallbackUsed = true;
          } catch (fallbackErr: any) {
            throw postErr;
          }
        } else {
          throw postErr;
        }
      }

      // Auto-persist valid, working appsScriptUrl to server configuration
      try {
        const current = loadServerConfig() || {};
        if (current.appsScriptUrl !== targetUrl) {
          saveServerConfig({ ...current, appsScriptUrl: targetUrl });
        }
      } catch {}

      const responseData = typeof response.data === 'object' && response.data !== null ? response.data : { result: response.data };
      return res.json({
        ...responseData,
        activeUrl: targetUrl,
        fallbackUsed: fallbackUsed || (rawUrl && targetUrl !== rawUrl)
      });
    } catch (err: any) {
      console.log("Apps Script proxy notice:", err.message);
      
      const statusCode = err.response?.status || (err.request ? 504 : 500);
      let errorMsg = err.message || "Gagal menghubungi Google Apps Script";
      
      if (statusCode === 404) {
        errorMsg = "URL Google Apps Script tidak ditemukan (HTTP 404). Pastikan Web App sudah di-deploy dengan akhiran '/exec'.";
      } else if (statusCode === 403) {
        errorMsg = "Akses Google Apps Script ditolak (HTTP 403). Pastikan Web App di-Deploy dengan setelan 'Who has access: Anyone'.";
      } else if (err.request) {
        errorMsg = "Tidak ada respon dari Apps Script (Timeout). Pastikan script sudah di-Deploy sebagai Web App.";
      }

      return res.status(statusCode).json({
        success: false,
        error: errorMsg,
        statusCode
      });
    }
  });

  // GET Proxy for Google Apps Script Webhook (for health checks and data fetching)
  app.get("/api/sheets/proxy-webhook", async (req, res) => {
    const rawUrl = req.query.url as string;
    let targetUrl = normalizeAppsScriptUrl(rawUrl);

    // Filter out the 'url' query parameter before forwarding to Apps Script
    const forwardedParams: Record<string, any> = {};
    for (const [key, val] of Object.entries(req.query)) {
      if (key !== 'url') {
        forwardedParams[key] = val;
      }
    }

    try {
      console.log(`Proxying GET request to Apps Script: ${targetUrl.substring(0, 60)}...`);
      let response: any;
      let fallbackUsed = false;
      try {
        response = await axios.get(targetUrl, {
          params: forwardedParams,
          timeout: 30000,
          headers: { 'Accept': 'application/json' },
          maxRedirects: 5
        });
      } catch (getErr: any) {
        if (targetUrl !== DEFAULT_APPS_SCRIPT_URL && (getErr.response?.status === 404 || getErr.response?.status === 403 || !getErr.response)) {
          console.log(`Switching custom Apps Script GET endpoint to default production endpoint...`);
          try {
            response = await axios.get(DEFAULT_APPS_SCRIPT_URL, {
              params: forwardedParams,
              timeout: 30000,
              headers: { 'Accept': 'application/json' },
              maxRedirects: 5
            });
            targetUrl = DEFAULT_APPS_SCRIPT_URL;
            fallbackUsed = true;
          } catch (fallbackErr: any) {
            throw getErr;
          }
        } else {
          throw getErr;
        }
      }

      const responseData = typeof response.data === 'object' && response.data !== null ? response.data : { result: response.data };
      return res.json({
        ...responseData,
        activeUrl: targetUrl,
        fallbackUsed: fallbackUsed || (rawUrl && targetUrl !== rawUrl)
      });
    } catch (err: any) {
      console.log("Apps Script GET proxy notice:", err.message);
      const statusCode = err.response?.status || (err.request ? 504 : 500);
      let errorMsg = err.message || "Gagal mengambil data dari Google Apps Script";
      if (statusCode === 404) {
        errorMsg = "URL Google Apps Script tidak ditemukan (HTTP 404).";
      } else if (statusCode === 403) {
        errorMsg = "Akses Google Apps Script ditolak (HTTP 403). Setel akses 'Anyone'.";
      }
      return res.status(statusCode).json({
        success: false,
        error: errorMsg,
        statusCode
      });
    }
  });

  // Base64 Upload File to Drive (for specific use cases)
  app.post("/api/drive/upload-base64", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { name, mimeType, base64Data, parentId } = req.body;
      const drive = getDriveService(req.headers.authorization);

      const buffer = Buffer.from(base64Data, 'base64');
      const media = {
        mimeType,
        body: Readable.from(buffer),
      };

      const fileMetadata = {
        name,
        parents: parentId ? [parentId] : undefined,
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink",
      });

      res.json(file.data);
    } catch (err: any) {
      console.error("Drive base64 upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // CSV Parser helper for GViz fallback
  function parseCSVToObjects(csvText: string): any[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
      if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;

      const obj: any = {};
      headers.forEach((header, index) => {
        if (!header) return;
        let val: any = cells[index] !== undefined ? cells[index] : "";
        if (typeof val === "string") {
          const lowerVal = val.trim().toLowerCase();
          if (lowerVal === "true") val = true;
          else if (lowerVal === "false") val = false;
        }
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try {
            val = JSON.parse(val);
          } catch {}
        }
        const lowerHeader = header.toLowerCase();
        const isIdentifier = lowerHeader === 'id' || lowerHeader.includes('nis') || lowerHeader.includes('nik') ||
                             lowerHeader.includes('kk') || lowerHeader.includes('nokk') || lowerHeader.includes('nip') ||
                             lowerHeader.includes('hp') || lowerHeader.includes('telepon') || lowerHeader.includes('wa') ||
                             lowerHeader.includes('nomor') || lowerHeader.includes('no') || lowerHeader.includes('rt') || lowerHeader.includes('rw') ||
                             lowerHeader.includes('password') || lowerHeader.includes('sandi') ||
                             lowerHeader.includes('tahun') || lowerHeader.includes('year') || lowerHeader.includes('code');

        if (isIdentifier) {
          if (typeof val === "number") {
            val = Number.isFinite(val) ? BigInt(Math.round(val)).toString() : "";
          } else if (typeof val === "string") {
            val = val.trim();
            if (val.startsWith("'")) val = val.slice(1).trim();
            const sciMatch = val.match(/^([0-9]+(?:[.,][0-9]+)?)[eE]([+-]?[0-9]+)$/);
            if (sciMatch) {
              try {
                const base = Number(sciMatch[1].replace(',', '.'));
                const exp = parseInt(sciMatch[2], 10);
                if (!isNaN(base) && !isNaN(exp)) {
                  const factor = Math.min(exp, 14);
                  const rem = exp - factor;
                  val = (BigInt(Math.round(base * Math.pow(10, factor))) * (BigInt(10) ** BigInt(rem))).toString();
                }
              } catch {}
            }
          }
        } else if (typeof val === "string" && val !== "" && !isIdentifier && !isNaN(Number(val)) && !val.includes("/")) {
          val = Number(val);
        }
        obj[header] = val;
      });
      records.push(obj);
    }

    return records;
  }

  // Helper to parse portal access records from rows/columns
  function parsePortalRecords(records: any[]): any[] {
    if (!Array.isArray(records)) return [];
    return records.map((rec: any, idx: number) => {
      const id = String(rec.id || rec.ID || rec.kode || rec.Kode || `portal-${idx + 1}`);
      const label = String(rec.label || rec.Label || rec.nama || rec.Nama || rec.role || rec.Role || 'Akses Portal');
      const password = String(rec.password !== undefined && rec.password !== null ? rec.password : (rec.Password || rec.sandi || rec.Sandi || '')).trim();

      let menuPermissions: Record<string, 'read' | 'write' | 'none'> = {};
      if (typeof rec.menuPermissions === 'object' && rec.menuPermissions !== null) {
        menuPermissions = rec.menuPermissions;
      } else if (typeof rec.menuPermissions === 'string' && (rec.menuPermissions.startsWith('{') || rec.menuPermissions.startsWith('['))) {
        try {
          menuPermissions = JSON.parse(rec.menuPermissions);
        } catch {}
      } else {
        // Build menu permissions from individual column headers
        Object.keys(rec).forEach((col) => {
          const lower = col.toLowerCase();
          if (!['id', 'label', 'password', 'sandi', 'role', 'nama', 'menupermissions'].includes(lower)) {
            const val = String(rec[col] || '').trim().toLowerCase();
            if (['write', 'crud', 'tulis', 'edit', 'full', 'ya', 'true', '1', 'v', '✓'].includes(val)) {
              menuPermissions[col] = 'write';
            } else if (['read', 'baca', 'lihat', 'view'].includes(val)) {
              menuPermissions[col] = 'read';
            } else if (['none', 'tidak', 'false', '0', 'no', '-', ''].includes(val)) {
              menuPermissions[col] = 'none';
            }
          }
        });
      }

      return {
        id,
        label,
        password,
        menuPermissions
      };
    });
  }

  // Utility function to extract clean Spreadsheet ID from ID or URL
  function extractSpreadsheetId(input: string): string {
    if (!input) return "";
    const trimmed = String(input).trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed.split('?')[0].split('#')[0].trim();
  }

  // Fallback function to fetch Google Sheets via Google Visualizations (GViz) CSV or Apps Script
  async function fetchSpreadsheetViaGViz(spreadsheetId: string, appsScriptUrl?: string) {
    const cleanId = extractSpreadsheetId(spreadsheetId);
    const result: Record<string, any> = {};
    const reverseMapping: Record<string, string> = {
      "MASTER_PPDB": "db_pendaftar",
      "MASTER_SISWA": "db_students",
      "DATA_SISWA_AKADEMIK": "db_students_academic",
      "SISWA_AKADEMIK": "db_students_academic",
      "MASTER_GURU_USTADZ": "db_ustadz_master",
      "MASTER_ROMBEL_KELAS": "db_kelas",
      "MASTER_MAPEL_KURIKULUM": "db_pelajaran",
      "MASTER_MAPEL_NILAI": "db_pelajaran_v2",
      "JADWAL_PELAJARAN": "db_jadwal",
      "ABSENSI_SISWA_HARIAN": "db_student_attendance_v2",
      "ABSENSI_GURU_LOG": "db_teachers_attendance",
      "ABSENSI_GURU_DETAIL": "db_teachers_attendance_history",
      "ABSENSI_EVENT_KEGIATAN": "db_event_attendance",
      "NILAI_AKADEMIK": "db_grades_v2",
      "NILAI_KARAKTER": "db_grades_karakter_v2",
      "KATEGORI_NILAI": "db_grade_categories_v2",
      "CATATAN_TAHFIDZ": "db_tahfidz_records_v2",
      "DAFTAR_MAJELIS": "db_majelis_tahfidz",
      "ARSIP_MUTASI_SISWA": "db_student_mutations",
      "ARSIP_ALUMNI_LULUS": "db_student_archives",
      "ARSIP_SPM_BULANAN": "db_spm_archives",
      "BERITA_SEKOLAH": "db_berita",
      "AKSES_PORTAL": "db_portal_access",
      "SANDI_PORTAL": "db_portal_access",
      "CONFIG_PORTAL": "db_portal_access",
      "PORTAL_ACCESS": "db_portal_access",
      "CONFIG_SISTEM": "db_config",
      "CONFIG_HAK_AKSES": "db_rbac_config",
      "PROFIL_SEKOLAH": "db_school_profile",
      "VISI_MISI": "db_visimisi",
      "STRUKTUR_ORGANISASI": "db_struktur",
      "CONFIG_BERANDA": "db_beranda_config",
      "PESAN_KONTAK_WEB": "pesan_masuk",
      "INFO_TAHUN_AJARAN": "cfg_tahun_ajaran_aktif",
      "INFO_SEMESTER": "cfg_semester_aktif",
      "CONFIG_DRIVE_MODE": "cfg_drive_mode",
      "CONFIG_DRIVE_ROOT_ID": "cfg_drive_root_id",
      "CONFIG_FOLDER_SISWA": "cfg_siswa_folder_id",
      "CONFIG_FOLDER_USTADZ": "cfg_ustadz_folder_id",
      "CONFIG_SPREADSHEET_ID": "cfg_cloud_spreadsheet_id",
      "KALENDER_AKADEMIK": "db_academic_calendar",
      "AGENDA_PONDOK": "db_pondok_agenda",
      "HALAQAH_TAHFIDZ": "db_students_tahfidz_panel",
      "CATATAN_TAHFIDZ_OLD": "db_tahfidz_records",
      "DONATUR_BEASISWA": "db_custom_donatur_list",
      "JADWAL_PIKET_GURU": "db_jadwal_piket_guru",
      "LABEL_KHUSUS_JADWAL": "db_jadwal_special_labels",
      "SLOT_WAKTU_JADWAL": "db_jadwal_time_slots",
      "DAFTAR_TAHUN_AJARAN": "cfg_available_years"
    };

    const singleKeys = [
      "db_config", "db_school_profile", "db_visimisi", "db_struktur", 
      "db_beranda_config", "cfg_tahun_ajaran_aktif", "cfg_semester_aktif",
      "cfg_drive_mode", "cfg_drive_root_id", "cfg_siswa_folder_id", 
      "cfg_ustadz_folder_id", "cfg_cloud_spreadsheet_id"
    ];

    let fetchedCount = 0;

    // Check if the spreadsheet is publicly readable via GViz before attempting all sheets
    let gvizAccessible = false;
    if (cleanId) {
      for (const probeTitle of ['CONFIG_SISTEM', 'MASTER_SISWA', 'AKSES_PORTAL']) {
        try {
          const probeUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(probeTitle)}`;
          const probeRes = await axios.get(probeUrl, {
            timeout: 3000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          if (probeRes.status === 200 && probeRes.data && typeof probeRes.data === 'string' && probeRes.data.length > 5 && !probeRes.data.includes('<!DOCTYPE html>')) {
            gvizAccessible = true;
            const records = parseCSVToObjects(probeRes.data);
            if (records && records.length > 0) {
              const key = reverseMapping[probeTitle] || probeTitle.toLowerCase();
              if (key === 'db_portal_access') {
                result[key] = parsePortalRecords(records);
              } else if (singleKeys.includes(key)) {
                result[key] = records[0];
              } else {
                result[key] = records;
              }
              fetchedCount++;
            }
            break;
          }
        } catch {
          // Continue to next probe
        }
      }
    }

    // If GViz is accessible, fetch remaining sheets
    if (gvizAccessible && cleanId) {
      for (const [sheetTitle, key] of Object.entries(reverseMapping)) {
        if (result[key]) continue; // Already fetched in probe
        try {
          const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTitle)}`;
          const res = await axios.get(url, { 
            timeout: 4000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          if (res.status === 200 && res.data && typeof res.data === 'string' && res.data.length > 5 && !res.data.includes('<!DOCTYPE html>')) {
            const records = parseCSVToObjects(res.data);
            if (records && records.length > 0) {
              if (key === 'db_portal_access') {
                result[key] = parsePortalRecords(records);
              } else if (singleKeys.includes(key)) {
                result[key] = records[0];
              } else {
                result[key] = records;
              }
              fetchedCount++;
            }
          }
        } catch {
          // Continue trying other sheets
        }
      }
    }

    if (result['db_portal_access'] && Array.isArray(result['db_portal_access'])) {
      if (result['db_config'] && typeof result['db_config'] === 'object') {
        result['db_config'].portalAccessConfigs = result['db_portal_access'];
      }
      try {
        const currentServerCfg = loadServerConfig() || {};
        saveServerConfig({ ...currentServerCfg, portalAccessConfigs: result['db_portal_access'] });
      } catch {}
    } else if (result['db_config'] && Array.isArray(result['db_config'].portalAccessConfigs)) {
      result['db_portal_access'] = parsePortalRecords(result['db_config'].portalAccessConfigs);
    }

    // If GViz fetched nothing, attempt fetching via Apps Script (with generous timeout for cold starts)
    if (fetchedCount === 0) {
      const candidates = [
        appsScriptUrl?.trim(),
        DEFAULT_APPS_SCRIPT_URL
      ].filter((u): u is string => !!u && typeof u === 'string' && u.startsWith('http'));

      const uniqueUrls = Array.from(new Set(candidates));

      for (const targetUrl of uniqueUrls) {
        try {
          const scriptRes = await axios.get(targetUrl, { 
            timeout: 35000,
            params: { action: 'fetch_all' },
            headers: { 'Accept': 'application/json' },
            maxRedirects: 5
          });
          if (scriptRes.data && typeof scriptRes.data === 'object') {
            const remoteData = scriptRes.data.data || scriptRes.data;
            if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
              Object.assign(result, remoteData);
              fetchedCount = Object.keys(result).length;
              break;
            }
          }
        } catch (err: any) {
          console.log("Apps script fetch fallback notice:", err.message);
        }
      }
    }

    // Automatically merge Master and Academic Student sheets if available
    if (result['db_students'] || result['db_students_academic']) {
      result['db_students'] = mergeStudentDatasets(
        result['db_students'] || [], 
        result['db_students_academic'] || [],
        result['cfg_tahun_ajaran_aktif'] || '2026/2027',
        result['cfg_semester_aktif'] || 'Ganjil'
      );
    }

    return { fetchedCount, result };
  }

  // Helper to merge Master Student Biodata (tanpa kelas dan TA) with Academic Records (dengan kelas dan TA)
  function mergeStudentDatasets(masterRecords: any[], academicRecords: any[], defaultTA = '2026/2027', defaultSemester = 'Ganjil') {
    const masterList = Array.isArray(masterRecords) ? masterRecords : [];
    const academicList = Array.isArray(academicRecords) ? academicRecords : [];

    if (masterList.length === 0 && academicList.length === 0) return [];
    if (academicList.length === 0) return masterList;

    const academicMap = new Map<string, any>();
    academicList.forEach(ak => {
      if (!ak || typeof ak !== 'object') return;
      const idKey = String(ak.id || '').trim().toLowerCase();
      const nisKey = String(ak.nis || '').trim().toLowerCase();
      const nisnKey = String(ak.nisn || '').trim().toLowerCase();
      const namaKey = String(ak.nama || ak.namaLengkap || '').trim().toLowerCase();

      if (idKey) academicMap.set(`id:${idKey}`, ak);
      if (nisKey) academicMap.set(`nis:${nisKey}`, ak);
      if (nisnKey) academicMap.set(`nisn:${nisnKey}`, ak);
      if (namaKey) academicMap.set(`nama:${namaKey}`, ak);
    });

    const matchedKeys = new Set<string>();
    const mergedList = masterList.map(m => {
      if (!m || typeof m !== 'object') return m;
      const idKey = String(m.id || '').trim().toLowerCase();
      const nisKey = String(m.nis || '').trim().toLowerCase();
      const nisnKey = String(m.nisn || '').trim().toLowerCase();
      const namaKey = String(m.nama || m.namaLengkap || '').trim().toLowerCase();

      const ak = (idKey ? academicMap.get(`id:${idKey}`) : null)
        || (nisKey ? academicMap.get(`nis:${nisKey}`) : null)
        || (nisnKey ? academicMap.get(`nisn:${nisnKey}`) : null)
        || (namaKey ? academicMap.get(`nama:${namaKey}`) : null)
        || {};

      if (ak.id) matchedKeys.add(String(ak.id).trim().toLowerCase());

      const activeTA = ak.tahunAjaran || ak.academicYear || m.academicYear || defaultTA;
      return {
        ...m,
        kelas: ak.kelas || m.kelas || 'Belum Diatur',
        academicYear: activeTA,
        tahunAjaran: activeTA,
        semester: ak.semester || m.semester || defaultSemester,
        status: ak.status || m.status || 'Aktif',
        jenjang: ak.jenjang || m.jenjang || 'SMP Terpadu',
        waliKelas: ak.waliKelas || m.waliKelas || '',
        halaqahTahfidz: ak.halaqahTahfidz || m.halaqahTahfidz || '',
        kelompokBelajar: ak.kelompokBelajar || m.kelompokBelajar || '',
        asrama: ak.asrama || m.asrama || '',
        kamar: ak.kamar || m.kamar || '',
        catatanAkademik: ak.catatanAkademik || m.catatanAkademik || ''
      };
    });

    // Also include any academic records that didn't have a matching master record
    academicList.forEach(ak => {
      const idKey = String(ak.id || '').trim().toLowerCase();
      if (idKey && !matchedKeys.has(idKey)) {
        const activeTA = ak.tahunAjaran || ak.academicYear || defaultTA;
        mergedList.push({
          ...ak,
          academicYear: activeTA,
          tahunAjaran: activeTA,
          semester: ak.semester || defaultSemester,
          status: ak.status || 'Aktif'
        });
      }
    });

    return mergedList;
  }

  // Google Sheets Helper with OAuth Token support
  const getSheetsService = (authHeader?: string) => {
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: token });
      return google.sheets({ version: "v4", auth: oauth2Client });
    }
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  };

  // Fetch from Google Sheets
  app.get("/api/sheets/fetch", async (req, res) => {
    const rawSpreadsheetId = (req.query.spreadsheetId as string || '').trim();
    const serverCfg = loadServerConfig() || {};
    let appsScriptUrl = normalizeAppsScriptUrl(req.query.appsScriptUrl as string) 
      || normalizeAppsScriptUrl(serverCfg.appsScriptUrl)
      || DEFAULT_APPS_SCRIPT_URL;

    const spreadsheetId = rawSpreadsheetId 
      ? extractSpreadsheetId(rawSpreadsheetId) 
      : (serverCfg.spreadsheetId ? extractSpreadsheetId(serverCfg.spreadsheetId) : "");

    if (!spreadsheetId && !appsScriptUrl) {
      return res.status(400).json({ error: "Spreadsheet ID atau URL Web App Apps Script diperlukan" });
    }

    // Direct Apps Script pull - ALWAYS prioritized for instant startup and full spreadsheet synchronization
    if (appsScriptUrl) {
      try {
        console.log(`Direct pull from Apps Script: ${appsScriptUrl.substring(0, 55)}...`);
        let scriptRes: any;
        try {
          scriptRes = await axios.get(appsScriptUrl, {
            params: { action: 'read_all' },
            timeout: 25000,
            headers: { 'Accept': 'application/json' },
            maxRedirects: 5
          });
        } catch (scriptErr: any) {
          const fallbackUrl = appsScriptUrl === DEFAULT_APPS_SCRIPT_URL ? FALLBACK_APPS_SCRIPT_URL : DEFAULT_APPS_SCRIPT_URL;
          console.log(`Switching to alternate Apps Script for data fetch: ${fallbackUrl.substring(0, 55)}...`);
          try {
            scriptRes = await axios.get(fallbackUrl, {
              params: { action: 'read_all' },
              timeout: 25000,
              headers: { 'Accept': 'application/json' },
              maxRedirects: 5
            });
            appsScriptUrl = fallbackUrl;
          } catch (fallbackErr: any) {
            throw scriptErr;
          }
        }
        let remoteData = scriptRes.data?.data || scriptRes.data;
        if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
          // Normalize db_config if returned as single-element array
          if (Array.isArray(remoteData['db_config']) && remoteData['db_config'].length > 0) {
            remoteData['db_config'] = remoteData['db_config'][0];
          }
          if (remoteData['db_students'] || remoteData['db_students_academic']) {
            remoteData['db_students'] = mergeStudentDatasets(
              remoteData['db_students'] || [],
              remoteData['db_students_academic'] || [],
              remoteData['cfg_tahun_ajaran_aktif'] || '2026/2027',
              remoteData['cfg_semester_aktif'] || 'Ganjil'
            );
          }
          if (remoteData['db_portal_access'] && Array.isArray(remoteData['db_portal_access'])) {
            try {
              const cur = loadServerConfig() || {};
              saveServerConfig({ ...cur, portalAccessConfigs: remoteData['db_portal_access'] });
            } catch {}
          }
          return res.json({ success: true, data: remoteData, source: 'apps_script' });
        }
      } catch (err: any) {
        console.log("Direct Apps Script fetch failed, falling back to Sheets API/GViz:", err.message);
        // If no spreadsheetId is available, return the error
        if (!spreadsheetId) {
          return res.status(500).json({ error: "Gagal mengambil data dari Google Apps Script: " + err.message });
        }
      }
    }

    try {
      const sheets = getSheetsService(req.headers.authorization);
      
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const result: Record<string, any> = {};
      const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

      // Reverse mapping from Sheet Name to LocalStorage Key
      const reverseMapping: Record<string, string> = {
        "MASTER_PPDB": "db_pendaftar",
        "MASTER_SISWA": "db_students",
        "DATA_SISWA_AKADEMIK": "db_students_academic",
        "SISWA_AKADEMIK": "db_students_academic",
        "MASTER_GURU_USTADZ": "db_ustadz_master",
        "MASTER_BEASISWA": "db_beasiswa",
        "MASTER_ROMBEL_KELAS": "db_kelas",
        "MASTER_MAPEL_KURIKULUM": "db_pelajaran",
        "MASTER_MAPEL_NILAI": "db_pelajaran_v2",
        "JADWAL_PELAJARAN": "db_jadwal",
        "ABSENSI_SISWA_HARIAN": "db_student_attendance_v2",
        "ABSENSI_GURU_LOG": "db_teachers_attendance",
        "ABSENSI_GURU_DETAIL": "db_teachers_attendance_history",
        "ABSENSI_EVENT_KEGIATAN": "db_event_attendance",
        "NILAI_AKADEMIK": "db_grades_v2",
        "NILAI_KARAKTER": "db_grades_karakter_v2",
        "KATEGORI_NILAI": "db_grade_categories_v2",
        "CATATAN_TAHFIDZ": "db_tahfidz_records_v2",
        "DAFTAR_MAJELIS": "db_majelis_tahfidz",
        "ARSIP_MUTASI_SISWA": "db_student_mutations",
        "ARSIP_ALUMNI_LULUS": "db_student_archives",
        "ARSIP_SPM_BULANAN": "db_spm_archives",
        "BERITA_SEKOLAH": "db_berita",
        "AKSES_PORTAL": "db_portal_access",
        "CONFIG_PORTAL": "db_portal_access",
        "SANDI_PORTAL": "db_portal_access",
        "PORTAL_ACCESS": "db_portal_access",
        "CONFIG_SISTEM": "db_config",
        "CONFIG_HAK_AKSES": "db_rbac_config",
        "PROFIL_SEKOLAH": "db_school_profile",
        "VISI_MISI": "db_visimisi",
        "STRUKTUR_ORGANISASI": "db_struktur",
        "CONFIG_BERANDA": "db_beranda_config",
        "PESAN_KONTAK_WEB": "pesan_masuk",
        "INFO_TAHUN_AJARAN": "cfg_tahun_ajaran_aktif",
        "INFO_SEMESTER": "cfg_semester_aktif",
        "CONFIG_DRIVE_MODE": "cfg_drive_mode",
        "CONFIG_DRIVE_ROOT_ID": "cfg_drive_root_id",
        "CONFIG_FOLDER_SISWA": "cfg_siswa_folder_id",
        "CONFIG_FOLDER_USTADZ": "cfg_ustadz_folder_id",
        "CONFIG_SPREADSHEET_ID": "cfg_cloud_spreadsheet_id",
        "KALENDER_AKADEMIK": "db_academic_calendar",
        "AGENDA_PONDOK": "db_pondok_agenda",
        "HALAQAH_TAHFIDZ": "db_students_tahfidz_panel",
        "CATATAN_TAHFIDZ_OLD": "db_tahfidz_records",
        "DONATUR_BEASISWA": "db_custom_donatur_list",
        "JADWAL_PIKET_GURU": "db_jadwal_piket_guru",
        "LABEL_KHUSUS_JADWAL": "db_jadwal_special_labels",
        "SLOT_WAKTU_JADWAL": "db_jadwal_time_slots",
        "DAFTAR_TAHUN_AJARAN": "cfg_available_years"
      };

      for (const title of sheetTitles) {
        if (!title) continue;
        const key = reverseMapping[title] || title.toLowerCase();
        
        try {
          const escapedTitle = `'${title.replace(/'/g, "''")}'`;
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${escapedTitle}!A1:AZ10000`,
            valueRenderOption: 'UNFORMATTED_VALUE',
          });

          const rows = response.data.values;
          if (!rows || rows.length === 0) continue;

          const headers = rows[0];
          const dataRows = rows.slice(1);

          const records = dataRows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              let val = row[index];
              if (val === undefined) val = "";
              
              if (typeof val === "string") {
                const lowerVal = val.trim().toLowerCase();
                if (lowerVal === "true") val = true;
                else if (lowerVal === "false") val = false;
              }

              if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
                try {
                  val = JSON.parse(val);
                } catch {
                }
              }
              
              const lowerHeader = header.toLowerCase();
              const isIdentifier = lowerHeader === 'id' || lowerHeader.includes('nis') || lowerHeader.includes('nik') ||
                                   lowerHeader.includes('kk') || lowerHeader.includes('nokk') || lowerHeader.includes('nip') ||
                                   lowerHeader.includes('hp') || lowerHeader.includes('telepon') || lowerHeader.includes('wa') ||
                                   lowerHeader.includes('nomor') || lowerHeader.includes('no') || lowerHeader.includes('rt') || lowerHeader.includes('rw') ||
                                   lowerHeader.includes('password') || lowerHeader.includes('sandi') ||
                                   lowerHeader.includes('tahun') || lowerHeader.includes('year') || lowerHeader.includes('code');
              
              if (isIdentifier) {
                if (typeof val === "number") {
                  val = Number.isFinite(val) ? BigInt(Math.round(val)).toString() : "";
                } else if (typeof val === "string") {
                  val = val.trim();
                  if (val.startsWith("'")) val = val.slice(1).trim();
                  const sciMatch = val.match(/^([0-9]+(?:[.,][0-9]+)?)[eE]([+-]?[0-9]+)$/);
                  if (sciMatch) {
                    try {
                      const base = Number(sciMatch[1].replace(',', '.'));
                      const exp = parseInt(sciMatch[2], 10);
                      if (!isNaN(base) && !isNaN(exp)) {
                        const factor = Math.min(exp, 14);
                        const rem = exp - factor;
                        val = (BigInt(Math.round(base * Math.pow(10, factor))) * (BigInt(10) ** BigInt(rem))).toString();
                      }
                    } catch {}
                  }
                }
              } else if (typeof val === "string" && val !== "" && !isIdentifier && !isNaN(Number(val)) && !val.includes("/")) {
                val = Number(val);
              }

              obj[header] = val;
            });
            return obj;
          });

          const singleKeys = [
            "db_config", "db_school_profile", "db_visimisi", "db_struktur", 
            "db_beranda_config", "cfg_tahun_ajaran_aktif", "cfg_semester_aktif",
            "cfg_drive_mode", "cfg_drive_root_id", "cfg_siswa_folder_id", 
            "cfg_ustadz_folder_id", "cfg_cloud_spreadsheet_id"
          ];

          if (key === 'db_portal_access') {
            result[key] = parsePortalRecords(records);
          } else if (singleKeys.includes(key)) {
            if (records && records.length > 0 && records[0] && typeof records[0] === 'object') {
              result[key] = records[0];
            }
          } else {
            result[key] = records;
          }
        } catch (sheetErr) {
          console.error(`Error fetching sheet ${title}:`, sheetErr);
        }
      }

      if (result['db_portal_access'] && Array.isArray(result['db_portal_access'])) {
        if (result['db_config'] && typeof result['db_config'] === 'object') {
          result['db_config'].portalAccessConfigs = result['db_portal_access'];
        }
        try {
          const currentServerCfg = loadServerConfig() || {};
          saveServerConfig({ ...currentServerCfg, portalAccessConfigs: result['db_portal_access'] });
        } catch {}
      } else if (result['db_config'] && Array.isArray(result['db_config'].portalAccessConfigs)) {
        result['db_portal_access'] = parsePortalRecords(result['db_config'].portalAccessConfigs);
      }

      // Automatically merge Master and Academic Student sheets if available
      if (result['db_students'] || result['db_students_academic']) {
        result['db_students'] = mergeStudentDatasets(
          result['db_students'] || [],
          result['db_students_academic'] || [],
          result['cfg_tahun_ajaran_aktif'] || '2026/2027',
          result['cfg_semester_aktif'] || 'Ganjil'
        );
      }

      return res.json({ success: true, data: result });
    } catch (apiErr: any) {
      // Gracefully attempt fallback via GViz or Apps Script
      try {
        const { fetchedCount, result } = await fetchSpreadsheetViaGViz(spreadsheetId, appsScriptUrl);
        if (fetchedCount > 0) {
          return res.json({ success: true, data: result, fallback: true });
        }
      } catch (gvizErr: any) {
        // Ignore fallback errors
      }

      let errorMsg = apiErr.message || "Gagal mengambil data dari Google Sheets.";
      if (errorMsg.includes("has not been used in project") || errorMsg.includes("disabled")) {
        errorMsg = "Google Sheets API belum diaktifkan di Google Cloud Console, atau Spreadsheet bersifat privat. Pastikan Spreadsheet diset 'Siapa saja yang memiliki link' atau gunakan Webhook Apps Script.";
      }
      return res.status(200).json({ 
        success: false, 
        data: {}, 
        error: errorMsg,
        fallbackNote: "Menggunakan data lokal dan Firestore yang tersimpan." 
      });
    }
  });

  // Sync to Google Sheets
  app.post("/api/sheets/sync", async (req, res) => {
    const { data, spreadsheetId: rawSpreadsheetId, appsScriptUrl: clientAppsScriptUrl } = req.body;
    const serverCfg = loadServerConfig() || {};
    let appsScriptUrl = normalizeAppsScriptUrl(clientAppsScriptUrl) 
      || normalizeAppsScriptUrl(serverCfg.appsScriptUrl)
      || DEFAULT_APPS_SCRIPT_URL;

    const spreadsheetId = rawSpreadsheetId 
      ? extractSpreadsheetId(rawSpreadsheetId) 
      : (serverCfg.spreadsheetId ? extractSpreadsheetId(serverCfg.spreadsheetId) : "");

    // Pre-process student data & apply safety guards
    if (data && typeof data === 'object') {
      if (Array.isArray(data.db_students) && data.db_students.length === 0) {
        console.warn("[SAFETY GUARD] Blocked empty db_students from sync.");
        delete data.db_students;
      }
      if (Array.isArray(data.db_students_academic) && data.db_students_academic.length === 0) {
        delete data.db_students_academic;
      }
      if (Array.isArray(data.db_ustadz_master) && data.db_ustadz_master.length === 0) {
        delete data.db_ustadz_master;
      }

      // Split into Master (tanpa kelas & TA) and Akademik (dengan kelas & TA)
      if (Array.isArray(data.db_students) && data.db_students.length > 0) {
        const fullStudents = data.db_students;
        const defaultTA = data.cfg_tahun_ajaran_aktif || '2026/2027';
        const defaultSemester = data.cfg_semester_aktif || 'Ganjil';

        data.db_students_academic = fullStudents.map((s: any) => ({
          id: String(s.id || '').trim(),
          nis: String(s.nis || '').trim(),
          nisn: String(s.nisn || '').trim(),
          nama: String(s.nama || s.namaLengkap || '').trim(),
          jenisKelamin: String(s.jenisKelamin || s.gender || 'LAKI-LAKI').trim(),
          kelas: String(s.kelas || 'Belum Diatur').trim(),
          tahunAjaran: String(s.academicYear || s.tahunAjaran || defaultTA).trim(),
          semester: String(s.semester || defaultSemester).trim(),
          status: String(s.status || 'Aktif').trim(),
          jenjang: String(s.jenjang || 'SMP Terpadu').trim(),
          waliKelas: String(s.waliKelas || '-').trim(),
          kelompokBelajar: String(s.kelompokBelajar || '-').trim(),
          halaqahTahfidz: String(s.halaqahTahfidz || '-').trim(),
          asrama: String(s.asrama || '-').trim(),
          kamar: String(s.kamar || '-').trim(),
          catatanAkademik: String(s.catatanAkademik || '').trim()
        }));

        data.db_students = fullStudents.map((s: any) => {
          const masterCopy = { ...s };
          delete masterCopy.kelas;
          delete masterCopy.academicYear;
          delete masterCopy.tahunAjaran;
          delete masterCopy.semester;
          delete masterCopy.rombel;
          delete masterCopy.academicHistory;
          return masterCopy;
        });
      }
    }

    // If no spreadsheetId provided but Apps Script URL is available, sync directly via Apps Script Webhook
    if (!spreadsheetId && appsScriptUrl) {
      console.log(`Syncing directly via Apps Script Webhook: ${appsScriptUrl.substring(0, 50)}...`);
      try {
        let webhookRes: any;
        try {
          webhookRes = await axios.post(appsScriptUrl, data, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 60000,
            maxRedirects: 5
          });
        } catch (postErr: any) {
          if (appsScriptUrl !== DEFAULT_APPS_SCRIPT_URL) {
            console.log("Switching to primary production Apps Script webhook for sync...");
            webhookRes = await axios.post(DEFAULT_APPS_SCRIPT_URL, data, {
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              timeout: 60000,
              maxRedirects: 5
            });
            appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
          } else {
            throw postErr;
          }
        }
        return res.json({ success: true, spreadsheetId: '', viaWebhook: true, data: webhookRes.data });
      } catch (webhookErr: any) {
        console.log("Apps Script direct sync notice:", webhookErr.message);
        return res.status(500).json({ error: "Gagal sinkronisasi ke Apps Script: " + webhookErr.message });
      }
    }

    try {
      const sheets = getSheetsService(req.headers.authorization);
      
      let targetSpreadsheetId = spreadsheetId;

      // If no spreadsheetId provided, create a new one
      if (!targetSpreadsheetId) {
        const newSpreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: `Pondok Tahfidz Al-Ihsan - Database Sinkronisasi - ${new Date().toLocaleDateString("id-ID")}`,
            },
          },
        });
        targetSpreadsheetId = newSpreadsheet.data.spreadsheetId || "";
      }

      // Fetch spreadsheet metadata ONCE before the loop to avoid hitting rate limits!
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: targetSpreadsheetId,
      });

      const existingSheets = new Map<string, number>();
      (spreadsheet.data.sheets || []).forEach(s => {
        if (s.properties?.title && s.properties?.sheetId !== undefined) {
          existingSheets.set(s.properties.title, s.properties.sheetId);
        }
      });

      // Process each table in the data payload
      // Sort keys to ensure consistent sheet order
      const keys = Object.keys(data).sort((a, b) => {
        const priority = ["db_students", "db_ustadz_master", "db_kelas", "db_pelajaran"];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      for (const key of keys) {
        const records = data[key];
        if (!records) continue;
        
        // Handle both arrays and single objects (config)
        const recordArray = Array.isArray(records) ? records : [records];
        if (recordArray.length === 0) continue;

        const sheetName = getFriendlySheetName(key);
        
        // Check if sheet exists, if not create it and cache sheetId
        let currentSheetId = existingSheets.get(sheetName);
        if (currentSheetId === undefined) {
          const addRes = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: targetSpreadsheetId,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: { title: sheetName }
                }
              }]
            }
          });
          currentSheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId || 0;
          existingSheets.set(sheetName, currentSheetId);
        }

        // Prepare data for the sheet
        // Special formatting for portal access to make it user-friendly in Google Sheets
        let headers: string[] = [];
        let rowValues: any[][] = [];

        if (key === 'db_portal_access' || sheetName === 'AKSES_PORTAL') {
          // Standard page IDs for clean columns
          const standardPageIds = [
            "dashboard_utama", "master_siswa", "master_kelas", "master_pelajaran", 
            "master_ustadz", "master_beasiswa", "akademik_jadwal", "akademik_kehadiran_siswa", 
            "akademik_barcode", "akademik_kehadiran_guru", "akademik_nilai", "akademik_tahfidz", 
            "akademik_card_generator", "laporan_akademik", "_ppdb_eval", "berkas_pendaftaran", 
            "_ppdb_berita", "sistem_mutasi_alokasi", "_ekspor_backup_sheets", "sistem_pengaturan"
          ];
          
          headers = ["id", "label", "password", ...standardPageIds, "menuPermissions"];
          rowValues = recordArray.map((rec: any) => {
            const menuPerms = rec.menuPermissions || {};
            const pageCols = standardPageIds.map(pid => menuPerms[pid] || 'none');
            return [
              String(rec.id || ''),
              String(rec.label || ''),
              String(rec.password || ''),
              ...pageCols,
              JSON.stringify(menuPerms)
            ];
          });
        } else {
          // Use the most complete record to determine headers if it's an array
          if (Array.isArray(records)) {
            // Find record with most keys to ensure we don't miss columns
            headers = Array.from(new Set(records.flatMap(r => Object.keys(r || {}))));
          } else {
            headers = Object.keys(records);
          }

          // Strict separation: Ensure Master Siswa does NOT have kelas & TA headers
          if (key === 'db_students' || sheetName === 'MASTER_SISWA') {
            headers = headers.filter(h => !['kelas', 'academicyear', 'tahunajaran', 'semester', 'rombel', 'academichistory'].includes(h.toLowerCase()));
          }

          if (headers.length === 0) continue;

          rowValues = recordArray.map((rec: any) => headers.map(h => {
            const val = rec[h];
            if (val === undefined || val === null) return "";
            if (typeof val === "object") {
              try {
                return JSON.stringify(val);
              } catch {
                return String(val);
              }
            }
            const lowerH = h.toLowerCase();
            const isTextIdentifier = lowerH.includes('nik') || lowerH.includes('kk') || lowerH.includes('nokk') ||
                                     lowerH.includes('nis') || lowerH.includes('nip') || lowerH.includes('hp') ||
                                     lowerH.includes('telepon') || lowerH.includes('wa') || lowerH === 'id' ||
                                     lowerH.includes('rt') || lowerH.includes('rw') || lowerH.includes('nomor');

            let strVal = typeof val === 'number' && Number.isFinite(val) ? BigInt(Math.round(val)).toString() : String(val).trim();
            if (isTextIdentifier && strVal && !strVal.startsWith("'") && /^[0-9]+$/.test(strVal)) {
              // Prepend single quote for Google Sheets so it is permanently treated as plain text
              return `'${strVal}`;
            }
            return strVal;
          }));
        }

        // Safety Guard: Never clear sheet if rowValues is empty
        if (rowValues.length === 0) {
          console.warn(`[SAFETY GUARD] Prevented wiping ${sheetName} because rowValues is empty.`);
          continue;
        }

        const values = [
          headers,
          ...rowValues
        ];

        // Clear and update the sheet safely with escaped name
        const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
        await sheets.spreadsheets.values.clear({
          spreadsheetId: targetSpreadsheetId,
          range: `${escapedSheetName}!A1:AZ10000`,
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: targetSpreadsheetId,
          range: `${escapedSheetName}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });

        // Format header styling directly with cached currentSheetId
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: targetSpreadsheetId,
            requestBody: {
              requests: [
                {
                  repeatCell: {
                    range: {
                      sheetId: currentSheetId,
                      startRowIndex: 0,
                      endRowIndex: 1
                    },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: { red: 0.1, green: 0.3, blue: 0.2 }, // Dark green for Al-Ihsan theme
                        textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: "CENTER"
                      }
                    },
                    fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                  }
                },
                {
                  updateSheetProperties: {
                    properties: {
                      sheetId: currentSheetId,
                      gridProperties: { frozenRowCount: 1 }
                    },
                    fields: "gridProperties.frozenRowCount"
                  }
                },
                {
                  autoResizeDimensions: {
                    dimensions: {
                      sheetId: currentSheetId,
                      dimension: "COLUMNS",
                      startIndex: 0,
                      endIndex: headers.length
                    }
                  }
                }
              ]
            }
          });
        } catch {
          // Styling is non-critical, continue
        }
      }

      return res.json({ success: true, spreadsheetId: targetSpreadsheetId });
    } catch (err: any) {
      console.error("Sheets sync error:", err);
      
      // If Apps Script Webhook URL was provided or saved, try fallback sync via Apps Script
      if (appsScriptUrl && typeof appsScriptUrl === 'string' && appsScriptUrl.trim().startsWith('http')) {
        console.log("Attempting fallback sync to Apps Script URL:", appsScriptUrl);
        try {
          const webhookRes = await axios.post(appsScriptUrl.trim(), data, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 60000,
            maxRedirects: 5
          });
          return res.json({ success: true, spreadsheetId, fallbackWebhook: true, data: webhookRes.data });
        } catch (webhookErr: any) {
          console.error("Apps Script fallback error:", webhookErr.message);
        }
      }

      let message = err.message || "Gagal menyinkronkan data ke Google Sheets.";
      if (message.includes("has not been used in project") || message.includes("disabled")) {
        message = "Google Sheets API belum diaktifkan di Google Cloud Console. Silakan masukkan Web Deployment URL pada form 'Sinkronisasi Webhook Apps Script' di bawah untuk menyinkronkan data tanpa API key Google Sheets.";
      }
      return res.status(400).json({ error: message });
    }
  });

  // Dedicated endpoint to save portal access configuration directly to Google Spreadsheet & Server Cache
  app.post("/api/sheets/save-portal", async (req, res) => {
    const { configs, spreadsheetId: rawSpreadsheetId, appsScriptUrl } = req.body;
    if (!Array.isArray(configs)) {
      return res.status(400).json({ error: "configs must be an array" });
    }

    // 1. Update in-memory & file server config
    const currentCfg = loadServerConfig() || {};
    const updatedCfg = { ...currentCfg, portalAccessConfigs: configs };
    saveServerConfig(updatedCfg);

    const spreadsheetId = rawSpreadsheetId ? extractSpreadsheetId(rawSpreadsheetId) : (currentCfg.spreadsheetId ? extractSpreadsheetId(currentCfg.spreadsheetId) : "");

    // 2. If spreadsheetId is available, sync to AKSES_PORTAL sheet
    let sheetsUpdated = false;
    if (spreadsheetId) {
      try {
        const sheets = getSheetsService(req.headers.authorization);
        const sheetName = "AKSES_PORTAL";

        // Check if sheet exists, if not create it
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId,
        });

        const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);
        if (!sheetExists) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: { title: sheetName }
                }
              }]
            }
          });
        }

        const standardPageIds = [
          "dashboard_utama", "master_siswa", "master_kelas", "master_pelajaran", 
          "master_ustadz", "master_beasiswa", "akademik_jadwal", "akademik_kehadiran_siswa", 
          "akademik_barcode", "akademik_kehadiran_guru", "akademik_nilai", "akademik_tahfidz", 
          "akademik_card_generator", "laporan_akademik", "_ppdb_eval", "berkas_pendaftaran", 
          "_ppdb_berita", "sistem_mutasi_alokasi", "_ekspor_backup_sheets", "sistem_pengaturan"
        ];
        
        const headers = ["id", "label", "password", ...standardPageIds, "menuPermissions"];
        const rowValues = configs.map((rec: any) => {
          const menuPerms = rec.menuPermissions || {};
          const pageCols = standardPageIds.map(pid => menuPerms[pid] || 'none');
          return [
            String(rec.id || ''),
            String(rec.label || ''),
            String(rec.password || ''),
            ...pageCols,
            JSON.stringify(menuPerms)
          ];
        });

        const values = [headers, ...rowValues];

        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A1:AZ1000`,
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values },
        });

        sheetsUpdated = true;
      } catch (sheetsErr: any) {
        console.log("Direct Google Sheets save-portal notice (will try webhook fallback if available):", sheetsErr.message);
      }
    }

    // 3. Fallback to Apps Script webhook if available
    const webhookUrl = appsScriptUrl || currentCfg.appsScriptUrl;
    if (!sheetsUpdated && webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim().startsWith('http')) {
      try {
        await axios.post(webhookUrl.trim(), { db_portal_access: configs }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        sheetsUpdated = true;
      } catch (webhookErr: any) {
        console.log("Apps Script save-portal fallback notice:", webhookErr.message);
      }
    }

    return res.json({
      success: true,
      sheetsUpdated,
      message: sheetsUpdated 
        ? "Konfigurasi Sandi Portal & Hak Akses Berhasil Disimpan ke Google Spreadsheet (AKSES_PORTAL) dan Server!" 
        : "Konfigurasi Sandi Portal Berhasil Disimpan di Server & Siap Disinkronkan!"
    });
  });

  function getFriendlySheetName(key: string) {
    const mapping: Record<string, string> = {
      "db_pendaftar": "MASTER_PPDB",
      "db_students": "MASTER_SISWA",
      "db_students_academic": "DATA_SISWA_AKADEMIK",
      "db_ustadz_master": "MASTER_GURU_USTADZ",
      "db_beasiswa": "MASTER_BEASISWA",
      "db_kelas": "MASTER_ROMBEL_KELAS",
      "db_pelajaran": "MASTER_MAPEL_KURIKULUM",
      "db_pelajaran_v2": "MASTER_MAPEL_NILAI",
      "db_jadwal": "JADWAL_PELAJARAN",
      "db_student_attendance_v2": "ABSENSI_SISWA_HARIAN",
      "db_teachers_attendance": "ABSENSI_GURU_LOG",
      "db_teachers_attendance_history": "ABSENSI_GURU_DETAIL",
      "db_event_attendance": "ABSENSI_EVENT_KEGIATAN",
      "db_grades_v2": "NILAI_AKADEMIK",
      "db_grades_karakter_v2": "NILAI_KARAKTER",
      "db_grade_categories_v2": "KATEGORI_NILAI",
      "db_tahfidz_records_v2": "CATATAN_TAHFIDZ",
      "db_majelis_tahfidz": "DAFTAR_MAJELIS",
      "db_student_mutations": "ARSIP_MUTASI_SISWA",
      "db_student_archives": "ARSIP_ALUMNI_LULUS",
      "db_spm_archives": "ARSIP_SPM_BULANAN",
      "db_berita": "BERITA_SEKOLAH",
      "db_portal_access": "AKSES_PORTAL",
      "db_portal_config": "AKSES_PORTAL",
      "portalAccessConfigs": "AKSES_PORTAL",
      "db_config": "CONFIG_SISTEM",
      "db_rbac_config": "CONFIG_HAK_AKSES",
      "db_school_profile": "PROFIL_SEKOLAH",
      "db_visimisi": "VISI_MISI",
      "db_struktur": "STRUKTUR_ORGANISASI",
      "db_beranda_config": "CONFIG_BERANDA",
      "pesan_masuk": "PESAN_KONTAK_WEB",
      "cfg_tahun_ajaran_aktif": "INFO_TAHUN_AJARAN",
      "cfg_semester_aktif": "INFO_SEMESTER",
      "cfg_drive_mode": "CONFIG_DRIVE_MODE",
      "cfg_drive_root_id": "CONFIG_DRIVE_ROOT_ID",
      "cfg_siswa_folder_id": "CONFIG_FOLDER_SISWA",
      "cfg_ustadz_folder_id": "CONFIG_FOLDER_USTADZ",
      "cfg_cloud_spreadsheet_id": "CONFIG_SPREADSHEET_ID",
      "db_academic_calendar": "KALENDER_AKADEMIK",
      "db_pondok_agenda": "AGENDA_PONDOK",
      "db_students_tahfidz_panel": "HALAQAH_TAHFIDZ",
      "db_tahfidz_records": "CATATAN_TAHFIDZ_OLD",
      "db_custom_donatur_list": "DONATUR_BEASISWA",
      "db_jadwal_piket_guru": "JADWAL_PIKET_GURU",
      "db_jadwal_special_labels": "LABEL_KHUSUS_JADWAL",
      "db_jadwal_time_slots": "SLOT_WAKTU_JADWAL",
      "cfg_available_years": "DAFTAR_TAHUN_AJARAN"
    };
    return mapping[key] || key.toUpperCase();
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send(`
            <h1>Aplikasi Sedang Memuat / Terjadi Kesalahan</h1>
            <p>Silakan segarkan halaman (refresh) atau tunggu beberapa saat.</p>
            <p><small>Error: index.html not found in dist folder. Please ensure build is complete.</small></p>
          `);
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
