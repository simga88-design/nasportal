const origin = (typeof window !== 'undefined' && window.location.protocol !== 'file:') ? window.location.origin : 'http://localhost';
const BASE_URL = origin + "/api/auth";

// Google Apps Script URL (Legacy/Backups - currently ignored if using SQLite)
// Removed legacy GAS variables: BASE_URL, BASE_URL, BASE_URL, BASE_URL

// Deployment Configuration
const APP_VERSION = "1.0.1";
const NAS_CIRCULATION_PATH = "z:\\public\\공람파일저장함\\";
