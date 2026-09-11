export type PortalVendor = 
  | 'biotronik'
  | 'boston_latitude'
  | 'medtronic_carelink'
  | 'abbott_merlin';

export type BillingCode = '11725' | '11719' | '11736' | '11737';

export type LogStatus = 'Logged' | 'Reviewed' | 'Billed' | 'Finalized & Billed';

export interface BillingEligibilityResult {
  canBill: boolean;
  status: 'ELIGIBLE' | 'COLLISION_CANNOT_BILL' | 'WARNING_RECENT_CLAIM';
  title: string;
  reason: string;
  recommendedCode: BillingCode;
  mbsItemFee: number;
  lastClaimDate?: string;
  lastClaimCode?: BillingCode;
  lastClaimStatus?: string;
  daysSinceLastClaim?: number;
  daysRemaining?: number;
  nextEligibleDate?: string;
  claimsInLastYear?: number;
  maxAllowedPerYear?: number;
  historySummary?: string;
  pastClaimsCount?: number;
}

export interface PatientRecord {
  id: string;
  patientName: string;
  patientDob?: string;
  patientIdOrMrn: string;
  medicareCardNumber?: string;
  vendor: PortalVendor;
  portalUrl: string;
  deviceModel: string;
  deviceSerial: string;
  deviceCategory: 'PPM' | 'ICD' | 'CRT-D' | 'CRT-P' | 'ILR/ICM';
  transmissionDate: string;
  visitDate: string;
  billingCode: BillingCode;
  clinicalIndication?: string;
  loggedBy: string;
  clinicName: string;
  status: LogStatus;
  clinicalFindings?: string;
  notes?: string;
  isFlaggedDuplicate?: boolean;
  conflictReason?: string;
  eowSheetId?: string;
  pbrcBatchRef?: string;
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface EndOfWeekBillingSheet {
  id: string;
  weekEndingDate: string; // e.g. "11/09/2026"
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
  codeBreakdown: {
    code: BillingCode;
    count: number;
    subtotalAud: number;
  }[];
  status: 'Draft' | 'Sent to PBRC Billing Clerk';
  sentAt?: string;
  sentByStaff: string;
}

export interface BillingCodeInfo {
  code: BillingCode;
  mbsItem: string;
  deviceType: string;
  indication: string;
  description: string;
  frequencyRule: string;
  maxPerYear?: number;
  intervalDays: number;
  mbsFeeAud: number;
  clinicalKeywords: string[];
}

export interface VendorPortalConfig {
  id: PortalVendor;
  name: string;
  domain: string;
  color: string;
  badgeClass: string;
  logoText: string;
  keySelectors: {
    patientName: string;
    patientId: string;
    dob?: string;
    deviceModel: string;
    serialNumber: string;
    transmissionDate: string;
  };
}

export interface ClinicStaff {
  id: string;
  name: string;
  role: string;
  initials: string;
  pin: string;
}

export interface ClinicSecurityState {
  clinicKey: string;
  isLocked: boolean;
  activeStaff: ClinicStaff;
  autoLockMinutes: number; // e.g. 15 mins, 0 for off
  lastActivity: number;
}

export interface SessionLogEntry {
  id: string;
  patientName: string;
  patientIdOrMrn: string;
  patientDob?: string;
  vendor: PortalVendor;
  deviceModel: string;
  deviceSerial: string;
  billingCode: BillingCode;
  mbsFeeAud: number;
  timestamp: string;
  transmissionDate: string;
  status: 'Synced to Hub' | 'Pending Queue' | 'Local Only';
  recordStatus?: LogStatus;
  clinicalFindings?: string;
  notes?: string;
}


