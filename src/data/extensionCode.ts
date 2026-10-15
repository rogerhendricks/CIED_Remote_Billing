export interface ExtensionFile {
  filename: string;
  description: string;
  language: string;
  content: string;
}

export const EXTENSION_MANIFEST = `{
  "manifest_version": 3,
  "name": "Cardiac Remote Monitoring Log & Billing Assistant",
  "version": "1.3.0",
  "description": "Dockable assistant auto-capturing patient & device telemetry with auto-navigation detection across Biotronik, Latitude, CareLink, and Merlin.",
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "clipboardWrite",
    "sidePanel",
    "contextMenus"
  ],
  "host_permissions": [
    "*://*.biotronik-homemonitoring.com/*",
    "*://*.latitudenxt.bostonscientific-international.com.au/*",
    "*://*.latitudenxt.com/*",
    "*://*.medtroniccarelink.net/*",
    "*://*.merlin.net/*",
    "http://*/*",
    "https://*/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Open Cardiac Hub (Dockable Side Panel Available)"
  },
  "side_panel": {
    "default_path": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+Shift+C",
        "mac": "Alt+Shift+C"
      },
      "description": "Open Cardiac Billing Hub"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.biotronik-homemonitoring.com/*",
        "*://*.latitudenxt.bostonscientific-international.com.au/*",
        "*://*.latitudenxt.com/*",
        "*://*.medtroniccarelink.net/*",
        "*://*.merlin.net/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}`;

export const EXTENSION_CONTENT_SCRIPT = `// content.js - Cardiac Device Scraper for 4 Remote Monitoring Portals

function detectPortal() {
  const host = window.location.hostname.toLowerCase();
  if (host.includes('biotronik-homemonitoring.com')) return 'biotronik';
  if (host.includes('latitudenxt.bostonscientific') || host.includes('latitudenxt.com')) return 'boston_latitude';
  if (host.includes('medtroniccarelink.net')) return 'medtronic_carelink';
  if (host.includes('merlin.net')) return 'abbott_merlin';
  return 'unknown';
}

function extractPortalData() {
  const portal = detectPortal();
  const result = {
    portal: portal,
    patientName: '',
    patientId: '',
    patientDob: '',
    deviceModel: '',
    deviceSerial: '',
    transmissionDate: '',
    visitDate: new Date().toLocaleDateString('en-AU'),
    recommendedBillingCode: '11725',
    clinicalIndication: '',
    notes: '',
    url: window.location.href
  };

  try {
    if (portal === 'biotronik') {
      // 1. Biotronik Home Monitoring
      const nameElem = document.querySelector('[id*="headerPatientName"]') || document.querySelector('[id*="headerPatientId"]');
      if (nameElem) result.patientName = nameElem.textContent.trim().replace(/^Mr\\s+|^Mrs\\s+|^Ms\\s+/i, '');

      const dobElem = document.querySelector('[id*="headerPatientDateOfBirth"]');
      if (dobElem) result.patientDob = dobElem.textContent.trim();

      const deviceElem = document.querySelector('[id*="headerImplantName"]');
      if (deviceElem) result.deviceModel = deviceElem.textContent.trim();

      const snElem = document.querySelector('[id*="headerImplantSN"]');
      if (snElem) result.deviceSerial = snElem.textContent.trim();

      const dateElem = document.querySelector('[id*="headerStatusCalculationTimeStamp"]') || document.querySelector('.SummaryStatus td.PartitionInfo');
      if (dateElem) {
        result.transmissionDate = dateElem.textContent.trim().replace(/^Status on\\s*/i, '');
      }

      const pIdElem = document.querySelector('[id*="headerPatientId"]');
      if (pIdElem) result.patientId = pIdElem.textContent.trim();

    } else if (portal === 'boston_latitude') {
      // 2. Boston Scientific LATITUDE NXT
      const nameElem = document.querySelector('#postage_name');
      if (nameElem) result.patientName = nameElem.textContent.trim();

      const idElem = document.querySelector('#postage_patientId');
      if (idElem) result.patientId = idElem.textContent.trim();

      const dobElem = document.querySelector('#postage_dob');
      if (dobElem) result.patientDob = dobElem.textContent.trim();

      const deviceElem = document.querySelector('#postage_device');
      if (deviceElem) {
        const fullDev = deviceElem.textContent.trim();
        // format usually "G447 RESONATE X4 CRT-D/329199"
        if (fullDev.includes('/')) {
          const parts = fullDev.split('/');
          result.deviceModel = parts[0].trim();
          result.deviceSerial = parts[1].trim();
        } else {
          result.deviceModel = fullDev;
        }
      }

      const dateElem = document.querySelector('#postage_latestSendDate');
      if (dateElem) result.transmissionDate = dateElem.textContent.trim();

    } else if (portal === 'medtronic_carelink') {
      // 3. Medtronic CareLink Network
      const nameElem = document.querySelector('.patient-card__patient-name strong') || document.querySelector('.vt-patient-full-name-link');
      if (nameElem) result.patientName = nameElem.textContent.trim();

      const idElem = document.querySelector('.vt-patient-id-in-clinic');
      if (idElem) result.patientId = idElem.textContent.trim().replace(/^ID:\\s*/i, '');

      const dobElem = document.querySelector('.vt-patient-date-of-birth');
      if (dobElem) result.patientDob = dobElem.textContent.trim();

      const deviceElem = document.querySelector('.vt-patient-card-device-brand-name') || document.querySelector('#WebHeaderTable_bRow_0_cell_0');
      if (deviceElem) result.deviceModel = deviceElem.textContent.trim().replace(/^Device:\\s*/i, '');

      const snElem = document.querySelector('#WebHeaderTable_bRow_0_cell_1');
      if (snElem) result.deviceSerial = snElem.textContent.trim().replace(/^Serial Number:\\s*/i, '');

      const dateElem = document.querySelector('#WebHeaderTable_bRow_0_cell_2');
      if (dateElem) result.transmissionDate = dateElem.textContent.trim().replace(/^Date of Interrogation:\\s*/i, '');

    } else if (portal === 'abbott_merlin') {
      // 4. Abbott Merlin.net PCN
      const nameElem = document.querySelector('#pb-PatientName span');
      if (nameElem) result.patientName = nameElem.textContent.trim();

      const pIdElem = document.querySelector('#pb-PatientId');
      if (pIdElem) {
        const lines = pIdElem.innerText.split('\\n').map(s => s.trim()).filter(Boolean);
        lines.forEach(l => {
          if (l.toLowerCase().startsWith('patient id:')) {
            result.patientId = l.replace(/patient id:/i, '').trim();
          } else if (l.includes('Assura') || l.includes('Quadra') || l.includes('Endurity') || l.includes('Ellipse') || l.includes('Fortify')|| l.includes('Assurity')|| l.includes('Gallant')|| l.includes('Assert') || l.includes('Jot') || l.includes('Unify')|| l.includes('Neutrino') || l.includes('Confirm')) {
            result.deviceModel = l;
          }
        });
      }

      const dateElem = document.querySelector('#pb-PatientName');
      if (dateElem && dateElem.parentElement) {
        const fullText = dateElem.parentElement.innerText;
        const match = fullText.match(/\\d{2}[-/.]\\d{2}[-/.]\\d{4}\\s+\\d{2}:\\d{2}/);
        if (match) result.transmissionDate = match[0];
      }
    }

    // Auto-predict Billing Code based on Australian MBS Rules:
    // - 11736: ILR/ICM for investigation of Atrial Fibrillation (max 4 per 12 months)
    // - 11737: ILR/ICM for Cryptogenic Stroke or Recurrent Syncope (once per 4 weeks)
    // - 11719: Defibrillator (ICD / CRT-D)
    // - 11725: Pacemaker (PPM)
    const dev = (result.deviceModel || '').toLowerCase();
    const isLoop = dev.includes('biomonitor') || dev.includes('linq') || dev.includes('reveal') || dev.includes('confirm') || dev.includes('icm') || dev.includes('jot') || dev.includes('lux') || dev.includes('loop');

    if (isLoop) {
      // Default loop recorder to 11736 (AF) with option to switch to 11737 (Syncope/Stroke)
      result.recommendedBillingCode = '11736';
      result.clinicalIndication = 'Investigation of Atrial Fibrillation (AF)';
    } else if (dev.includes('icd') || dev.includes('defibrillator') || dev.includes('crt-d') || dev.includes('vr') || dev.includes('resonate') || dev.includes('assura')) {
      result.recommendedBillingCode = '11719';
      result.clinicalIndication = 'Implantable Defibrillator (ICD/CRT-D) Surveillance';
    } else {
      result.recommendedBillingCode = '11725';
      result.clinicalIndication = 'Permanent Pacemaker (PPM) Surveillance';
    }

  } catch (err) {
    console.error('Error scraping cardiac portal data:', err);
  }

  return result;
}

// Keep track of the last extracted patient ID and name to detect transitions
let lastScrapedKey = '';

function checkForPatientChange() {
  const current = extractPortalData();
  const currentKey = current.portal + ':' + (current.patientId || '') + ':' + (current.patientName || '') + ':' + (current.deviceSerial || '');
  
  if (currentKey !== lastScrapedKey && (current.patientName || current.patientId)) {
    lastScrapedKey = currentKey;
    // Broadcast to docked sidepanel and background script
    try {
      chrome.runtime.sendMessage({
        action: 'PATIENT_DOM_CHANGED',
        data: current
      });
    } catch (e) {
      // Receiver may not be open yet
    }
  }
}

// 1. Listen for requests from popup / sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PATIENT_DATA') {
    const data = extractPortalData();
    lastScrapedKey = data.portal + ':' + (data.patientId || '') + ':' + (data.patientName || '') + ':' + (data.deviceSerial || '');
    sendResponse(data);
  }
  return true;
});

// 2. Continuous observer for Single Page Application (SPA) patient switching
// When clinicians click another patient row in Biotronik, LATITUDE, CareLink, or Merlin,
// the DOM updates dynamically without a full browser reload.
const observer = new MutationObserver(() => {
  checkForPatientChange();
});

// Observe common header and content regions
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// 3. Listen for SPA URL history changes
window.addEventListener('popstate', () => setTimeout(checkForPatientChange, 400));
window.addEventListener('hashchange', () => setTimeout(checkForPatientChange, 400));

// Initial check on load
setTimeout(checkForPatientChange, 800);
`;

export const EXTENSION_POPUP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cardiac Device Billing Logger</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 100%;
      min-width: 360px;
      max-width: 480px;
      margin: 0 auto;
      padding: 12px 14px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 13px;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #1e3a8a;
    }
    .dock-banner {
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      color: #0369a1;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .dock-btn {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 9999px;
      background: #e0e7ff;
      color: #3730a3;
    }
    .hub-status {
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      color: #059669;
      font-weight: 600;
    }

    /* Tab Navigation */
    .tab-bar {
      display: flex;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 12px;
      gap: 4px;
    }
    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      padding: 8px 6px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .tab-btn.active {
      color: #1d4ed8;
      border-bottom-color: #1d4ed8;
      font-weight: 700;
    }
    .tab-badge {
      background: #dbeafe;
      color: #1e40af;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
    }
    .tab-btn.active .tab-badge {
      background: #2563eb;
      color: #fff;
    }

    /* Form and Fields */
    .field {
      margin-bottom: 8px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    input, select, textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      background: #fff;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .billing-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .billing-select {
      font-weight: 700;
      color: #1e40af;
      background: #fff;
      border-color: #3b82f6;
    }
    .rule-hint {
      font-size: 11px;
      color: #1d4ed8;
      margin-top: 4px;
      line-height: 1.3;
    }
    .warning-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 8px;
      display: none;
    }
    /* Real-time Medicare Collision & Billing Eligibility Banner */
    .eligibility-box {
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      font-size: 11px;
      line-height: 1.4;
      animation: fadeIn 0.15s ease-in;
    }
    .eligibility-box.cannot-bill {
      background: #fef2f2;
      border: 2px solid #ef4444;
      color: #991b1b;
    }
    .eligibility-box.can-bill {
      background: #ecfdf5;
      border: 1px solid #10b981;
      color: #065f46;
    }
    .eligibility-badge {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .status-select {
      font-weight: 700;
      font-size: 12px;
      background: #fff;
    }
    .session-status-dropdown {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      background: #fff;
      cursor: pointer;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
    }
    .btn {
      padding: 8px 12px;
      border-radius: 6px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-sm { padding: 4px 8px; font-size: 11px; }
    .status-msg {
      margin-top: 8px;
      padding: 8px;
      border-radius: 6px;
      font-size: 12px;
      display: none;
    }
    .status-success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .settings-toggle {
      font-size: 10px;
      color: #64748b;
      text-decoration: underline;
      cursor: pointer;
      text-align: right;
      margin-top: 6px;
    }
    .settings-panel {
      display: none;
      background: #f1f5f9;
      padding: 8px;
      border-radius: 6px;
      margin-top: 6px;
      border: 1px solid #cbd5e1;
    }

    /* Session Log View Styles */
    .session-stats {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .stat-box {
      font-size: 11px;
      color: #64748b;
    }
    .stat-val {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      display: block;
      margin-top: 2px;
    }
    .session-search {
      margin-bottom: 10px;
    }
    .session-list {
      max-height: 380px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 10px;
    }
    .session-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      transition: border-color 0.15s ease;
    }
    .session-card:hover {
      border-color: #93c5fd;
    }
    .session-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .patient-title {
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
    }
    .portal-pill {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .portal-biotronik { background: #e0f2fe; color: #0369a1; }
    .portal-boston_latitude { background: #fee2e2; color: #991b1b; }
    .portal-medtronic_carelink { background: #f3e8ff; color: #6b21a8; }
    .portal-abbott_merlin { background: #fef3c7; color: #92400e; }
    .session-card-details {
      font-size: 11px;
      color: #475569;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .session-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
      font-size: 10px;
      color: #64748b;
    }
    .mbs-tag {
      font-weight: 700;
      color: #1d4ed8;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
    }
    .empty-session {
      text-align: center;
      padding: 30px 15px;
      color: #64748b;
      background: #fff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
    }

    /* Live Navigation Auto-Sync Bar */
    .nav-sync-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .sync-switch {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-weight: 600;
      color: #334155;
      text-transform: none;
      margin-bottom: 0;
      user-select: none;
    }
    .sync-switch input {
      width: auto;
      margin: 0;
      cursor: pointer;
    }
    .rescan-btn {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      color: #1e40af;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .rescan-btn:hover {
      background: #eff6ff;
      border-color: #3b82f6;
    }
    .new-patient-alert {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      animation: fadeIn 0.15s ease-in;
    }
    .auto-sync-toast {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 11px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      animation: fadeIn 0.15s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="header-row">
    <h2>🩺 Cardiac Billing Hub</h2>
    <div id="hubStatus" class="hub-status">● Hub Connected</div>
  </div>

  <div class="dock-banner">
    <span>📌 <strong>Docked Side Panel Active</strong></span>
    <button id="btnOpenSidepanel" class="dock-btn">Dock to Right ❯</button>
  </div>

  <!-- Live Navigation Auto-Detection Bar -->
  <div class="nav-sync-bar">
    <label class="sync-switch" title="Automatically load new patient telemetry when you navigate between patients in your browser">
      <input type="checkbox" id="autoSyncCheck" checked>
      <span>⚡ Auto-sync on page change</span>
    </label>
    <button id="btnRescanTab" class="rescan-btn" title="Force scan active browser tab for patient telemetry">
      🔄 Re-scan Page
    </button>
  </div>

  <!-- Detected Patient Transition Alert (Shown when auto-sync is off or new telemetry ready) -->
  <div id="newPatientAlert" class="new-patient-alert" style="display:none;">
    <div style="flex:1;">
      <div style="font-weight:700;font-size:11px;color:#0369a1;">🔔 New Patient Page Detected</div>
      <div id="newPatientName" style="font-size:12px;font-weight:700;color:#0c4a6e;"></div>
      <div id="newPatientDetails" style="font-size:10px;color:#0284c7;"></div>
    </div>
    <button id="btnLoadDetectedPatient" class="btn btn-primary btn-sm" style="padding:4px 8px;font-size:11px;white-space:nowrap;">
      ⚡ Load Telemetry
    </button>
  </div>

  <!-- Auto-Sync Feedback Toast -->
  <div id="autoSyncNotice" class="auto-sync-toast" style="display:none;">
    <span>⚡ <strong>Auto-synced:</strong> <span id="autoSyncPatientName"></span></span>
    <span style="font-size:10px;opacity:0.8;">Active Tab Loaded</span>
  </div>

  <!-- Top Tab Navigation -->
  <div class="tab-bar">
    <button id="tabCaptureBtn" class="tab-btn active">
      🩺 Capture & Bill
    </button>
    <button id="tabSessionBtn" class="tab-btn">
      📋 Sent This Session <span id="sessionBadge" class="tab-badge">0</span>
    </button>
  </div>

  <!-- TAB 1: CAPTURE & BILL VIEW -->
  <div id="viewCapture">
    <div class="header-row">
      <div id="portalBadge" class="badge">Scanning portal...</div>
      <div style="font-size:11px;color:#64748b;">MBS Multi-Year Engine</div>
    </div>

    <!-- Real-time Medicare Collision & Billing Eligibility Status Card -->
    <div id="eligibilityBox" class="eligibility-box" style="display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div id="eligibilityHeader" style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:4px;">
          <span id="eligibilityIcon">🛡️</span>
          <span id="eligibilityTitle">Checking Medicare Rules...</span>
        </div>
        <span id="eligibilityTag" class="eligibility-badge">Evaluating</span>
      </div>
      <div id="eligibilityReason" style="font-size:11px;line-height:1.4;margin-bottom:6px;"></div>
      <div id="eligibilityDates" class="grid" style="display:none;margin-top:4px;padding-top:4px;border-top:1px dashed #fca5a5;font-size:10px;">
        <div>
          <span style="display:block;opacity:0.8;">Next Eligible Date:</span>
          <strong id="eligibilityNextDate" style="font-family:monospace;font-size:11px;"></strong>
        </div>
        <div>
          <span style="display:block;opacity:0.8;">Days Remaining:</span>
          <strong id="eligibilityDaysRemaining"></strong>
        </div>
      </div>
      <div id="collisionHoldAction" style="display:none;margin-top:6px;text-align:right;">
        <button id="btnSetLoggedHold" type="button" class="btn btn-secondary btn-sm" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b;font-weight:700;font-size:10px;display:inline-flex;">
          Set Status to "Logged" (Hold Claim)
        </button>
      </div>
    </div>

    <div id="conflictAlert" class="warning-box">
      ⚠️ <strong>Medicare Frequency Alert:</strong> <span id="conflictText"></span>
    </div>

    <div class="field">
      <label>Patient Name</label>
      <input type="text" id="patientName" placeholder="Name">
    </div>

    <div class="grid">
      <div class="field">
        <label>Patient ID / MRN</label>
        <input type="text" id="patientId" placeholder="Clinic ID">
      </div>
      <div class="field">
        <label>Date of Birth</label>
        <input type="text" id="patientDob" placeholder="DOB">
      </div>
    </div>

    <div class="grid">
      <div class="field">
        <label>Device Model</label>
        <input type="text" id="deviceModel" placeholder="Device">
      </div>
      <div class="field">
        <label>Serial Number</label>
        <input type="text" id="deviceSerial" placeholder="Serial">
      </div>
    </div>

    <div class="grid">
      <div class="field">
        <label>Transmission Date</label>
        <input type="text" id="transDate" placeholder="DD/MM/YYYY">
      </div>
      <div class="field">
        <label>Staff Reviewer</label>
        <input type="text" id="loggedBy" value="R. Hendricks">
      </div>
    </div>

    <!-- Billing Box with accurate Australian Medicare rules -->
    <div class="billing-box">
      <label>MBS Billing Item Code</label>
      <select id="billingCode" class="billing-select">
        <option value="11736">11736 - Loop Recorder (ILR/ICM) for AF [Max 4 per year] ($35.80)</option>
        <option value="11737">11737 - Loop Recorder (ILR/ICM) for Syncope/Stroke [Once per 4 wks] ($35.80)</option>
        <option value="11725">11725 - Pacemaker (PPM) [Once per 90 days] ($44.55)</option>
        <option value="11719">11719 - Defibrillator (ICD / CRT-D) [Once per 90 days] ($89.15)</option>
      </select>
      <div id="ruleHint" class="rule-hint">
        <strong>11736 Rule:</strong> For investigation/management of atrial fibrillation (AF). Max 4 claims per 12 months.
      </div>
    </div>

    <!-- Record Status Selector (Clinician Decision Directly in Extension) -->
    <div class="field" style="background:#f8fafc;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;margin-top:4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <label style="margin-bottom:0;color:#1e293b;">Record Status (Extension Decision)</label>
        <span style="font-size:9px;font-weight:700;color:#2563eb;background:#eff6ff;padding:1px 5px;border-radius:4px;border:1px solid #bfdbfe;">Decide in Extension</span>
      </div>
      <select id="recordStatus" class="status-select" style="font-weight:700;border-color:#94a3b8;">
        <option value="Reviewed" selected>Reviewed — Clinically Verified</option>
        <option value="Logged">Logged — Pending Review / Hold Claim</option>
        <option value="Billed">Billed — Marked for Payment</option>
      </select>
      <div style="font-size:10px;color:#64748b;margin-top:4px;">
        Set status directly from the extension. Email status option permanently removed.
      </div>
    </div>

    <div class="field">
      <label>Clinical Notes</label>
      <textarea id="notes" rows="2" placeholder="Rhythm observations, thresholds, battery status..."></textarea>
    </div>

    <div class="actions">
      <button id="saveHubBtn" class="btn btn-primary">🚀 Send to Clinic Billing Hub (PC)</button>
      <div class="grid">
        <button id="outlookBtn" class="btn btn-secondary">📧 Open Outlook</button>
        <button id="copyBtn" class="btn btn-secondary">📋 Copy Line</button>
      </div>
    </div>

    <div id="statusMsg" class="status-msg"></div>

    <div id="toggleSettings" class="settings-toggle">Configure Clinic Hub Network & Security Key</div>
    <div id="settingsPanel" class="settings-panel">
      <div style="font-weight:700;font-size:11px;margin-bottom:6px;color:#1e3a8a;">🔒 Clinic Hub & Authentication</div>
      <label>Clinic Hub Server URL (Travel Router / Linux IP):</label>
      <input type="text" id="hubUrl" value="http://192.168.8.100:3000" placeholder="e.g. http://192.168.8.100:3000">
      <div style="font-size:10px;color:#64748b;margin-top:2px;">Travel Bridge default: 192.168.8.100:3000 (or localhost:3000)</div>
      <label style="margin-top:6px;">Clinic Security Key / Passcode:</label>
      <input type="password" id="clinicKey" placeholder="e.g. CARDIO-WESTMEAD-8820" value="CARDIO-WESTMEAD-8820">
      <button id="testHubBtn" class="btn btn-secondary" style="margin-top:6px;width:100%">Test Authenticated Connection</button>
    </div>
  </div>

  <!-- TAB 2: SENT THIS SESSION VIEW -->
  <div id="viewSession" style="display:none;">
    <div class="session-stats">
      <div class="stat-box">
        Patients Sent This Shift
        <span id="sessionCount" class="stat-val">0</span>
      </div>
      <div class="stat-box">
        Est. MBS Claim Value
        <span id="sessionTotal" class="stat-val" style="color:#059669;">$0.00 AUD</span>
      </div>
    </div>

    <div class="session-search">
      <input type="text" id="searchSessionInput" placeholder="🔍 Filter patients sent this session...">
    </div>

    <div id="sessionList" class="session-list">
      <!-- Session cards rendered dynamically here -->
    </div>

    <div class="actions">
      <button id="copyAllSessionBtn" class="btn btn-secondary">
        📋 Copy All Session Rows (for PMS / Genie)
      </button>
      <div class="grid">
        <button id="exportSessionCsvBtn" class="btn btn-secondary btn-sm">
          📥 Export CSV
        </button>
        <button id="clearSessionBtn" class="btn btn-secondary btn-sm" style="color:#dc2626;">
          🗑️ Clear Shift Log
        </button>
      </div>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

export const EXTENSION_POPUP_JS = `// popup.js - Handles DOM data population, auto-sync on navigation, MBS rule guidance, Authenticated Hub API sync, and Persistent Session Tracking
document.addEventListener('DOMContentLoaded', () => {
  let hubApiUrl = 'http://192.168.8.100:3000';
  let clinicSecurityKey = 'CARDIO-WESTMEAD-8820';
  let detectedPortal = 'unknown';
  let sessionRecords = [];
  let autoSyncEnabled = true;
  let activePatientKey = '';
  let pendingDetectedPatient = null;
  let autoSyncToastTimer = null;

  const mbsFeeMap = {
    '11736': 35.80,
    '11737': 35.80,
    '11725': 44.55,
    '11719': 89.15
  };

  const portalNames = {
    'biotronik': 'Biotronik Home Monitoring',
    'boston_latitude': 'Boston Scientific LATITUDE',
    'medtronic_carelink': 'Medtronic CareLink',
    'abbott_merlin': 'Abbott Merlin.net'
  };

  const ruleTexts = {
    '11736': '11736 Rule: For investigation/management of atrial fibrillation (AF). Payable max 4 times in any 12-month period (~every 3 months).',
    '11737': '11737 Rule: For investigation of cryptogenic stroke or recurrent unexplained syncope. Payable once in any 4-week period (~monthly).',
    '11725': '11725 Rule: Permanent pacemaker (PPM). Payable once in any 3-month (90-day) period per patient.',
    '11719': '11719 Rule: Implantable defibrillator (ICD / CRT-D). Payable once in any 3-month (90-day) period per patient.'
  };

  // 1. DOCKABLE SIDE PANEL INTEGRATION
  const dockBtn = document.getElementById('btnOpenSidepanel');
  if (dockBtn) {
    dockBtn.addEventListener('click', () => {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.windowId) {
            chrome.sidePanel.open({ windowId: tabs[0].windowId }).then(() => {
              window.close(); // Close floating popup once side panel opens
            }).catch(console.error);
          }
        });
      } else {
        alert('Tip: To keep this panel permanently open while browsing, click the Chrome Extensions icon > click the 3 dots next to this extension > select "Open in side panel" (or press Alt+Shift+C).');
      }
    });
  }

  // 2. AUTO-SYNC & RE-SCAN CONTROLS
  const autoSyncCheck = document.getElementById('autoSyncCheck');
  const btnRescanTab = document.getElementById('btnRescanTab');
  const newPatientAlert = document.getElementById('newPatientAlert');
  const btnLoadDetectedPatient = document.getElementById('btnLoadDetectedPatient');

  if (autoSyncCheck) {
    autoSyncCheck.addEventListener('change', (e) => {
      autoSyncEnabled = e.target.checked;
      chrome.storage.local.set({ autoSyncEnabled });
      if (autoSyncEnabled && pendingDetectedPatient) {
        populatePatientForm(pendingDetectedPatient, 'auto');
        pendingDetectedPatient = null;
        newPatientAlert.style.display = 'none';
      }
    });
  }

  if (btnRescanTab) {
    btnRescanTab.addEventListener('click', () => {
      btnRescanTab.textContent = '⏳ Scanning...';
      scanActiveTab('manual_rescan');
      setTimeout(() => { btnRescanTab.textContent = '🔄 Re-scan Page'; }, 1000);
    });
  }

  if (btnLoadDetectedPatient) {
    btnLoadDetectedPatient.addEventListener('click', () => {
      if (pendingDetectedPatient) {
        populatePatientForm(pendingDetectedPatient, 'manual_load');
        pendingDetectedPatient = null;
        newPatientAlert.style.display = 'none';
      }
    });
  }

  // 3. TAB SWITCHING (Capture vs Session Log)
  const tabCaptureBtn = document.getElementById('tabCaptureBtn');
  const tabSessionBtn = document.getElementById('tabSessionBtn');
  const viewCapture = document.getElementById('viewCapture');
  const viewSession = document.getElementById('viewSession');

  tabCaptureBtn.addEventListener('click', () => {
    tabCaptureBtn.classList.add('active');
    tabSessionBtn.classList.remove('active');
    viewCapture.style.display = 'block';
    viewSession.style.display = 'none';
  });

  tabSessionBtn.addEventListener('click', () => {
    tabSessionBtn.classList.add('active');
    tabCaptureBtn.classList.remove('active');
    viewCapture.style.display = 'none';
    viewSession.style.display = 'block';
    renderSessionList();
  });

  // Toggle settings drawer
  document.getElementById('toggleSettings').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });

  // Load saved preferences, hub URL, security key, and session records
  chrome.storage.local.get({ 
    hubUrl: 'http://192.168.8.100:3000',
    clinicKey: 'CARDIO-WESTMEAD-8820',
    sessionLog: [],
    autoSyncEnabled: true
  }, (data) => {
    if (data.hubUrl) {
      hubApiUrl = data.hubUrl;
      document.getElementById('hubUrl').value = hubApiUrl;
    }
    if (data.clinicKey) {
      clinicSecurityKey = data.clinicKey;
      document.getElementById('clinicKey').value = clinicSecurityKey;
    }
    if (data.sessionLog) {
      sessionRecords = data.sessionLog;
      updateSessionBadges();
    }
    if (typeof data.autoSyncEnabled === 'boolean') {
      autoSyncEnabled = data.autoSyncEnabled;
      if (autoSyncCheck) autoSyncCheck.checked = autoSyncEnabled;
    }
    checkHubConnection();
    // Initial scan of whatever tab is active
    scanActiveTab('initial_load');
  });

  // Test button saves settings & checks connection
  document.getElementById('testHubBtn').addEventListener('click', () => {
    hubApiUrl = document.getElementById('hubUrl').value.trim();
    clinicSecurityKey = document.getElementById('clinicKey').value.trim();
    chrome.storage.local.set({ hubUrl: hubApiUrl, clinicKey: clinicSecurityKey }, () => {
      checkHubConnection();
      showStatus('Settings saved. Testing connection to ' + hubApiUrl + '...', true);
    });
  });

  document.getElementById('billingCode').addEventListener('change', (e) => {
    const code = e.target.value;
    document.getElementById('ruleHint').innerHTML = ruleTexts[code] || '';
    checkPatientMbsConflict();
  });

  // Re-check conflict on key patient field changes
  ['patientId', 'patientName', 'deviceSerial', 'transDate'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.addEventListener('input', () => {
        checkPatientMbsConflict();
      });
    }
  });

  // Quick action: set status to Logged when collision detected
  const btnSetLoggedHold = document.getElementById('btnSetLoggedHold');
  if (btnSetLoggedHold) {
    btnSetLoggedHold.addEventListener('click', () => {
      const statusEl = document.getElementById('recordStatus');
      if (statusEl) {
        statusEl.value = 'Logged';
        showStatus('Record status set to "Logged" to hold claim.', true);
      }
    });
  }

  // 4. CORE PATIENT POPULATION & DETECTION ENGINE
  function populatePatientForm(data, source = 'manual') {
    if (!data) return;

    detectedPortal = data.portal || 'unknown';
    activePatientKey = data.portal + ':' + (data.patientId || '') + ':' + (data.patientName || '') + ':' + (data.deviceSerial || '');

    const pBadge = document.getElementById('portalBadge');
    if (portalNames[data.portal]) {
      pBadge.textContent = portalNames[data.portal];
      pBadge.style.background = '#e0e7ff';
      pBadge.style.color = '#3730a3';
    } else {
      pBadge.textContent = data.portal || 'Unknown Portal';
    }

    document.getElementById('patientName').value = data.patientName || '';
    document.getElementById('patientId').value = data.patientId || '';
    document.getElementById('patientDob').value = data.patientDob || '';
    document.getElementById('deviceModel').value = data.deviceModel || '';
    document.getElementById('deviceSerial').value = data.deviceSerial || '';
    document.getElementById('transDate').value = data.transmissionDate || new Date().toLocaleDateString('en-AU');
    
    if (data.recommendedBillingCode) {
      document.getElementById('billingCode').value = data.recommendedBillingCode;
      document.getElementById('ruleHint').innerHTML = ruleTexts[data.recommendedBillingCode] || '';
    }

    if (data.notes && !document.getElementById('notes').value) {
      document.getElementById('notes').value = data.notes;
    }

    checkPatientMbsConflict();

    // Show visual confirmation that new patient telemetry was loaded
    if (source === 'auto' || source === 'manual_load' || source === 'manual_rescan') {
      const notice = document.getElementById('autoSyncNotice');
      const nameEl = document.getElementById('autoSyncPatientName');
      if (notice && nameEl) {
        nameEl.textContent = data.patientName ? (data.patientName + ' (' + (data.patientId || 'ID OK') + ')') : 'Active Page';
        notice.style.display = 'flex';
        clearTimeout(autoSyncToastTimer);
        autoSyncToastTimer = setTimeout(() => { notice.style.display = 'none'; }, 4000);
      }
    }
  }

  function handleIncomingPatientData(data, source = 'tab') {
    if (!data || (!data.patientName && !data.patientId)) {
      // If user navigated to a non-portal page
      if (source === 'manual_rescan') {
        showStatus('No cardiac patient telemetry detected on this page.', false);
      }
      return;
    }

    const newKey = data.portal + ':' + (data.patientId || '') + ':' + (data.patientName || '') + ':' + (data.deviceSerial || '');
    
    // If it's identical to the currently displayed patient, no need to alert or overwrite
    if (newKey === activePatientKey && activePatientKey !== '') {
      return;
    }

    if (autoSyncEnabled) {
      // Auto-update the fields seamlessly
      populatePatientForm(data, 'auto');
      if (newPatientAlert) newPatientAlert.style.display = 'none';
      pendingDetectedPatient = null;
    } else {
      // Auto-sync is OFF: notify user that active tab has changed to a new patient
      pendingDetectedPatient = data;
      if (newPatientAlert) {
        document.getElementById('newPatientName').textContent = data.patientName || 'New Patient';
        document.getElementById('newPatientDetails').textContent = (portalNames[data.portal] || data.portal) + ' | MRN: ' + (data.patientId || 'N/A') + ' | ' + (data.deviceModel || '');
        newPatientAlert.style.display = 'flex';
      }
    }
  }

  function scanActiveTab(reason = 'scan') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_PATIENT_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          if (reason === 'initial_load' && !document.getElementById('patientName').value) {
            document.getElementById('portalBadge').textContent = 'Open Portal & Scan';
            document.getElementById('portalBadge').style.background = '#f1f5f9';
            document.getElementById('portalBadge').style.color = '#64748b';
          }
          return;
        }

        if (reason === 'manual_rescan') {
          populatePatientForm(response, 'manual_rescan');
        } else {
          handleIncomingPatientData(response, reason);
        }
      });
    });
  }

  // 5. LIVE NAVIGATION & TAB EVENT LISTENERS FOR DOCKED SIDE PANEL
  // Detects when the clinician navigates to a new patient URL in Chrome/Edge
  if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only react if the updated tab is the currently active one
      if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
        scanActiveTab('tab_navigated');
      }
    });
  }

  // Detects when clinician switches between multiple open portal tabs
  if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(() => {
      scanActiveTab('tab_switched');
    });
  }

  // Detects SPA DOM transitions broadcast by content.js (e.g. clicking patient rows inside single-page webapps)
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'PATIENT_DOM_CHANGED' && message.data) {
        handleIncomingPatientData(message.data, 'dom_mutation');
      }
    });
  }

  // Check with Hub if this patient has an existing claim within rule limits (consumes detailed EligibilityEvaluation)
  function checkPatientMbsConflict() {
    const patientId = document.getElementById('patientId').value.trim();
    const patientName = document.getElementById('patientName').value.trim();
    const deviceSerial = document.getElementById('deviceSerial').value.trim();
    const code = document.getElementById('billingCode').value;
    const transDate = document.getElementById('transDate').value.trim();

    const box = document.getElementById('eligibilityBox');
    const legacyAlert = document.getElementById('conflictAlert');

    if (!patientId && !patientName && !deviceSerial) {
      if (box) box.style.display = 'none';
      if (legacyAlert) legacyAlert.style.display = 'none';
      return;
    }

    fetch(\`\${hubApiUrl}/api/records/check-conflict\`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Clinic-Key': clinicSecurityKey
      },
      body: JSON.stringify({ 
        patientIdOrMrn: patientId,
        patientName: patientName,
        deviceSerial: deviceSerial,
        billingCode: code,
        transmissionDate: transDate
      })
    })
    .then(r => {
      if (r.status === 401) throw new Error('AUTH_FAILED');
      return r.json();
    })
    .then(data => {
      if (!box) return;

      box.style.display = 'block';
      const iconEl = document.getElementById('eligibilityIcon');
      const titleEl = document.getElementById('eligibilityTitle');
      const tagEl = document.getElementById('eligibilityTag');
      const reasonEl = document.getElementById('eligibilityReason');
      const datesEl = document.getElementById('eligibilityDates');
      const nextDateEl = document.getElementById('eligibilityNextDate');
      const daysRemainingEl = document.getElementById('eligibilityDaysRemaining');
      const holdActionEl = document.getElementById('collisionHoldAction');

      if (data.canBill === false || data.hasConflict) {
        box.className = 'eligibility-box cannot-bill';
        if (iconEl) iconEl.textContent = '⛔';
        if (titleEl) titleEl.textContent = 'Medicare Collision Alert — Cannot Bill Yet';
        if (tagEl) {
          tagEl.textContent = 'COLLISION';
          tagEl.style.background = '#fecaca';
          tagEl.style.color = '#991b1b';
        }
        if (reasonEl) reasonEl.textContent = data.reason || 'This patient has a conflicting claim within the Medicare exclusion window.';
        
        if (data.nextEligibleDate || data.daysRemaining) {
          if (datesEl) datesEl.style.display = 'grid';
          if (nextDateEl) nextDateEl.textContent = data.nextEligibleDate || 'Check window';
          if (daysRemainingEl) daysRemainingEl.textContent = data.daysRemaining ? (data.daysRemaining + ' days remaining') : 'Exclusion active';
        } else {
          if (datesEl) datesEl.style.display = 'none';
        }

        if (holdActionEl) holdActionEl.style.display = 'block';

        // Suggest setting status to Logged if currently Billed
        const statusEl = document.getElementById('recordStatus');
        if (statusEl && statusEl.value === 'Billed') {
          // Keep current value but notify user
          showStatus('⚠️ Medicare Collision detected. Recommend setting status to "Logged".', false);
        }
      } else {
        box.className = 'eligibility-box can-bill';
        if (iconEl) iconEl.textContent = '✓';
        if (titleEl) titleEl.textContent = 'Eligible to Bill — No Collisions Found';
        if (tagEl) {
          tagEl.textContent = 'ELIGIBLE';
          tagEl.style.background = '#a7f3d0';
          tagEl.style.color = '#065f46';
        }
        if (reasonEl) reasonEl.textContent = data.reason || 'No conflicting claims found across practice database (>1 year lookback verified). Ready to bill.';
        if (datesEl) datesEl.style.display = 'none';
        if (holdActionEl) holdActionEl.style.display = 'none';
      }

      if (legacyAlert) legacyAlert.style.display = 'none';
    })
    .catch((err) => {
      if (err.message === 'AUTH_FAILED') {
        const el = document.getElementById('hubStatus');
        if (el) {
          el.textContent = '🔒 Clinic Key Required';
          el.style.color = '#dc2626';
        }
      }
    });
  }

  function checkHubConnection() {
    fetch(\`\${hubApiUrl}/api/health\`)
      .then(r => r.json())
      .then(() => {
        return fetch(\`\${hubApiUrl}/api/records\`, {
          headers: { 'X-Clinic-Key': clinicSecurityKey }
        });
      })
      .then(r => {
        const el = document.getElementById('hubStatus');
        if (r.status === 401) {
          el.textContent = '🔒 Hub Online (Key Invalid)';
          el.style.color = '#dc2626';
        } else {
          el.textContent = '● Hub Connected (' + hubApiUrl.replace('http://', '') + ')';
          el.style.color = '#059669';
        }
      })
      .catch(() => {
        const el = document.getElementById('hubStatus');
        el.textContent = '○ Hub Offline (Local Queue)';
        el.style.color = '#d97706';
      });
  }

  // Save to Hub via HTTP POST with Clinic Key & Append to Active Session Log
  document.getElementById('saveHubBtn').addEventListener('click', () => {
    const record = getFormData();
    record.id = 'rec-' + Date.now();
    record.vendor = detectedPortal;

    const sessionEntry = {
      id: record.id,
      patientName: record.patientName || 'Unnamed Patient',
      patientIdOrMrn: record.patientIdOrMrn || 'N/A',
      patientDob: record.patientDob || '',
      vendor: detectedPortal,
      deviceModel: record.deviceModel || 'Unspecified Device',
      deviceSerial: record.deviceSerial || 'N/A',
      transmissionDate: record.transmissionDate,
      billingCode: record.billingCode,
      mbsFeeAud: mbsFeeMap[record.billingCode] || 35.80,
      loggedBy: record.loggedBy,
      recordStatus: record.status || 'Reviewed',
      notes: record.notes,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'Synced to Hub'
    };

    // 1. Send to Practice Hub REST API
    fetch(\`\${hubApiUrl}/api/records\`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Clinic-Key': clinicSecurityKey
      },
      body: JSON.stringify(record)
    })
    .then(r => {
      if (r.status === 401) throw new Error('AUTH_FAILED');
      return r.json();
    })
    .then(data => {
      if (data.success) {
        addRecordToSession(sessionEntry);
        showStatus('✓ Patient saved to Hub & added to your Session Log!', true);
      } else {
        showStatus('Hub returned error: ' + (data.error || 'Check fields'), false);
      }
    })
    .catch(err => {
      if (err.message === 'AUTH_FAILED') {
        showStatus('❌ Access Denied: Clinic Security Key is invalid. Check settings below.', false);
        return;
      }
      // Offline fallback: save locally
      sessionEntry.status = 'Queued Locally (Hub Offline)';
      addRecordToSession(sessionEntry);
      showStatus('Hub offline — added to local Session Log (' + sessionRecords.length + ' logged this shift)', true);
    });
  });

  function addRecordToSession(entry) {
    sessionRecords.unshift(entry);
    chrome.storage.local.set({ sessionLog: sessionRecords }, () => {
      updateSessionBadges();
      if (viewSession.style.display === 'block') {
        renderSessionList();
      }
    });
  }

  function updateSessionBadges() {
    const badge = document.getElementById('sessionBadge');
    if (badge) badge.textContent = sessionRecords.length;

    const countEl = document.getElementById('sessionCount');
    if (countEl) countEl.textContent = sessionRecords.length + (sessionRecords.length === 1 ? ' Patient' : ' Patients');

    const totalFee = sessionRecords.reduce((acc, r) => acc + (r.mbsFeeAud || 0), 0);
    const totalEl = document.getElementById('sessionTotal');
    if (totalEl) totalEl.textContent = '$' + totalFee.toFixed(2) + ' AUD';
  }

  // Render Session Log Cards
  function renderSessionList(filterText = '') {
    const listEl = document.getElementById('sessionList');
    if (!listEl) return;

    updateSessionBadges();

    const filtered = sessionRecords.filter(r => {
      if (!filterText) return true;
      const term = filterText.toLowerCase();
      return (
        r.patientName.toLowerCase().includes(term) ||
        r.patientIdOrMrn.toLowerCase().includes(term) ||
        r.deviceModel.toLowerCase().includes(term) ||
        r.deviceSerial.toLowerCase().includes(term)
      );
    });

    if (filtered.length === 0) {
      listEl.innerHTML = \`
        <div class="empty-session">
          <div style="font-size:24px;margin-bottom:6px;">📭</div>
          <strong style="color:#1e293b;display:block;">No patients logged in this shift yet</strong>
          <p style="font-size:11px;margin:4px 0 0 0;">Open Biotronik, Latitude, CareLink, or Merlin, review a transmission, and click <em>"Send to Clinic Billing Hub"</em>.</p>
        </div>
      \`;
      return;
    }

    listEl.innerHTML = filtered.map(r => \`
      <div class="session-card">
        <div class="session-card-header">
          <div>
            <div class="patient-title">\${r.patientName}</div>
            <div style="font-size:11px;color:#64748b;">ID: \${r.patientIdOrMrn} \${r.patientDob ? '| DOB: ' + r.patientDob : ''}</div>
          </div>
          <span class="portal-pill portal-\${r.vendor}">\${(r.vendor || 'portal').replace('_', ' ')}</span>
        </div>
        <div class="session-card-details">
          <div><strong>Device:</strong> \${r.deviceModel} (SN: \${r.deviceSerial})</div>
          <div><strong>Transmission:</strong> \${r.transmissionDate} • <strong>Logged:</strong> \${r.timestamp}</div>
        </div>
        <div class="session-card-footer">
          <span class="mbs-tag">MBS \${r.billingCode} • $\${(r.mbsFeeAud || 0).toFixed(2)}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="display:flex;align-items:center;gap:3px;">
              <span style="font-size:9px;color:#64748b;font-weight:600;">Status:</span>
              <select class="session-status-dropdown" data-id="\${r.id}">
                <option value="Logged" \${r.recordStatus === 'Logged' ? 'selected' : ''}>Logged</option>
                <option value="Reviewed" \${(!r.recordStatus || r.recordStatus === 'Reviewed') ? 'selected' : ''}>Reviewed</option>
                <option value="Billed" \${(r.recordStatus === 'Billed' || r.recordStatus === 'Finalized & Billed') ? 'selected' : ''}>Billed</option>
              </select>
            </div>
            <button class="btn btn-secondary btn-sm copy-row-btn" data-id="\${r.id}" style="padding:2px 6px;">Copy</button>
          </div>
        </div>
      </div>
    \`).join('');

    // Attach status dropdown change listeners for in-extension status management
    document.querySelectorAll('.session-status-dropdown').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        const item = sessionRecords.find(x => x.id === id);
        if (item) {
          item.recordStatus = newStatus;
          chrome.storage.local.set({ sessionLog: sessionRecords });
        }

        // Send PATCH update to Hub
        fetch(\`\${hubApiUrl}/api/records/\${id}/status\`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Clinic-Key': clinicSecurityKey
          },
          body: JSON.stringify({ status: newStatus })
        })
        .then(r => r.json())
        .then(d => {
          showStatus('Status updated to "' + newStatus + '" on Clinic Hub!', true);
        })
        .catch(err => {
          showStatus('Updated status to "' + newStatus + '" locally (Hub offline)', true);
        });
      });
    });

    // Attach individual copy listeners
    document.querySelectorAll('.copy-row-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const item = sessionRecords.find(x => x.id === id);
        if (item) {
          const line = \`\${item.transmissionDate}\\t\${item.patientName}\\t\${item.patientIdOrMrn}\\t\${item.deviceModel}\\t\${item.billingCode}\\t\${item.loggedBy || 'Staff'}\`;
          navigator.clipboard.writeText(line).then(() => {
            e.target.textContent = 'Copied!';
            setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
          });
        }
      });
    });
  }

  // Filter input
  const searchInput = document.getElementById('searchSessionInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSessionList(e.target.value.trim());
    });
  }

  // Copy all session rows in tab-separated format for PMS (Genie, Best Practice, MedicalDirector)
  const copyAllBtn = document.getElementById('copyAllSessionBtn');
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      if (sessionRecords.length === 0) {
        alert('Session log is empty. No patients to copy.');
        return;
      }
      const header = 'Transmission_Date\\tPatient_Name\\tPatient_ID\\tDevice_Model\\tMBS_Item\\tFee_AUD\\tTime_Sent\\r\\n';
      const rows = sessionRecords.map(r => 
        \`\${r.transmissionDate}\\t\${r.patientName}\\t\${r.patientIdOrMrn}\\t\${r.deviceModel}\\t\${r.billingCode}\\t$\${(r.mbsFeeAud || 0).toFixed(2)}\\t\${r.timestamp}\`
      ).join('\\r\\n');

      navigator.clipboard.writeText(header + rows).then(() => {
        const orig = copyAllBtn.textContent;
        copyAllBtn.textContent = '✓ Copied ' + sessionRecords.length + ' Patients to Clipboard!';
        setTimeout(() => { copyAllBtn.textContent = orig; }, 2500);
      });
    });
  }

  // Export CSV
  const exportCsvBtn = document.getElementById('exportSessionCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (sessionRecords.length === 0) {
        alert('Session log is empty.');
        return;
      }
      let csv = 'Patient Name,Patient ID,DOB,Portal,Device Model,Serial,Transmission Date,MBS Code,MBS Fee,Sent Time,Status\\n';
      sessionRecords.forEach(r => {
        csv += \`"\${r.patientName}","\${r.patientIdOrMrn}","\${r.patientDob || ''}","\${r.vendor}","\${r.deviceModel}","\${r.deviceSerial}","\${r.transmissionDate}","\${r.billingCode}","\${r.mbsFeeAud || ''}","\${r.timestamp}","\${r.status}"\\n\`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`cardiac-session-log-\${new Date().toISOString().slice(0,10)}.csv\`;
      a.click();
    });
  }

  // Clear Session Log
  const clearSessionBtn = document.getElementById('clearSessionBtn');
  if (clearSessionBtn) {
    clearSessionBtn.addEventListener('click', () => {
      if (sessionRecords.length === 0) return;
      if (confirm('Clear the current session log? (Records on the central Linux Hub will NOT be affected)')) {
        sessionRecords = [];
        chrome.storage.local.set({ sessionLog: [] }, () => {
          updateSessionBadges();
          renderSessionList();
        });
      }
    });
  }

  // Open Outlook Email
  document.getElementById('outlookBtn').addEventListener('click', () => {
    const r = getFormData();
    const subject = encodeURIComponent(\`Remote Monitoring Billing - \${r.patientName} (MBS \${r.billingCode})\`);
    const body = encodeURIComponent(
      \`Patient: \${r.patientName}\\r\\n\` +
      \`ID: \${r.patientId} | DOB: \${r.patientDob}\\r\\n\` +
      \`Device: \${r.deviceModel} (SN: \${r.deviceSerial})\\r\\n\` +
      \`Transmission Date: \${r.transDate}\\r\\n\` +
      \`MBS Item: \${r.billingCode}\\r\\n\` +
      \`Reviewed By: \${r.loggedBy}\\r\\n\` +
      \`Notes: \${r.notes || 'Routine remote monitoring surveillance.'}\\r\\n\`
    );
    window.open(\`mailto:billing@practice.com.au?subject=\${subject}&body=\${body}\`);
  });

  // Copy single billing line for PMS
  document.getElementById('copyBtn').addEventListener('click', () => {
    const r = getFormData();
    const line = \`\${r.transDate}\\t\${r.patientName}\\t\${r.patientId}\\t\${r.deviceModel}\\t\${r.billingCode}\\t\${r.loggedBy}\`;
    navigator.clipboard.writeText(line).then(() => {
      showStatus('Copied billing tab-separated row to clipboard!', true);
    });
  });

  function getFormData() {
    return {
      patientName: document.getElementById('patientName').value,
      patientIdOrMrn: document.getElementById('patientId').value,
      patientDob: document.getElementById('patientDob').value,
      deviceModel: document.getElementById('deviceModel').value,
      deviceSerial: document.getElementById('deviceSerial').value,
      transmissionDate: document.getElementById('transDate').value,
      visitDate: new Date().toLocaleDateString('en-AU'),
      loggedBy: document.getElementById('loggedBy').value,
      billingCode: document.getElementById('billingCode').value,
      status: (document.getElementById('recordStatus') ? document.getElementById('recordStatus').value : 'Reviewed') || 'Reviewed',
      clinicalFindings: document.getElementById('notes').value,
      notes: document.getElementById('notes').value
    };
  }

  function showStatus(text, success) {
    const el = document.getElementById('statusMsg');
    el.textContent = text;
    el.style.display = 'block';
    el.className = 'status-msg ' + (success ? 'status-success' : '');
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
});`;

export const EXTENSION_BACKGROUND_JS = `// background.js - Service Worker for Extension (Manifest V3 Dockable Side Panel)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cardiac Remote Monitoring Extension v1.2.0 installed.');

  // Configure Chrome / Edge native side panel to open on toolbar icon click
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Side panel open behavior setup:', err);
    });
  }

  // Add context menu entry for right-clicking anywhere in vendor portals
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'open-cardiac-dock',
      title: 'Open Cardiac Billing Assistant (Docked Side Panel)',
      contexts: ['page', 'action']
    });
  }
});

// Context menu click listener
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-cardiac-dock' && tab?.windowId) {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
      }
    }
  });
}
`;

export const EXTENSION_README_MD = `# Cardiac Remote Monitoring Log & Billing Browser Extension (v1.3.0)

This extension is built for Chrome, Microsoft Edge, and Brave browsers used by cardiology practices and remote device technicians.

## Key Features in v1.3.0:
1. **Live Patient Navigation & Auto-Sync (NEW in v1.3.0)**:
   - When the extension is kept open in the docked side panel, it **automatically detects when you navigate to another patient or switch browser tabs**.
   - **Continuous SPA DOM Observer**: As you click patient rows inside single-page applications (LATITUDE NXT, Merlin.net, CareLink, Biotronik), the content script detects the DOM transition and refreshes the form immediately.
   - **Auto-Sync Toggle**: Checkbox allows instant automatic updating or manual notification mode ("Load Telemetry").
   - **🔄 Re-Scan Page Button**: Always accessible at the top of the panel to re-query the active browser tab on demand.

2. **Dockable Side Panel (Persistent)**:
   - Built with the **Chrome Side Panel API**.
   - When opened in the Side Panel, the assistant **remains docked permanently to the right side of the browser window**.
   - Never closes when clicking around web pages, opening patient reports, or downloading PDFs.
   - Shortcut: Press **Alt+Shift+C** to toggle the panel.

3. **"Sent This Session" Shift Log Tab**:
   - Live tab showing every patient transmitted to the central Clinic Hub during your current active session.
   - Running patient count and estimated Medicare MBS revenue tally (e.g. \`6 Patients | $250.60 AUD\`).
   - One-click **"Copy All Session Rows"** formatted in tab-separated values for instant pasting into **Genie, Best Practice, or MedicalDirector**.
   - 1-click **Export Session CSV** for audit logs.

4. **Option 3 Travel Router & Linux Server Integration**:
   - Default Hub Server URL set to \`http://192.168.8.100:3000\`.
   - Authenticated with clinic security key (\`CARDIO-WESTMEAD-8820\`).

## Supported Portals:
- **Biotronik Home Monitoring** (\`biotronik-homemonitoring.com\`)
- **Boston Scientific LATITUDE NXT** (\`latitudenxt.bostonscientific-international.com.au\` / \`latitudenxt.com\`)
- **Medtronic CareLink** (\`global.medtroniccarelink.net\`)
- **Abbott Merlin.net PCN** (\`merlin.net\`)

## Installation Instructions (Chrome / Microsoft Edge):
1. Unzip \`cardiac-device-billing-extension.zip\` into a folder on your computer.
2. Open your browser and navigate to \`chrome://extensions\` (or \`edge://extensions\`).
3. Turn on the **Developer mode** toggle switch (top-right in Chrome, left sidebar in Edge).
4. Click **Load unpacked** and select the unzipped folder.
5. Click the **Extensions puzzle piece** icon in your browser toolbar, pin the **Cardiac Billing Logger** icon, and click it to open the persistent docked side panel!
`;

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    filename: 'manifest.json',
    description: 'Extension configuration, Side Panel API & permissions (Manifest V3)',
    language: 'json',
    content: EXTENSION_MANIFEST
  },
  {
    filename: 'content.js',
    description: 'DOM scraper with custom selectors for Biotronik, Latitude, CareLink, and Merlin',
    language: 'javascript',
    content: EXTENSION_CONTENT_SCRIPT
  },
  {
    filename: 'popup.html',
    description: 'Dockable Side Panel & Popup UI with tabbed Capture & Session Log',
    language: 'html',
    content: EXTENSION_POPUP_HTML
  },
  {
    filename: 'popup.js',
    description: 'Docking controller, DOM data population, MBS validator, and Session Log tracker',
    language: 'javascript',
    content: EXTENSION_POPUP_JS
  },
  {
    filename: 'background.js',
    description: 'Manifest V3 Service Worker: registers side panel behavior and context menus',
    language: 'javascript',
    content: EXTENSION_BACKGROUND_JS
  },
  {
    filename: 'README.md',
    description: 'Installation, Dockable Side Panel, and Session Log instructions',
    language: 'markdown',
    content: EXTENSION_README_MD
  }
];
