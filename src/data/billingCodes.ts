import { BillingCode, BillingCodeInfo, PortalVendor, VendorPortalConfig, BillingEligibilityResult, PatientRecord } from '../types';

export const BILLING_CODES: Record<BillingCode, BillingCodeInfo> = {
  '11725': {
    code: '11725',
    mbsItem: 'MBS Item 11725',
    deviceType: 'Permanent Pacemaker (PPM)',
    indication: 'Routine pacemaker surveillance',
    description: 'Ambulatory ECG / remote monitoring review of a permanent pacemaker (single or dual chamber). Review of pacing thresholds, lead impedance, battery status, and rhythm events.',
    frequencyRule: 'Payable once in any 3-month (90-day) period per patient.',
    intervalDays: 90,
    mbsFeeAud: 44.55,
    clinicalKeywords: ['pacemaker', 'ppm', 'azure', 'sensia', 'advisa', 'enpulse', 'assurity', 'endurity', 'evia', 'entrec', 'valitude', 'ingenio', 'w3dr', 'dr', 'sr']
  },
  '11719': {
    code: '11719',
    mbsItem: 'MBS Item 11719',
    deviceType: 'Implantable Defibrillator (ICD / CRT-D)',
    indication: 'Routine defibrillator / tachyarrhythmia surveillance',
    description: 'Remote monitoring review of an implantable cardioverter defibrillator (ICD or CRT-D). Review of ventricular episodes, shocks, antitachycardia pacing (ATP), and lead integrity.',
    frequencyRule: 'Payable once in any 3-month (90-day) period per patient.',
    intervalDays: 90,
    mbsFeeAud: 89.15,
    clinicalKeywords: ['icd', 'defibrillator', 'visia', 'evera', 'cobalt', 'crome', 'gallivant', 'fortify', 'ellipse', 'rivacor', 'acticor', 'vr', 'resonate', 'assura', 'quadra', 'crt-d']
  },
  '11736': {
    code: '11736',
    mbsItem: 'MBS Item 11736',
    deviceType: 'Implantable Loop Recorder / ICM',
    indication: 'Investigation of Atrial Fibrillation (AF)',
    description: 'Ambulatory ECG monitoring via retrieval and analysis of data from an implantable loop recorder (ILR / ICM), specifically for the investigation or management of atrial fibrillation.',
    frequencyRule: 'Payable not more than 4 times in a 12-month period (~every 3 months).',
    maxPerYear: 4,
    intervalDays: 90,
    mbsFeeAud: 35.80,
    clinicalKeywords: ['af', 'atrial fibrillation', 'af burden', 'afib', 'biomonitor', 'linq', 'reveal', 'confirm', 'icm', 'ilr']
  },
  '11737': {
    code: '11737',
    mbsItem: 'MBS Item 11737',
    deviceType: 'Implantable Loop Recorder / ICM',
    indication: 'Cryptogenic Stroke or Recurrent Unexplained Syncope',
    description: 'Ambulatory ECG monitoring via retrieval and analysis of data from an implantable loop recorder (ILR / ICM), specifically for the investigation of cryptogenic stroke or recurrent unexplained syncope.',
    frequencyRule: 'Payable once in any 4-week (28-day) period (~monthly).',
    intervalDays: 28,
    mbsFeeAud: 35.80,
    clinicalKeywords: ['syncope', 'stroke', 'cryptogenic', 'fainting', 'collapse', 'dizziness', 'tia', 'biomonitor', 'linq', 'reveal', 'confirm', 'icm', 'ilr']
  }
};

export const VENDOR_PORTALS: Record<PortalVendor, VendorPortalConfig> = {
  biotronik: {
    id: 'biotronik',
    name: 'Biotronik Home Monitoring',
    domain: 'www.biotronik-homemonitoring.com',
    color: '#0284c7',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    logoText: 'BIOTRONIK HMSC',
    keySelectors: {
      patientName: '#DisplayPatientStatusSummary\\:headerPatientName, #DisplayPatientStatusSummary\\:headerPatientId',
      patientId: '#DisplayPatientStatusSummary\\:headerPatientId',
      dob: '#DisplayPatientStatusSummary\\:headerPatientDateOfBirth',
      deviceModel: '#DisplayPatientStatusSummary\\:headerImplantName',
      serialNumber: '#DisplayPatientStatusSummary\\:headerImplantSN',
      transmissionDate: '#DisplayPatientStatusSummary\\:headerStatusCalculationTimeStamp, .SummaryStatus td.PartitionInfo'
    }
  },
  boston_latitude: {
    id: 'boston_latitude',
    name: 'Boston Scientific LATITUDE NXT',
    domain: 'www.latitudenxt.bostonscientific-international.com.au',
    color: '#00467f',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    logoText: 'LATITUDE™ NXT',
    keySelectors: {
      patientName: '#postage_name',
      patientId: '#postage_patientId',
      dob: '#postage_dob',
      deviceModel: '#postage_device',
      serialNumber: '#postage_device',
      transmissionDate: '#postage_latestSendDate'
    }
  },
  medtronic_carelink: {
    id: 'medtronic_carelink',
    name: 'Medtronic CareLink Network',
    domain: 'global.medtroniccarelink.net',
    color: '#140f4b',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    logoText: 'CareLink™ Network',
    keySelectors: {
      patientName: '.patient-card__patient-name strong, .vt-patient-full-name-link',
      patientId: '.vt-patient-id-in-clinic',
      dob: '.vt-patient-date-of-birth',
      deviceModel: '.vt-patient-card-device-brand-name, #WebHeaderTable_bRow_0_cell_0',
      serialNumber: '#WebHeaderTable_bRow_0_cell_1',
      transmissionDate: '#WebHeaderTable_bRow_0_cell_2'
    }
  },
  abbott_merlin: {
    id: 'abbott_merlin',
    name: 'Abbott Merlin.net PCN',
    domain: 'www.merlin.net',
    color: '#004f71',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
    logoText: 'Merlin.net™ PCN',
    keySelectors: {
      patientName: '#pb-PatientName span',
      patientId: '#pb-PatientId span:first-child',
      deviceModel: '#pb-PatientId span:nth-of-type(2)',
      serialNumber: '#pb-PatientId',
      transmissionDate: '#pb-PatientName'
    }
  }
};

/**
 * Predicts the appropriate MBS Billing Code based on device model and clinical context:
 * - 11736: ILR / ICM for investigation of Atrial Fibrillation (max 4 per 12 months)
 * - 11737: ILR / ICM for Cryptogenic Stroke or Recurrent Unexplained Syncope (max once per 4 weeks)
 * - 11719: Defibrillator (ICD / CRT-D)
 * - 11725: Pacemaker (PPM)
 */
export function recommendBillingCode(deviceModelStr: string, clinicalContextStr: string = ''): BillingCode {
  const dev = (deviceModelStr || '').toLowerCase();
  const context = (clinicalContextStr || '').toLowerCase();
  const combined = `${dev} ${context}`;

  // Check if Loop Recorder / ICM
  const isIlr = dev.includes('biomonitor') || 
                dev.includes('linq') || 
                dev.includes('reveal') || 
                dev.includes('confirm') || 
                dev.includes('loop') || 
                dev.includes('icm') || 
                dev.includes('ilr');

  if (isIlr) {
    // Distinguish between 11737 (Syncope / Stroke) vs 11736 (AF investigation)
    if (combined.includes('stroke') || combined.includes('syncope') || combined.includes('cryptogenic') || combined.includes('collapse') || combined.includes('faint') || combined.includes('tia')) {
      return '11737';
    }
    // Default ILR for AF or general monitoring:
    return '11736';
  }

  // Check Defibrillators (ICD, CRT-D, VR, Resonate, Assura, Fortify, Cobalt)
  if (dev.includes('icd') || dev.includes('defibrillator') || dev.includes('crt-d') || dev.includes('vr') || dev.includes('resonate') || dev.includes('assura') || dev.includes('cobalt') || dev.includes('evera')) {
    return '11719';
  }

  // Default to Pacemaker (PPM / CRT-P)
  return '11725';
}

/**
 * Robust date parser supporting Australian format (DD/MM/YYYY), ISO (YYYY-MM-DD),
 * and standard textual formats (e.g. 21 Dec 1965) spanning multiple years (>1-7 years).
 */
export function parseDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  
  // Format DD/MM/YYYY or D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2].slice(0, 4), 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Textual date parsing (e.g., "09 Sept 2026", "14-Feb-1985")
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return 0;
}

/**
 * Format timestamp into standard Australian DD/MM/YYYY
 */
export function formatDateEnAu(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface EligibilityParams {
  patientIdOrMrn: string;
  patientName?: string;
  deviceSerial?: string;
  billingCode: BillingCode;
  records: PatientRecord[];
  currentRecordId?: string;
  targetDateStr?: string;
}

/**
 * Real-time Australian Medicare (MBS) Billing Collision & Eligibility Engine
 * Evaluates patient history across multiple years (>1-7 years) against MBS frequency rules:
 * - 11725: Once in any 90-day period
 * - 11719: Once in any 90-day period
 * - 11736: Max 4 claims in rolling 12-month (365-day) period
 * - 11737: Once in any 4-week (28-day) period
 */
export function evaluateBillingEligibility(params: EligibilityParams): BillingEligibilityResult {
  const {
    patientIdOrMrn,
    patientName,
    deviceSerial,
    billingCode,
    records,
    currentRecordId,
    targetDateStr
  } = params;

  const mbsFee = BILLING_CODES[billingCode]?.mbsFeeAud || 0;
  const targetTime = targetDateStr ? parseDateMs(targetDateStr) : Date.now();

  const normId = (patientIdOrMrn || '').trim().toLowerCase();
  const normName = (patientName || '').trim().toLowerCase();
  const normSerial = (deviceSerial || '').trim().toLowerCase();

  // If no identifying patient info is provided yet
  if (!normId && !normName && !normSerial) {
    return {
      canBill: true,
      status: 'ELIGIBLE',
      title: 'Ready for Patient Telemetry',
      reason: 'No patient selected yet. Load or enter patient details to evaluate Medicare billing status.',
      recommendedCode: billingCode,
      mbsItemFee: mbsFee
    };
  }

  // Find all historical records matching this patient across multi-year history
  const patientHistory = records.filter(r => {
    if (currentRecordId && r.id === currentRecordId) return false;
    
    const idMatch = normId && r.patientIdOrMrn && r.patientIdOrMrn.trim().toLowerCase() === normId;
    const nameMatch = normName && r.patientName && r.patientName.trim().toLowerCase() === normName;
    const serialMatch = normSerial && r.deviceSerial && r.deviceSerial.trim().toLowerCase() === normSerial;

    return Boolean(idMatch || nameMatch || serialMatch);
  });

  // Sort history newest to oldest
  const sortedHistory = [...patientHistory].sort((a, b) => {
    const timeA = parseDateMs(a.visitDate || a.transmissionDate);
    const timeB = parseDateMs(b.visitDate || b.transmissionDate);
    return timeB - timeA;
  });

  // Filter prior records that were actually processed or marked as billed
  const billedHistory = sortedHistory.filter(r => 
    r.status === 'Billed' || r.status === 'Finalized & Billed'
  );

  // -------------------------------------------------------------
  // RULE 1: Item 11737 - ILR (Stroke/Syncope) - Max once per 28 days
  // -------------------------------------------------------------
  if (billingCode === '11737') {
    const prior37Billed = billedHistory.find(r => r.billingCode === '11737');
    if (prior37Billed) {
      const claimTime = parseDateMs(prior37Billed.visitDate || prior37Billed.transmissionDate);
      const diffDays = Math.max(0, Math.floor((targetTime - claimTime) / (1000 * 60 * 60 * 24)));

      if (diffDays < 28) {
        const daysRemaining = 28 - diffDays;
        const nextEligible = new Date(claimTime + 28 * 24 * 60 * 60 * 1000);
        const nextDateStr = formatDateEnAu(nextEligible);

        return {
          canBill: false,
          status: 'COLLISION_CANNOT_BILL',
          title: 'CANNOT BILL — MBS 28-Day Collision',
          reason: `Item 11737 was already billed on ${prior37Billed.visitDate} (${diffDays} days ago). Medicare allows 1 claim per 4-week (28-day) period. You must wait ${daysRemaining} more days.`,
          recommendedCode: billingCode,
          mbsItemFee: mbsFee,
          lastClaimDate: prior37Billed.visitDate,
          lastClaimCode: '11737',
          lastClaimStatus: prior37Billed.status,
          daysSinceLastClaim: diffDays,
          daysRemaining,
          nextEligibleDate: nextDateStr,
          historySummary: `Previously billed on ${prior37Billed.visitDate} (${diffDays}d ago)`
        };
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 2: Item 11736 - ILR (AF Investigation) - Max 4 per 12 months
  // -------------------------------------------------------------
  if (billingCode === '11736') {
    const claimsLast12Months = billedHistory.filter(r => {
      if (r.billingCode !== '11736') return false;
      const claimTime = parseDateMs(r.visitDate || r.transmissionDate);
      const diffDays = Math.floor((targetTime - claimTime) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 365;
    });

    const recent36 = claimsLast12Months[0];
    const daysSinceRecent = recent36 
      ? Math.max(0, Math.floor((targetTime - parseDateMs(recent36.visitDate || recent36.transmissionDate)) / (1000 * 60 * 60 * 24)))
      : undefined;

    if (claimsLast12Months.length >= 4) {
      // Find oldest of the 4 claims to see when the next slot opens
      const oldestClaimTime = parseDateMs(claimsLast12Months[claimsLast12Months.length - 1].visitDate);
      const nextEligible = new Date(oldestClaimTime + 366 * 24 * 60 * 60 * 1000);
      const nextDateStr = formatDateEnAu(nextEligible);

      return {
        canBill: false,
        status: 'COLLISION_CANNOT_BILL',
        title: 'CANNOT BILL — Annual 4-Claim Cap Reached',
        reason: `Item 11736 annual limit reached: Patient has already claimed 4 times in the past 12 months for AF monitoring. Next eligible claim opens on ${nextDateStr}.`,
        recommendedCode: billingCode,
        mbsItemFee: mbsFee,
        lastClaimDate: recent36?.visitDate,
        lastClaimCode: '11736',
        lastClaimStatus: recent36?.status,
        daysSinceLastClaim: daysSinceRecent,
        claimsInLastYear: claimsLast12Months.length,
        maxAllowedPerYear: 4,
        nextEligibleDate: nextDateStr,
        historySummary: `4 of 4 annual claims used in rolling 12 months`
      };
    }
  }

  // -------------------------------------------------------------
  // RULE 3: Item 11725 (PPM) & 11719 (ICD) - Max once per 90 days
  // -------------------------------------------------------------
  if (billingCode === '11725' || billingCode === '11719') {
    const priorSameBilled = billedHistory.find(r => r.billingCode === billingCode);
    if (priorSameBilled) {
      const claimTime = parseDateMs(priorSameBilled.visitDate || priorSameBilled.transmissionDate);
      const diffDays = Math.max(0, Math.floor((targetTime - claimTime) / (1000 * 60 * 60 * 24)));

      if (diffDays < 90) {
        const daysRemaining = 90 - diffDays;
        const nextEligible = new Date(claimTime + 90 * 24 * 60 * 60 * 1000);
        const nextDateStr = formatDateEnAu(nextEligible);

        return {
          canBill: false,
          status: 'COLLISION_CANNOT_BILL',
          title: `CANNOT BILL — MBS 90-Day Collision (Item ${billingCode})`,
          reason: `Item ${billingCode} was already claimed on ${priorSameBilled.visitDate} (${diffDays} days ago by ${priorSameBilled.loggedBy}). Medicare allows once in any 90-day period. Must wait ${daysRemaining} more days.`,
          recommendedCode: billingCode,
          mbsItemFee: mbsFee,
          lastClaimDate: priorSameBilled.visitDate,
          lastClaimCode: billingCode,
          lastClaimStatus: priorSameBilled.status,
          daysSinceLastClaim: diffDays,
          daysRemaining,
          nextEligibleDate: nextDateStr,
          historySummary: `Billed on ${priorSameBilled.visitDate} (${diffDays}d ago, ${daysRemaining}d remaining)`
        };
      }
    }
  }

  // -------------------------------------------------------------
  // CHECK FOR UNBILLED / PENDING RECENT TRANSMISSIONS (Logged / Reviewed)
  // -------------------------------------------------------------
  const unbilledRecent = sortedHistory.find(r => {
    if (r.status === 'Billed' || r.status === 'Finalized & Billed') return false;
    const claimTime = parseDateMs(r.visitDate || r.transmissionDate);
    const diffDays = Math.max(0, Math.floor((targetTime - claimTime) / (1000 * 60 * 60 * 24)));
    return diffDays <= 30; // within last 30 days
  });

  const lastAnyBilled = billedHistory[0];
  const daysSinceAny = lastAnyBilled 
    ? Math.max(0, Math.floor((targetTime - parseDateMs(lastAnyBilled.visitDate || lastAnyBilled.transmissionDate)) / (1000 * 60 * 60 * 24)))
    : undefined;

  let historySummary = 'No previous Medicare billing records found';
  if (lastAnyBilled) {
    historySummary = `Last billed on ${lastAnyBilled.visitDate} (${daysSinceAny} days ago, Item ${lastAnyBilled.billingCode})`;
  }

  if (unbilledRecent) {
    const unbilledTime = parseDateMs(unbilledRecent.visitDate || unbilledRecent.transmissionDate);
    const diffDays = Math.max(0, Math.floor((targetTime - unbilledTime) / (1000 * 60 * 60 * 24)));
    return {
      canBill: true,
      status: 'WARNING_RECENT_CLAIM',
      title: 'ELIGIBLE TO BILL (Recent Unbilled Review Noted)',
      reason: `Patient is eligible to bill under Medicare rules. Note: An unbilled transmission was logged on ${unbilledRecent.visitDate} (${diffDays} days ago, status: "${unbilledRecent.status}").`,
      recommendedCode: billingCode,
      mbsItemFee: mbsFee,
      lastClaimDate: lastAnyBilled?.visitDate,
      lastClaimCode: lastAnyBilled?.billingCode,
      lastClaimStatus: unbilledRecent.status,
      daysSinceLastClaim: daysSinceAny,
      historySummary
    };
  }

  // -------------------------------------------------------------
  // ALL CHECKS PASSED: FULLY ELIGIBLE TO BILL
  // -------------------------------------------------------------
  let eligibleReason = `Compliant with Medicare frequency rules. Ready to claim MBS Item ${billingCode} ($${mbsFee.toFixed(2)} AUD).`;
  if (lastAnyBilled && daysSinceAny !== undefined) {
    eligibleReason = `Eligible to bill. Last billed ${daysSinceAny} days ago on ${lastAnyBilled.visitDate} (Medicare exclusion window passed).`;
  }

  return {
    canBill: true,
    status: 'ELIGIBLE',
    title: 'ELIGIBLE TO BILL (No Medicare Collision)',
    reason: eligibleReason,
    recommendedCode: billingCode,
    mbsItemFee: mbsFee,
    lastClaimDate: lastAnyBilled?.visitDate,
    lastClaimCode: lastAnyBilled?.billingCode,
    lastClaimStatus: lastAnyBilled?.status,
    daysSinceLastClaim: daysSinceAny,
    historySummary,
    pastClaimsCount: billedHistory.length
  };
}
