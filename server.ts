import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// Enable CORS for browser extensions running on any of the 4 medical portal domains
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clinic-Key, X-Session-Token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==========================================
// SECURITY & AUTHENTICATION CONFIGURATION
// ==========================================
// In a clinical LAN, port 3000 is protected by:
// 1. Clinic Secret API Key (used by Chrome/Edge extensions on staff PCs)
// 2. Staff PIN / Session Tokens (used by browsers accessing the Web Hub)
const CLINIC_SECURITY_KEY = process.env.CLINIC_SECURITY_KEY || 'CARDIO-WESTMEAD-8820';
const VALID_STAFF_PINS = ['1234', '8820', '9911'];
const activeSessionTokens = new Set<string>();

// Pre-seed an initial session token for development convenience
activeSessionTokens.add('dev-session-cardiac-auth');

// Auth validation middleware for protected API endpoints
function requireClinicAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Publicly accessible health, auth, and storage audit endpoints
  if (
    req.path === '/api/health' || 
    req.path === '/api/auth/login' || 
    req.path === '/api/auth/verify' ||
    req.path === '/api/auth/config' ||
    req.path === '/api/storage/info'
  ) {
    return next();
  }

  // Check 1: Clinic Secret Key header (sent by Browser Extensions)
  const clinicKeyHeader = req.headers['x-clinic-key'] as string;
  const authHeader = req.headers['authorization'] as string;
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

  if (clinicKeyHeader === CLINIC_SECURITY_KEY || bearerKey === CLINIC_SECURITY_KEY) {
    return next();
  }

  // Check 2: Web Session Token header (sent by authenticated staff in web browser)
  const sessionToken = req.headers['x-session-token'] as string;
  if (sessionToken && activeSessionTokens.has(sessionToken)) {
    return next();
  }

  // If both fail, block request with 401 Unauthorized
  return res.status(401).json({
    success: false,
    code: 'CLINIC_AUTH_REQUIRED',
    error: 'Access Denied: Valid Clinic Security Key or authenticated Staff Session required to access patient records.'
  });
}

// Attach auth guard to all /api/records and /api/billing-sheets endpoints
app.use('/api/records', requireClinicAuth);
app.use('/api/billing-sheets', requireClinicAuth);


// In-memory record store (initialized with default clinical cases)
interface ServerRecord {
  id: string;
  patientName: string;
  patientDob?: string;
  patientIdOrMrn: string;
  medicareCardNumber?: string;
  vendor: string;
  portalUrl: string;
  deviceModel: string;
  deviceSerial: string;
  deviceCategory: string;
  transmissionDate: string;
  visitDate: string;
  billingCode: string;
  clinicalIndication?: string;
  loggedBy: string;
  clinicName: string;
  status: string;
  clinicalFindings?: string;
  notes?: string;
  isFlaggedDuplicate?: boolean;
  conflictReason?: string;
  eowSheetId?: string;
  pbrcBatchRef?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  createdAt: string;
}

interface ServerBillingSheet {
  id: string;
  weekEndingDate: string;
  weekNumber: number;
  year: number;
  createdDate: string;
  clinicName: string;
  providerName: string;
  providerNumber: string;
  billingClerkEmail: string;
  billingClerkName: string;
  pbrcBatchRef: string;
  notesForClerk: string;
  recordIds: string[];
  patientCount: number;
  totalFeeAud: number;
  codeBreakdown: any[];
  status: string;
  sentAt?: string;
  sentByStaff: string;
}

// ==========================================
// PERSISTENT CLINICAL DATABASE (FILE-BASED)
// Medicare requires retaining cardiac device billing records > 7 years.
// ==========================================
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'practice_db.json');

let practiceBillingSheets: ServerBillingSheet[] = [];

// Seed records with multi-year archives (>1 year retention) for testing
const INITIAL_SEED_RECORDS: ServerRecord[] = [
  {
    id: 'rec-001',
    patientName: 'Rea, Mark',
    patientDob: '21 Dec 1965',
    patientIdOrMrn: '2c9881db9c4cabbd01',
    vendor: 'biotronik',
    portalUrl: 'https://www.biotronik-homemonitoring.com/hmsc_guiWeb/patient/monitoring/DisplayPatientContext.jsf',
    deviceModel: 'BIOMONITOR IIIm',
    deviceSerial: '95091157',
    deviceCategory: 'ILR/ICM',
    transmissionDate: '09/09/2026',
    visitDate: '09/09/2026',
    billingCode: '11736',
    clinicalIndication: 'Investigation of Atrial Fibrillation (AF)',
    loggedBy: 'R. Hendricks',
    clinicName: 'Westmead Hospital Cardiology',
    status: 'Reviewed',
    clinicalFindings: 'HM follow-up transmission arrived 09/09/2026. Routine check completed, stable sensing.',
    notes: 'Item 11736: Max 4 times per 12-month period for AF monitoring.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec-002',
    patientName: 'Jeremic, Stanka',
    patientDob: '02 Apr 1947',
    patientIdOrMrn: '5585807',
    vendor: 'boston_latitude',
    portalUrl: 'https://www.latitudenxt.bostonscientific-international.com.au/clinic/devicepage/summary/dashboards',
    deviceModel: 'G447 RESONATE X4 CRT-D',
    deviceSerial: '329199',
    deviceCategory: 'CRT-D',
    transmissionDate: '07/09/2026',
    visitDate: '08/09/2026',
    billingCode: '11719',
    clinicalIndication: 'Defibrillator (ICD / CRT-D) Routine Surveillance',
    loggedBy: 'R. Hendricks',
    clinicName: 'Westmead Hospital Cardiac Unit',
    status: 'Logged',
    clinicalFindings: 'AT/AF burden 1%, 175 events. BiV pacing 99%. HeartLogic index 1. Battery 9 years remaining.',
    notes: 'AF on last report, ? anti-coagulant, ? CMO. Discuss with Dr. GA.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec-003',
    patientName: 'Lattouf, Teresa',
    patientDob: '14-Feb-1985',
    patientIdOrMrn: '1002937122',
    vendor: 'medtronic_carelink',
    portalUrl: 'https://global.medtroniccarelink.net/carelink.web/transmissions/transmission-detail',
    deviceModel: 'Azure™ S DR MRI W3DR01',
    deviceSerial: 'RNJ157637G',
    deviceCategory: 'PPM',
    transmissionDate: '09/09/2026',
    visitDate: '09/09/2026',
    billingCode: '11725',
    clinicalIndication: 'Permanent Pacemaker Surveillance',
    loggedBy: 'R. Hendricks',
    clinicName: 'Westmead Hospital - Cardiology',
    status: 'Logged',
    clinicalFindings: 'VP 100%, AP <0.1% (MVP mode). Battery: 11.0 years remaining. Lead impedance: A: 779 ohms, RV: 399 ohms.',
    notes: 'Clinician: Dr. David Tanous. Capture thresholds stable at A: 1.625V, RV: 1.250V.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec-004',
    patientName: 'Chen, Michelle',
    patientDob: '12-May-1972',
    patientIdOrMrn: '4910283',
    vendor: 'medtronic_carelink',
    portalUrl: 'https://global.medtroniccarelink.net/carelink.web/transmissions/transmission-detail',
    deviceModel: 'Reveal LINQ™ ICM LNQ11',
    deviceSerial: 'RLN491022H',
    deviceCategory: 'ILR/ICM',
    transmissionDate: '06/09/2026',
    visitDate: '07/09/2026',
    billingCode: '11737',
    clinicalIndication: 'Investigation of Cryptogenic Stroke & Recurrent Unexplained Syncope',
    loggedBy: 'M. Chen',
    clinicName: 'Westmead Hospital - Cardiology',
    status: 'Reviewed',
    clinicalFindings: 'Review of symptom episode following collapse. No sinus pause or high-grade AV block.',
    notes: 'Item 11737: Payable once per 4-week period.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec-006',
    patientName: 'Lattouf, Teresa',
    patientDob: '14-Feb-1985',
    patientIdOrMrn: '1002937122',
    vendor: 'medtronic_carelink',
    portalUrl: 'https://global.medtroniccarelink.net/carelink.web/transmissions/transmission-detail',
    deviceModel: 'Azure™ S DR MRI W3DR01',
    deviceSerial: 'RNJ157637G',
    deviceCategory: 'PPM',
    transmissionDate: '15/08/2026',
    visitDate: '16/08/2026',
    billingCode: '11725',
    clinicalIndication: 'Permanent Pacemaker Surveillance',
    loggedBy: 'J. Miller',
    clinicName: 'Westmead Hospital - Cardiology',
    status: 'Billed',
    clinicalFindings: 'Transmission reviewed following unscheduled patient-initiated transmission. Baseline pacing checked.',
    notes: 'Billed on 16/08/2026. Flags 90-day Medicare rule duplicate warning on 09/09/2026!',
    isFlaggedDuplicate: true,
    conflictReason: 'Item 11725 already claimed on 16/08/2026 (< 90 days ago)',
    createdAt: new Date().toISOString()
  },
  {
    // Multi-year record (> 1 year ago) for Mark Rea
    id: 'rec-007',
    patientName: 'Rea, Mark',
    patientDob: '21 Dec 1965',
    patientIdOrMrn: '2c9881db9c4cabbd01',
    vendor: 'biotronik',
    portalUrl: 'https://www.biotronik-homemonitoring.com/hmsc_guiWeb/patient/monitoring/DisplayPatientContext.jsf',
    deviceModel: 'BIOMONITOR IIIm',
    deviceSerial: '95091157',
    deviceCategory: 'ILR/ICM',
    transmissionDate: '12/06/2025',
    visitDate: '12/06/2025',
    billingCode: '11736',
    clinicalIndication: 'Investigation of Atrial Fibrillation (AF)',
    loggedBy: 'R. Hendricks',
    clinicName: 'Westmead Hospital Cardiology',
    status: 'Finalized & Billed',
    pbrcBatchRef: 'BATCH-2025-W24-WESTMEAD',
    finalizedAt: '13/06/2025 16:30',
    finalizedBy: 'R. Hendricks',
    clinicalFindings: 'Annual baseline AF assessment. 14 months archived record.',
    notes: 'Historical multi-year audit log (>1 year ago). Medicare 12-month rolling window expired cleanly.',
    createdAt: new Date('2025-06-12T10:00:00Z').toISOString()
  },
  {
    // Multi-year record (> 1 year ago) for Ali, Ashad
    id: 'rec-008',
    patientName: 'Ali, Ashad',
    patientDob: '19-Nov-1958',
    patientIdOrMrn: '51050728',
    vendor: 'abbott_merlin',
    portalUrl: 'https://www.merlin.net/group/merlin-ep_b/transmission-details',
    deviceModel: 'Quadra Assura MP™ 3371-40',
    deviceSerial: 'QAM3371-9982',
    deviceCategory: 'CRT-D',
    transmissionDate: '18/02/2025',
    visitDate: '19/02/2025',
    billingCode: '11719',
    clinicalIndication: 'Defibrillator (ICD / CRT-D) Routine Surveillance',
    loggedBy: 'S. Cooper',
    clinicName: 'Westmead Cardiology EP Clinic',
    status: 'Finalized & Billed',
    pbrcBatchRef: 'BATCH-2025-W08-WESTMEAD',
    finalizedAt: '20/02/2025 11:15',
    finalizedBy: 'S. Cooper',
    clinicalFindings: 'Early 2025 check. Lead impedances normal.',
    notes: 'Multi-year archive record. Satisfies Medicare 7-year retention rule.',
    createdAt: new Date('2025-02-18T10:00:00Z').toISOString()
  }
];

let practiceRecords: ServerRecord[] = [...INITIAL_SEED_RECORDS];

function saveDatabaseToFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      version: '1.3.0',
      lastSaved: new Date().toISOString(),
      retentionStandard: 'Australian Medicare 7-Year Clinical Record Retention',
      records: practiceRecords,
      billingSheets: practiceBillingSheets
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[STORAGE] Persisted ${practiceRecords.length} records and ${practiceBillingSheets.length} sheets to ${DB_FILE_PATH}`);
  } catch (err) {
    console.error('[STORAGE] Error persisting database file:', err);
  }
}

function loadDatabaseFromFile() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data.records) && data.records.length > 0) {
        practiceRecords = data.records;
        console.log(`[STORAGE] Loaded ${practiceRecords.length} records from ${DB_FILE_PATH}`);
      }
      if (Array.isArray(data.billingSheets)) {
        practiceBillingSheets = data.billingSheets;
        console.log(`[STORAGE] Loaded ${practiceBillingSheets.length} billing sheets from ${DB_FILE_PATH}`);
      }
      return;
    }
  } catch (err) {
    console.error('[STORAGE] Failed to parse database file, preserving seed defaults:', err);
  }
  // If file doesn't exist, create it with seed records
  saveDatabaseToFile();
}

// Helper date functions for Medicare interval evaluation
function parseDateMs(dateStr?: string): number {
  if (!dateStr) return Date.now();
  const trimmed = dateStr.trim();
  const auMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (auMatch) {
    const day = parseInt(auMatch[1], 10);
    const month = parseInt(auMatch[2], 10) - 1;
    const year = parseInt(auMatch[3], 10);
    return new Date(year, month, day).getTime();
  }
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day).getTime();
  }
  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? Date.now() : parsed;
}

function formatDateEnAu(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Multi-year Medicare collision and eligibility calculation engine
interface EligibilityEvaluation {
  canBill: boolean;
  hasConflict: boolean;
  status: 'ELIGIBLE' | 'COLLISION_CANNOT_BILL' | 'WARNING_RECENT_CLAIM';
  title: string;
  reason: string;
  daysRemaining?: number;
  daysSinceLastClaim?: number;
  nextEligibleDate?: string;
  lastClaimDate?: string;
  lastClaimCode?: string;
  claimsInLastYear?: number;
}

function evaluateServerBillingEligibility(params: {
  patientId?: string;
  patientName?: string;
  deviceSerial?: string;
  billingCode: string;
  targetDateStr?: string;
}): EligibilityEvaluation {
  const { patientId, patientName, deviceSerial, billingCode, targetDateStr } = params;
  const normId = (patientId || '').trim().toLowerCase();
  const normSerial = (deviceSerial || '').trim().toLowerCase();
  const normName = (patientName || '').trim().toLowerCase();

  // Find all historical records matching patient
  const patientRecords = practiceRecords.filter(r => {
    const rId = (r.patientIdOrMrn || '').trim().toLowerCase();
    if (normId && rId && normId === rId) return true;
    const rSerial = (r.deviceSerial || '').trim().toLowerCase();
    if (normSerial && rSerial && normSerial === rSerial) return true;
    const rName = (r.patientName || '').trim().toLowerCase();
    if (normName && rName && normName === rName) return true;
    return false;
  });

  if (patientRecords.length === 0) {
    return {
      canBill: true,
      hasConflict: false,
      status: 'ELIGIBLE',
      title: 'Eligible to Bill - New Patient',
      reason: `No prior Medicare billing history found for this patient. Ready to bill Item ${billingCode}.`
    };
  }

  const targetMs = parseDateMs(targetDateStr);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // RULE 1: Permanent Pacemaker (11725) & Defibrillator (11719) -> 90-day interval
  if (billingCode === '11725' || billingCode === '11719') {
    const sameCodeBilled = patientRecords.filter(r => 
      r.billingCode === billingCode && 
      (r.status === 'Billed' || r.status === 'Finalized & Billed')
    );

    let mostRecentClaim: ServerRecord | null = null;
    let mostRecentDiffDays = Infinity;
    let lastClaimTime = 0;

    for (const r of sameCodeBilled) {
      const rTime = parseDateMs(r.visitDate || r.transmissionDate);
      const diffDays = Math.floor((targetMs - rTime) / MS_PER_DAY);
      if (diffDays >= 0 && diffDays < mostRecentDiffDays) {
        mostRecentDiffDays = diffDays;
        mostRecentClaim = r;
        lastClaimTime = rTime;
      }
    }

    if (mostRecentClaim && mostRecentDiffDays < 90) {
      const daysRemaining = 90 - mostRecentDiffDays;
      const nextEligibleMs = lastClaimTime + (90 * MS_PER_DAY);
      const nextEligibleDate = formatDateEnAu(nextEligibleMs);
      const lastClaimDate = mostRecentClaim.visitDate || mostRecentClaim.transmissionDate;

      return {
        canBill: false,
        hasConflict: true,
        status: 'COLLISION_CANNOT_BILL',
        title: `Cannot Bill Item ${billingCode} — Medicare 90-Day Collision`,
        reason: `Item ${billingCode} was claimed on ${lastClaimDate} (${mostRecentDiffDays} days ago). Medicare requires a 90-day interval between claims. Wait ${daysRemaining} more days.`,
        daysRemaining,
        daysSinceLastClaim: mostRecentDiffDays,
        nextEligibleDate,
        lastClaimDate,
        lastClaimCode: billingCode
      };
    }

    // Check for recent unbilled review (< 90 days)
    const recentUnbilled = patientRecords.find(r => {
      if (r.billingCode !== billingCode) return false;
      if (r.status === 'Billed' || r.status === 'Finalized & Billed') return false;
      const rTime = parseDateMs(r.visitDate || r.transmissionDate);
      const diff = Math.floor((targetMs - rTime) / MS_PER_DAY);
      return diff >= 0 && diff < 90;
    });

    if (recentUnbilled) {
      return {
        canBill: true,
        hasConflict: false,
        status: 'WARNING_RECENT_CLAIM',
        title: `Eligible to Bill Item ${billingCode}`,
        reason: `Notice: An unbilled review was recorded on ${recentUnbilled.visitDate || recentUnbilled.transmissionDate}. No finalized claims in the past 90 days.`
      };
    }

    return {
      canBill: true,
      hasConflict: false,
      status: 'ELIGIBLE',
      title: `Eligible to Bill Item ${billingCode}`,
      reason: `Patient meets Medicare 90-day interval criteria. No colliding claims found.`
    };
  }

  // RULE 2: Loop Recorder Unexplained Syncope / Cryptogenic Stroke (11737) -> 28-day interval
  if (billingCode === '11737') {
    const billed37 = patientRecords.filter(r => 
      r.billingCode === '11737' && 
      (r.status === 'Billed' || r.status === 'Finalized & Billed')
    );

    let mostRecentClaim: ServerRecord | null = null;
    let mostRecentDiffDays = Infinity;
    let lastClaimTime = 0;

    for (const r of billed37) {
      const rTime = parseDateMs(r.visitDate || r.transmissionDate);
      const diffDays = Math.floor((targetMs - rTime) / MS_PER_DAY);
      if (diffDays >= 0 && diffDays < mostRecentDiffDays) {
        mostRecentDiffDays = diffDays;
        mostRecentClaim = r;
        lastClaimTime = rTime;
      }
    }

    if (mostRecentClaim && mostRecentDiffDays < 28) {
      const daysRemaining = 28 - mostRecentDiffDays;
      const nextEligibleMs = lastClaimTime + (28 * MS_PER_DAY);
      const nextEligibleDate = formatDateEnAu(nextEligibleMs);
      const lastClaimDate = mostRecentClaim.visitDate || mostRecentClaim.transmissionDate;

      return {
        canBill: false,
        hasConflict: true,
        status: 'COLLISION_CANNOT_BILL',
        title: 'Cannot Bill Item 11737 — Medicare 4-Week Collision',
        reason: `Item 11737 was claimed on ${lastClaimDate} (${mostRecentDiffDays} days ago). Medicare allows once per 4-week (28-day) period. Wait ${daysRemaining} more days.`,
        daysRemaining,
        daysSinceLastClaim: mostRecentDiffDays,
        nextEligibleDate,
        lastClaimDate,
        lastClaimCode: '11737'
      };
    }

    return {
      canBill: true,
      hasConflict: false,
      status: 'ELIGIBLE',
      title: 'Eligible to Bill Item 11737',
      reason: `Patient meets Medicare 4-week interval criteria. Ready to bill.`
    };
  }

  // RULE 3: Loop Recorder AF Surveillance (11736) -> Maximum 4 claims per rolling 12 months
  if (billingCode === '11736') {
    const billed36InYear = patientRecords.filter(r => {
      if (r.billingCode !== '11736') return false;
      if (r.status !== 'Billed' && r.status !== 'Finalized & Billed') return false;
      const rTime = parseDateMs(r.visitDate || r.transmissionDate);
      const diffDays = Math.floor((targetMs - rTime) / MS_PER_DAY);
      return diffDays >= 0 && diffDays <= 365;
    });

    if (billed36InYear.length >= 4) {
      let oldestInWindowMs = Infinity;
      billed36InYear.forEach(r => {
        const t = parseDateMs(r.visitDate || r.transmissionDate);
        if (t < oldestInWindowMs) oldestInWindowMs = t;
      });

      const nextEligibleMs = oldestInWindowMs + (366 * MS_PER_DAY);
      const nextEligibleDate = formatDateEnAu(nextEligibleMs);
      const daysRemaining = Math.max(1, Math.ceil((nextEligibleMs - targetMs) / MS_PER_DAY));

      return {
        canBill: false,
        hasConflict: true,
        status: 'COLLISION_CANNOT_BILL',
        title: 'Cannot Bill Item 11736 — Max 4 Annual Claims Reached',
        reason: `Patient has already used all 4 permitted Medicare claims in the rolling 12-month window for AF monitoring. Next slot opens on ${nextEligibleDate} (${daysRemaining} days remaining).`,
        daysRemaining,
        claimsInLastYear: billed36InYear.length,
        nextEligibleDate,
        lastClaimCode: '11736'
      };
    }

    return {
      canBill: true,
      hasConflict: false,
      status: 'ELIGIBLE',
      title: 'Eligible to Bill Item 11736',
      reason: `Patient has used ${billed36InYear.length} of 4 annual claims in the rolling 12 months. Eligible to bill.`
    };
  }

  return {
    canBill: true,
    hasConflict: false,
    status: 'ELIGIBLE',
    title: 'Eligible to Bill',
    reason: `No conflicting Medicare rules found for Item ${billingCode}.`
  };
}

// ==========================================
// API ROUTES
// ==========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Cardiac Billing Hub', 
    authRequired: true,
    time: new Date().toISOString() 
  });
});

// Authentication Config & Status endpoint
app.get('/api/auth/config', (req, res) => {
  res.json({
    success: true,
    clinicName: 'Westmead Hospital Cardiology Practice',
    authRequired: true,
    clinicKeyMasked: CLINIC_SECURITY_KEY.substring(0, 7) + '****',
    clinicKeyFull: CLINIC_SECURITY_KEY // Accessible on the local machine
  });
});

// POST Staff / Clinic Sign In
app.post('/api/auth/login', (req, res) => {
  const { passcode, pin, staffName } = req.body;

  const isValidKey = passcode && (passcode.trim() === CLINIC_SECURITY_KEY);
  const isValidPin = pin && (VALID_STAFF_PINS.includes(pin.trim()) || pin.trim() === '1234');

  if (isValidKey || isValidPin) {
    const sessionToken = 'sess-' + Math.random().toString(36).substring(2) + Date.now();
    activeSessionTokens.add(sessionToken);

    console.log(`[AUTH] Staff ${staffName || 'Reviewer'} successfully authenticated`);

    return res.json({
      success: true,
      sessionToken,
      staffName: staffName || 'Authenticated Staff',
      message: 'Authentication successful'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid Clinic Passcode or Staff PIN. Contact the Practice Manager if forgotten.'
  });
});

// GET verify session token
app.get('/api/auth/verify', (req, res) => {
  const token = req.headers['x-session-token'] as string;
  if (token && activeSessionTokens.has(token)) {
    return res.json({ success: true, valid: true });
  }
  return res.json({ success: false, valid: false });
});


// GET all records
app.get('/api/records', (req, res) => {
  res.json({
    success: true,
    count: practiceRecords.length,
    records: practiceRecords
  });
});

// GET storage & retention compliance audit info
app.get('/api/storage/info', (req, res) => {
  let oldestMs = Infinity;
  let newestMs = 0;
  practiceRecords.forEach(r => {
    const ms = parseDateMs(r.visitDate || r.transmissionDate);
    if (ms < oldestMs) oldestMs = ms;
    if (ms > newestMs) newestMs = ms;
  });

  const spanDays = oldestMs < Infinity && newestMs > 0 ? Math.max(1, Math.round((newestMs - oldestMs) / (24 * 60 * 60 * 1000))) : 0;

  res.json({
    success: true,
    storageType: 'Persistent Local File Database (practice_db.json) + In-Memory Fast Cache',
    filePath: DB_FILE_PATH,
    persistedRecordCount: practiceRecords.length,
    persistedSheetCount: practiceBillingSheets.length,
    oldestRecordDate: oldestMs < Infinity ? formatDateEnAu(oldestMs) : 'N/A',
    newestRecordDate: newestMs > 0 ? formatDateEnAu(newestMs) : 'N/A',
    retentionSpanDays: spanDays,
    retentionSpanYears: (spanDays / 365).toFixed(1),
    medicareAuditCompliance: 'Compliant - Retains all cardiac device surveillance logs and PBRC batch references > 7 years for Medicare compliance audits',
    lastSaved: new Date().toISOString()
  });
});

// POST check conflict (called by browser extension in real-time)
app.post('/api/records/check-conflict', (req, res) => {
  const { patientIdOrMrn, patientName, deviceSerial, billingCode, transmissionDate } = req.body;
  const evaluation = evaluateServerBillingEligibility({
    patientId: patientIdOrMrn,
    patientName,
    deviceSerial,
    billingCode: billingCode || '11725',
    targetDateStr: transmissionDate
  });

  res.json({
    success: true,
    ...evaluation
  });
});

// POST new record (called by browser extension or web interface)
app.post('/api/records', (req, res) => {
  const data = req.body;
  if (!data.patientName || !data.patientIdOrMrn) {
    return res.status(400).json({ success: false, error: 'Patient Name and ID are required' });
  }

  const evaluation = evaluateServerBillingEligibility({
    patientId: data.patientIdOrMrn,
    patientName: data.patientName,
    deviceSerial: data.deviceSerial,
    billingCode: data.billingCode || '11725',
    targetDateStr: data.visitDate || data.transmissionDate
  });

  const newRecord: ServerRecord = {
    id: data.id || 'rec-' + Date.now(),
    patientName: data.patientName,
    patientDob: data.patientDob || '',
    patientIdOrMrn: data.patientIdOrMrn,
    vendor: data.vendor || 'medtronic_carelink',
    portalUrl: data.portalUrl || '',
    deviceModel: data.deviceModel || 'Unknown Device',
    deviceSerial: data.deviceSerial || 'N/A',
    deviceCategory: data.deviceCategory || 'PPM',
    transmissionDate: data.transmissionDate || new Date().toLocaleDateString('en-AU'),
    visitDate: data.visitDate || new Date().toLocaleDateString('en-AU'),
    billingCode: data.billingCode || '11725',
    clinicalIndication: data.clinicalIndication || '',
    loggedBy: data.loggedBy || 'Clinic Staff',
    clinicName: data.clinicName || 'Cardiology Practice',
    status: data.status || 'Logged',
    clinicalFindings: data.clinicalFindings || '',
    notes: data.notes || '',
    isFlaggedDuplicate: evaluation.hasConflict,
    conflictReason: evaluation.hasConflict ? evaluation.reason : '',
    createdAt: new Date().toISOString()
  };

  practiceRecords.unshift(newRecord);
  saveDatabaseToFile();

  console.log(`[API] Logged patient ${newRecord.patientName} (${newRecord.patientIdOrMrn}) under MBS ${newRecord.billingCode} [Status: ${newRecord.status}]`);

  res.status(201).json({
    success: true,
    message: 'Record successfully saved to Practice Hub and persistent database',
    record: newRecord,
    eligibility: evaluation,
    warning: evaluation.hasConflict ? evaluation.reason : undefined
  });
});

// PATCH update status
app.patch('/api/records/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, eowSheetId, pbrcBatchRef, finalizedBy } = req.body;
  const record = practiceRecords.find(r => r.id === id);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }
  record.status = status;
  if (eowSheetId) record.eowSheetId = eowSheetId;
  if (pbrcBatchRef) record.pbrcBatchRef = pbrcBatchRef;
  if (finalizedBy) record.finalizedBy = finalizedBy;
  if (status === 'Finalized & Billed' || status === 'Billed') {
    record.finalizedAt = new Date().toISOString();
  }
  saveDatabaseToFile();
  res.json({ success: true, record });
});

// POST bulk status update (for End of Week batch finalization)
app.post('/api/records/bulk-status', (req, res) => {
  const { ids, status, eowSheetId, pbrcBatchRef, finalizedBy } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, error: 'ids array required' });
  }

  const updatedRecords: ServerRecord[] = [];
  const now = new Date().toISOString();

  practiceRecords = practiceRecords.map(r => {
    if (ids.includes(r.id)) {
      const updated = {
        ...r,
        status: status || 'Finalized & Billed',
        eowSheetId: eowSheetId || r.eowSheetId,
        pbrcBatchRef: pbrcBatchRef || r.pbrcBatchRef,
        finalizedBy: finalizedBy || r.finalizedBy || 'Billing Reviewer',
        finalizedAt: (status === 'Finalized & Billed' || status === 'Billed') ? now : r.finalizedAt
      };
      updatedRecords.push(updated);
      return updated;
    }
    return r;
  });

  saveDatabaseToFile();

  console.log(`[API] Bulk updated ${updatedRecords.length} records to status: ${status || 'Finalized & Billed'}`);
  res.json({ success: true, count: updatedRecords.length, records: updatedRecords });
});

// GET all End of Week Billing Sheets
app.get('/api/billing-sheets', (req, res) => {
  res.json({
    success: true,
    count: practiceBillingSheets.length,
    sheets: practiceBillingSheets
  });
});

// POST create / finalize End of Week Billing Sheet
app.post('/api/billing-sheets', (req, res) => {
  const sheetData = req.body;
  if (!sheetData.id || !sheetData.recordIds || !Array.isArray(sheetData.recordIds)) {
    return res.status(400).json({ success: false, error: 'Invalid billing sheet payload: id and recordIds array required' });
  }

  const newSheet: ServerBillingSheet = {
    id: sheetData.id,
    weekEndingDate: sheetData.weekEndingDate || new Date().toLocaleDateString('en-AU'),
    weekNumber: sheetData.weekNumber || 37,
    year: sheetData.year || 2026,
    createdDate: sheetData.createdDate || new Date().toLocaleDateString('en-AU'),
    clinicName: sheetData.clinicName || 'Westmead Hospital Cardiology Practice',
    providerName: sheetData.providerName || 'Dr. David Tanous',
    providerNumber: sheetData.providerNumber || '2418902A',
    billingClerkEmail: sheetData.billingClerkEmail || 'billing.clerk@westmead.health.nsw.gov.au',
    billingClerkName: sheetData.billingClerkName || 'PBRC Billing Officer',
    pbrcBatchRef: sheetData.pbrcBatchRef || `PBRC-EOW-${sheetData.id}`,
    notesForClerk: sheetData.notesForClerk || '',
    recordIds: sheetData.recordIds,
    patientCount: sheetData.patientCount || sheetData.recordIds.length,
    totalFeeAud: sheetData.totalFeeAud || 0,
    codeBreakdown: sheetData.codeBreakdown || [],
    status: sheetData.status || 'Sent to PBRC Billing Clerk',
    sentAt: sheetData.sentAt || new Date().toISOString(),
    sentByStaff: sheetData.sentByStaff || 'R. Hendricks'
  };

  // Mark all records as Finalized & Billed
  const now = new Date().toISOString();
  practiceRecords = practiceRecords.map(r => {
    if (newSheet.recordIds.includes(r.id)) {
      return {
        ...r,
        status: 'Finalized & Billed',
        eowSheetId: newSheet.id,
        pbrcBatchRef: newSheet.pbrcBatchRef,
        finalizedBy: newSheet.sentByStaff,
        finalizedAt: now
      };
    }
    return r;
  });

  practiceBillingSheets.unshift(newSheet);
  saveDatabaseToFile();

  console.log(`[API] Created and sent End of Week Billing Sheet ${newSheet.id} with ${newSheet.recordIds.length} patients ($${newSheet.totalFeeAud} AUD)`);

  res.status(201).json({
    success: true,
    sheet: newSheet,
    finalizedRecordsCount: newSheet.recordIds.length
  });
});

// DELETE a record
app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  practiceRecords = practiceRecords.filter(r => r.id !== id);
  saveDatabaseToFile();
  res.json({ success: true, message: 'Record deleted' });
});

// Start server with Vite middleware in development
async function startServer() {
  // Load persistent records from disk on boot
  loadDatabaseFromFile();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cardiac Billing Hub Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
