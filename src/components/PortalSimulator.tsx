import React, { useState, useMemo } from 'react';
import { 
  PortalVendor, 
  BillingCode, 
  PatientRecord,
  SessionLogEntry,
  LogStatus
} from '../types';
import { 
  BILLING_CODES, 
  VENDOR_PORTALS, 
  recommendBillingCode,
  evaluateBillingEligibility
} from '../data/billingCodes';
import { 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Mail, 
  Save, 
  AlertCircle,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Activity,
  Calendar,
  User,
  HeartPulse,
  PanelRightOpen,
  PanelRightClose,
  Download,
  Trash2,
  Check,
  Smartphone,
  Laptop,
  Wifi,
  RefreshCw,
  Zap,
  ArrowRight,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Ban
} from 'lucide-react';

interface PortalSimulatorProps {
  onSaveRecord: (record: PatientRecord) => void;
  onDraftOutlook: (record: PatientRecord) => void;
  records?: PatientRecord[];
  onUpdateStatus?: (id: string, status: LogStatus) => void;
}

interface SimulatedPatient {
  id: string;
  patientName: string;
  patientDob: string;
  patientId: string;
  deviceModel: string;
  deviceSerial: string;
  deviceCategory: PatientRecord['deviceCategory'];
  transmissionDate: string;
  clinic: string;
  sampleFindings: string;
  htmlSnippets: { selector: string; value: string }[];
}

export const PortalSimulator: React.FC<PortalSimulatorProps> = ({
  onSaveRecord,
  onDraftOutlook,
  records = [],
  onUpdateStatus
}) => {
  const [activeVendor, setActiveVendor] = useState<PortalVendor>('biotronik');
  const [activePatientIndex, setActivePatientIndex] = useState<number>(0);
  const [isExtracted, setIsExtracted] = useState<boolean>(true);
  const [overrideCode, setOverrideCode] = useState<BillingCode>('11736');
  const [technicianNotes, setTechnicianNotes] = useState<string>('HM follow-up transmission arrived on 9 Sept 2026, 02:06:27. Scheduled 3-monthly review. No AF episodes.');
  const [recordStatus, setRecordStatus] = useState<LogStatus>('Reviewed');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Auto-sync on page navigation state
  const [autoSyncOnNav, setAutoSyncOnNav] = useState<boolean>(true);
  const [autoSyncToast, setAutoSyncToast] = useState<string | null>('⚡ Auto-synced to Rea, Mark (Active Tab)');
  const [pendingPatientNotice, setPendingPatientNotice] = useState<SimulatedPatient | null>(null);

  // Dockable Side Panel state & Tab navigation
  const [isDocked, setIsDocked] = useState<boolean>(true);
  const [activeExtensionTab, setActiveExtensionTab] = useState<'capture' | 'session'>('capture');
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [copiedSessionRowId, setCopiedSessionRowId] = useState<string | null>(null);
  const [copiedAllSession, setCopiedAllSession] = useState<boolean>(false);

  // Multi-patient mock database for all 4 vendor portals
  const portalMockData: Record<PortalVendor, SimulatedPatient[]> = {
    biotronik: [
      {
        id: 'bio-1',
        patientName: 'Rea, Mark',
        patientDob: '21 Dec 1965',
        patientId: '2c9881db9c4cabbd01',
        deviceModel: 'BIOMONITOR IIIm',
        deviceSerial: '95091157',
        deviceCategory: 'ILR/ICM',
        transmissionDate: '09/09/2026',
        clinic: 'Westmead Cardiology HMSC',
        sampleFindings: 'HM follow-up transmission arrived on 9 Sept 2026, 02:06:27. Scheduled 3-monthly review. No AF episodes.',
        htmlSnippets: [
          { selector: '#DisplayPatientStatusSummary:headerPatientName', value: 'Mr Mark Rea' },
          { selector: '#DisplayPatientStatusSummary:headerPatientDateOfBirth', value: '21 Dec 1965' },
          { selector: '#DisplayPatientStatusSummary:headerImplantName', value: 'BIOMONITOR IIIm' },
          { selector: '#DisplayPatientStatusSummary:headerImplantSN', value: '95091157' }
        ]
      },
      {
        id: 'bio-2',
        patientName: 'Higgins, Dorothy',
        patientDob: '14 May 1948',
        patientId: '2c9881db9e12ff91a0',
        deviceModel: 'Edora 8 DR-T',
        deviceSerial: '68102341',
        deviceCategory: 'PPM',
        transmissionDate: '08/09/2026',
        clinic: 'Westmead Cardiology HMSC',
        sampleFindings: 'PPM routine review. VP 2.1%, AP 45.3%. Battery impedance stable (2.8V, >7.5 yrs). Thresholds 0.6V@0.4ms.',
        htmlSnippets: [
          { selector: '#DisplayPatientStatusSummary:headerPatientName', value: 'Mrs Dorothy Higgins' },
          { selector: '#DisplayPatientStatusSummary:headerPatientDateOfBirth', value: '14 May 1948' },
          { selector: '#DisplayPatientStatusSummary:headerImplantName', value: 'Edora 8 DR-T' },
          { selector: '#DisplayPatientStatusSummary:headerImplantSN', value: '68102341' }
        ]
      },
      {
        id: 'bio-3',
        patientName: 'Stewart, Colin',
        patientDob: '03 Aug 1954',
        patientId: '2c9881db9f45cc23e4',
        deviceModel: 'Rivacor 7 HF-T QP',
        deviceSerial: '79224810',
        deviceCategory: 'CRT-D',
        transmissionDate: '05/09/2026',
        clinic: 'Westmead Cardiology HMSC',
        sampleFindings: 'CRT-D surveillance. BiV pacing 98.4%. No VF/VT therapy or ATP delivered. Thoracic fluid index below threshold.',
        htmlSnippets: [
          { selector: '#DisplayPatientStatusSummary:headerPatientName', value: 'Mr Colin Stewart' },
          { selector: '#DisplayPatientStatusSummary:headerPatientDateOfBirth', value: '03 Aug 1954' },
          { selector: '#DisplayPatientStatusSummary:headerImplantName', value: 'Rivacor 7 HF-T QP' },
          { selector: '#DisplayPatientStatusSummary:headerImplantSN', value: '79224810' }
        ]
      }
    ],
    boston_latitude: [
      {
        id: 'lat-1',
        patientName: 'Jeremic, Stanka',
        patientDob: '02 Apr 1947',
        patientId: '5585807',
        deviceModel: 'G447 RESONATE X4 CRT-D',
        deviceSerial: '329199',
        deviceCategory: 'CRT-D',
        transmissionDate: '07/09/2026',
        clinic: 'Westmead Hospital Cardiac Unit',
        sampleFindings: 'AT/AF burden 1%, 175 events. Biventricular pacing 99%. HeartLogic index 1. Battery 9 years remaining.',
        htmlSnippets: [
          { selector: '#postage_name', value: 'Jeremic, Stanka' },
          { selector: '#postage_patientId', value: '5585807' },
          { selector: '#postage_device', value: 'G447 RESONATE X4 CRT-D/329199' },
          { selector: '#postage_dob', value: '02 Apr 1947' },
          { selector: '#postage_latestSendDate', value: '07 Sep 2026 02:22 AEST' }
        ]
      },
      {
        id: 'lat-2',
        patientName: 'Zhao, William',
        patientDob: '19 Jan 1961',
        patientId: '5590124',
        deviceModel: 'U128 ACCOLADE MRI EL',
        deviceSerial: '840192',
        deviceCategory: 'PPM',
        transmissionDate: '06/09/2026',
        clinic: 'Westmead Hospital Cardiac Unit',
        sampleFindings: 'Dual chamber PPM follow-up. AP 12%, VP 88%. Lead capture verified. Battery RRT >10 yrs.',
        htmlSnippets: [
          { selector: '#postage_name', value: 'Zhao, William' },
          { selector: '#postage_patientId', value: '5590124' },
          { selector: '#postage_device', value: 'U128 ACCOLADE MRI EL/840192' },
          { selector: '#postage_dob', value: '19 Jan 1961' },
          { selector: '#postage_latestSendDate', value: '06 Sep 2026 04:10 AEST' }
        ]
      },
      {
        id: 'lat-3',
        patientName: 'Kowalski, Anna',
        patientDob: '30 Oct 1973',
        patientId: '5602811',
        deviceModel: 'LUX-Dx ICM',
        deviceSerial: '109823',
        deviceCategory: 'ILR/ICM',
        transmissionDate: '08/09/2026',
        clinic: 'Westmead Hospital Cardiac Unit',
        sampleFindings: 'Cryptogenic stroke workup. Rhythm check confirms sinus rhythm. Zero pauses or AF detected past 30 days.',
        htmlSnippets: [
          { selector: '#postage_name', value: 'Kowalski, Anna' },
          { selector: '#postage_patientId', value: '5602811' },
          { selector: '#postage_device', value: 'LUX-Dx ICM/109823' },
          { selector: '#postage_dob', value: '30 Oct 1973' },
          { selector: '#postage_latestSendDate', value: '08 Sep 2026 01:45 AEST' }
        ]
      }
    ],
    medtronic_carelink: [
      {
        id: 'med-1',
        patientName: 'LATTOUF, TERESA',
        patientDob: '14-Feb-1985',
        patientId: '1002937122',
        deviceModel: 'Azure™ S DR MRI W3DR01',
        deviceSerial: 'RNJ157637G',
        deviceCategory: 'PPM',
        transmissionDate: '09/09/2026',
        clinic: 'Westmead Hospital - Cardiology',
        sampleFindings: 'VP 100%, AP <0.1%. Mode: AAI<=>DDD (MVP). Battery: 11.0 years remaining. Zero VT/ATAF episodes.',
        htmlSnippets: [
          { selector: '.patient-card__patient-name strong', value: 'LATTOUF, TERESA' },
          { selector: '.vt-patient-id-in-clinic', value: 'ID: 1002937122' },
          { selector: '.vt-patient-date-of-birth', value: '14-Feb-1985 (41 yrs)' },
          { selector: '#WebHeaderTable_bRow_0_cell_0', value: 'Device: Azure™ S DR MRI W3DR01' },
          { selector: '#WebHeaderTable_bRow_0_cell_1', value: 'Serial Number: RNJ157637G' }
        ]
      },
      {
        id: 'med-2',
        patientName: 'KATSAROS, GEORGE',
        patientDob: '28-Sep-1952',
        patientId: '1003482910',
        deviceModel: 'Cobalt™ XT HF Quad CRT-D',
        deviceSerial: 'BLP901234H',
        deviceCategory: 'CRT-D',
        transmissionDate: '08/09/2026',
        clinic: 'Westmead Hospital - Cardiology',
        sampleFindings: 'CRT-D OptiVol fluid status stable. BiV pacing 99.4%. Shock impedance 42 ohms. Battery >8.2 yrs.',
        htmlSnippets: [
          { selector: '.patient-card__patient-name strong', value: 'KATSAROS, GEORGE' },
          { selector: '.vt-patient-id-in-clinic', value: 'ID: 1003482910' },
          { selector: '.vt-patient-date-of-birth', value: '28-Sep-1952 (74 yrs)' },
          { selector: '#WebHeaderTable_bRow_0_cell_0', value: 'Device: Cobalt™ XT HF Quad CRT-D' },
          { selector: '#WebHeaderTable_bRow_0_cell_1', value: 'Serial Number: BLP901234H' }
        ]
      },
      {
        id: 'med-3',
        patientName: 'NICHOLSON, PAMELA',
        patientDob: '09-Jul-1968',
        patientId: '1004192083',
        deviceModel: 'LINQ II™ ICM',
        deviceSerial: 'RNL819203',
        deviceCategory: 'ILR/ICM',
        transmissionDate: '07/09/2026',
        clinic: 'Westmead Hospital - Cardiology',
        sampleFindings: 'AF surveillance. 2 brief paroxysmal AF episodes noted on 4 Sept (longest 14 mins). Mean vent rate 84 bpm.',
        htmlSnippets: [
          { selector: '.patient-card__patient-name strong', value: 'NICHOLSON, PAMELA' },
          { selector: '.vt-patient-id-in-clinic', value: 'ID: 1004192083' },
          { selector: '.vt-patient-date-of-birth', value: '09-Jul-1968 (58 yrs)' },
          { selector: '#WebHeaderTable_bRow_0_cell_0', value: 'Device: LINQ II™ ICM' },
          { selector: '#WebHeaderTable_bRow_0_cell_1', value: 'Serial Number: RNL819203' }
        ]
      }
    ],
    abbott_merlin: [
      {
        id: 'abb-1',
        patientName: 'Ali, Ashad',
        patientDob: '19-Nov-1958',
        patientId: '51050728',
        deviceModel: 'Quadra Assura MP™ 3371-40',
        deviceSerial: 'QAM3371-9982',
        deviceCategory: 'CRT-D',
        transmissionDate: '31/08/2026',
        clinic: 'Westmead Cardiology EP Clinic',
        sampleFindings: 'FastPath Summary verified. Multipoint BiV Pacing >98%. No shock events or fast VT episodes.',
        htmlSnippets: [
          { selector: '#pb-PatientName span', value: 'Ali Ashad' },
          { selector: '#pb-PatientId span:first-child', value: 'Patient ID: 51050728' },
          { selector: '#pb-PatientId span:nth-of-type(2)', value: 'Quadra Assura MP™, 3371-40' },
          { selector: '#pb-PatientName (parent)', value: 'Transmission Date : 31-08-2026 03:11' }
        ]
      },
      {
        id: 'abb-2',
        patientName: 'Chen, Margaret',
        patientDob: '11-Dec-1963',
        patientId: '51089201',
        deviceModel: 'Confirm Rx™ ICM DM3500',
        deviceSerial: 'CRX88192',
        deviceCategory: 'ILR/ICM',
        transmissionDate: '06/09/2026',
        clinic: 'Westmead Cardiology EP Clinic',
        sampleFindings: 'Loop recorder transmission. Regular sinus rhythm recorded. No high rate atrial episodes. Good R-wave sensing (0.8mV).',
        htmlSnippets: [
          { selector: '#pb-PatientName span', value: 'Chen Margaret' },
          { selector: '#pb-PatientId span:first-child', value: 'Patient ID: 51089201' },
          { selector: '#pb-PatientId span:nth-of-type(2)', value: 'Confirm Rx™ ICM, DM3500' },
          { selector: '#pb-PatientName (parent)', value: 'Transmission Date : 06-09-2026 02:40' }
        ]
      },
      {
        id: 'abb-3',
        patientName: "O'Connor, Patrick",
        patientDob: '05-Mar-1945',
        patientId: '51104822',
        deviceModel: 'Endurity™ Core DR PM2172',
        deviceSerial: 'END91024',
        deviceCategory: 'PPM',
        transmissionDate: '04/09/2026',
        clinic: 'Westmead Cardiology EP Clinic',
        sampleFindings: 'DDD pacemaker review. Ventricular pacing 6.2%, atrial pacing 58%. Lead impedance within standard limits. Battery OK.',
        htmlSnippets: [
          { selector: '#pb-PatientName span', value: "O'Connor Patrick" },
          { selector: '#pb-PatientId span:first-child', value: 'Patient ID: 51104822' },
          { selector: '#pb-PatientId span:nth-of-type(2)', value: 'Endurity™ Core DR, PM2172' },
          { selector: '#pb-PatientName (parent)', value: 'Transmission Date : 04-09-2026 04:12' }
        ]
      }
    ]
  };

  // The patient currently being viewed on the webpage
  const activeWebpagePatient = portalMockData[activeVendor][activePatientIndex];

  // The patient currently loaded in the extension form
  const [formPatient, setFormPatient] = useState<SimulatedPatient>(portalMockData.biotronik[0]);

  // Live session log state pre-populated with earlier session transmissions
  const [sessionLog, setSessionLog] = useState<SessionLogEntry[]>([
    {
      id: 'session-prev-1',
      patientName: 'Rea, Mark',
      patientIdOrMrn: '2c9881db9c4cabbd01',
      patientDob: '21 Dec 1965',
      vendor: 'biotronik',
      deviceModel: 'BIOMONITOR IIIm',
      deviceSerial: '95091157',
      billingCode: '11736',
      mbsFeeAud: 35.80,
      timestamp: '09:15 AM',
      transmissionDate: '09/09/2026',
      status: 'Synced to Hub',
      clinicalFindings: 'Scheduled HM review. AF burden 0.2%. Battery normal.',
      notes: 'Logged to practice central server via travel bridge'
    },
    {
      id: 'session-prev-2',
      patientName: 'Ali, Ashad',
      patientIdOrMrn: '51050728',
      patientDob: '19-Nov-1958',
      vendor: 'abbott_merlin',
      deviceModel: 'Quadra Assura MP™ 3371-40',
      deviceSerial: 'QAM3371-9982',
      billingCode: '11719',
      mbsFeeAud: 89.15,
      timestamp: '09:42 AM',
      transmissionDate: '31/08/2026',
      status: 'Synced to Hub',
      clinicalFindings: 'BiV pacing 99.1%. No shock events or fast VT episodes.',
      notes: 'Reviewed and logged.'
    }
  ]);

  // Real-time Medicare collision & billing eligibility check for active form patient
  const eligibility = useMemo(() => {
    return evaluateBillingEligibility({
      patientIdOrMrn: formPatient.patientId,
      patientName: formPatient.patientName,
      deviceSerial: formPatient.deviceSerial,
      billingCode: overrideCode,
      records: records,
      targetDateStr: formPatient.transmissionDate
    });
  }, [formPatient, overrideCode, records]);

  // Handle navigating to another patient or another portal vendor
  const handleNavigatePortal = (vendor: PortalVendor, patientIdx: number = 0) => {
    setActiveVendor(vendor);
    setActivePatientIndex(patientIdx);
    const targetPatient = portalMockData[vendor][patientIdx];

    if (autoSyncOnNav) {
      // Auto-update extension side panel seamlessly
      setFormPatient(targetPatient);
      setOverrideCode(recommendBillingCode(targetPatient.deviceModel));
      setTechnicianNotes(targetPatient.sampleFindings);
      setIsExtracted(true);
      setPendingPatientNotice(null);
      setAutoSyncToast(`⚡ Auto-synced to ${targetPatient.patientName} (Active Page)`);
      setTimeout(() => setAutoSyncToast(null), 3500);
    } else {
      // Auto-sync is disabled: keep previous patient in form, but show notification banner!
      if (formPatient.patientId !== targetPatient.patientId) {
        setPendingPatientNotice(targetPatient);
      }
    }
  };

  // Re-scan or force load active page
  const handleForceRescan = () => {
    setFormPatient(activeWebpagePatient);
    setOverrideCode(recommendBillingCode(activeWebpagePatient.deviceModel));
    setTechnicianNotes(activeWebpagePatient.sampleFindings);
    setIsExtracted(true);
    setPendingPatientNotice(null);
    setAutoSyncToast(`🔄 Scanned & loaded ${activeWebpagePatient.patientName}`);
    setTimeout(() => setAutoSyncToast(null), 3000);
  };

  // Load telemetry from notification banner
  const handleAcceptDetectedPatient = () => {
    if (pendingPatientNotice) {
      setFormPatient(pendingPatientNotice);
      setOverrideCode(recommendBillingCode(pendingPatientNotice.deviceModel));
      setTechnicianNotes(pendingPatientNotice.sampleFindings);
      setIsExtracted(true);
      setAutoSyncToast(`⚡ Loaded telemetry for ${pendingPatientNotice.patientName}`);
      setTimeout(() => setAutoSyncToast(null), 3000);
      setPendingPatientNotice(null);
    }
  };

  const handleSave = () => {
    const record: PatientRecord = {
      id: 'rec-' + Date.now(),
      patientName: formPatient.patientName,
      patientDob: formPatient.patientDob,
      patientIdOrMrn: formPatient.patientId,
      vendor: activeVendor,
      portalUrl: `https://${VENDOR_PORTALS[activeVendor].domain}`,
      deviceModel: formPatient.deviceModel,
      deviceSerial: formPatient.deviceSerial,
      deviceCategory: formPatient.deviceCategory,
      transmissionDate: formPatient.transmissionDate,
      visitDate: new Date().toLocaleDateString('en-AU'),
      billingCode: overrideCode,
      loggedBy: 'R. Hendricks',
      clinicName: formPatient.clinic,
      status: recordStatus,
      clinicalFindings: technicianNotes || formPatient.sampleFindings,
      notes: 'Captured via Chrome/Edge Extension simulator',
      isFlaggedDuplicate: !eligibility.canBill,
      conflictReason: !eligibility.canBill ? eligibility.reason : undefined
    };

    onSaveRecord(record);

    const newSessionEntry: SessionLogEntry = {
      id: record.id,
      patientName: record.patientName,
      patientIdOrMrn: record.patientIdOrMrn,
      patientDob: record.patientDob,
      vendor: record.vendor,
      deviceModel: record.deviceModel,
      deviceSerial: record.deviceSerial,
      billingCode: record.billingCode,
      mbsFeeAud: BILLING_CODES[record.billingCode].mbsFeeAud,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transmissionDate: record.transmissionDate,
      status: 'Synced to Hub',
      recordStatus: recordStatus,
      clinicalFindings: record.clinicalFindings,
      notes: record.notes
    };

    setSessionLog(prev => [newSessionEntry, ...prev]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleSessionStatusChange = (id: string, newStatus: LogStatus) => {
    setSessionLog(prev => prev.map(s => s.id === id ? { ...s, recordStatus: newStatus } : s));
    onUpdateStatus?.(id, newStatus);
    setAutoSyncToast(`⚡ Status updated to "${newStatus}" on Hub`);
    setTimeout(() => setAutoSyncToast(null), 3000);
  };

  const handleCopyLine = () => {
    const line = `${formPatient.transmissionDate}\t${formPatient.patientName}\t${formPatient.patientId}\t${formPatient.deviceModel}\t${overrideCode}\tR. Hendricks`;
    navigator.clipboard.writeText(line);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleCopySessionRow = (item: SessionLogEntry) => {
    const line = `${item.transmissionDate}\t${item.patientName}\t${item.patientIdOrMrn}\t${item.deviceModel}\t${item.billingCode}\t$${item.mbsFeeAud.toFixed(2)}\t${item.timestamp}`;
    navigator.clipboard.writeText(line);
    setCopiedSessionRowId(item.id);
    setTimeout(() => setCopiedSessionRowId(null), 2000);
  };

  const handleCopyAllSession = () => {
    if (sessionLog.length === 0) return;
    const header = 'Transmission_Date\tPatient_Name\tPatient_ID\tDevice_Model\tMBS_Item\tFee_AUD\tTime_Sent\r\n';
    const rows = sessionLog.map(r => 
      `${r.transmissionDate}\t${r.patientName}\t${r.patientIdOrMrn}\t${r.deviceModel}\t${r.billingCode}\t$${r.mbsFeeAud.toFixed(2)}\t${r.timestamp}`
    ).join('\r\n');

    navigator.clipboard.writeText(header + rows);
    setCopiedAllSession(true);
    setTimeout(() => setCopiedAllSession(false), 2500);
  };

  const handleExportSessionCsv = () => {
    if (sessionLog.length === 0) return;
    let csv = 'Patient Name,Patient ID,DOB,Portal,Device Model,Serial,Transmission Date,MBS Code,MBS Fee,Sent Time,Status\n';
    sessionLog.forEach(r => {
      csv += `"${r.patientName}","${r.patientIdOrMrn}","${r.patientDob || ''}","${r.vendor}","${r.deviceModel}","${r.deviceSerial}","${r.transmissionDate}","${r.billingCode}","${r.mbsFeeAud}","${r.timestamp}","${r.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardiac-session-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const handleClearSession = () => {
    if (confirm('Clear the current session log? (Records on the central Linux Hub will NOT be affected)')) {
      setSessionLog([]);
    }
  };

  const handleTriggerOutlook = () => {
    const record: PatientRecord = {
      id: 'rec-' + Date.now(),
      patientName: formPatient.patientName,
      patientDob: formPatient.patientDob,
      patientIdOrMrn: formPatient.patientId,
      vendor: activeVendor,
      portalUrl: `https://${VENDOR_PORTALS[activeVendor].domain}`,
      deviceModel: formPatient.deviceModel,
      deviceSerial: formPatient.deviceSerial,
      deviceCategory: formPatient.deviceCategory,
      transmissionDate: formPatient.transmissionDate,
      visitDate: new Date().toLocaleDateString('en-AU'),
      billingCode: overrideCode,
      loggedBy: 'R. Hendricks',
      clinicName: formPatient.clinic,
      status: recordStatus,
      clinicalFindings: technicianNotes || formPatient.sampleFindings
    };

    onDraftOutlook(record);
  };

  const totalSessionFee = sessionLog.reduce((acc, r) => acc + (r.mbsFeeAud || 0), 0);

  const filteredSession = sessionLog.filter(r => {
    if (!sessionSearch) return true;
    const q = sessionSearch.toLowerCase();
    return (
      r.patientName.toLowerCase().includes(q) ||
      r.patientIdOrMrn.toLowerCase().includes(q) ||
      r.deviceModel.toLowerCase().includes(q) ||
      r.deviceSerial.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Selector Header & Dock Mode Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Interactive Portal Simulator & Live Docked Side Panel
            </h3>
            <span className="hidden sm:inline-flex text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Chrome v1.3.0 Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Test how the docked side panel automatically updates patient details as you click between patients on Biotronik, Latitude, CareLink, or Merlin.
          </p>
        </div>

        {/* Docking Mode & Portal Picker Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Docking toggle button */}
          <button
            onClick={() => setIsDocked(!isDocked)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isDocked 
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle between docked right side panel and floating window"
          >
            {isDocked ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5" />
                <span>Docked Side Panel (Active)</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5" />
                <span>Dock Extension to Right</span>
              </>
            )}
          </button>

          {/* Portal Switcher */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(Object.keys(VENDOR_PORTALS) as PortalVendor[]).map((v) => (
              <button
                key={v}
                onClick={() => handleNavigatePortal(v, 0)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeVendor === v
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {VENDOR_PORTALS[v].name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Guidance Callout Banner */}
      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800 font-bold">
            ⚡
          </div>
          <div>
            <strong>Live Navigation & Auto-Sync (v1.3.0):</strong> When navigating between patients in vendor web portals, the docked side panel continuously observes DOM and URL changes. You can switch patients in the portal directory below and watch the docked form update instantaneously!
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hub IP: 192.168.8.100:3000</span>
        </div>
      </div>

      {/* Two Column Layout: Simulated Portal Page (Left) + Extension UI (Right - Docked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Simulated Portal Webpage */}
        <div className={`${isDocked ? 'lg:col-span-7' : 'lg:col-span-8'} bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden transition-all duration-300`}>
          {/* Simulated Browser Address Bar */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded px-3 py-1 text-slate-700 font-mono text-[11px] truncate flex items-center justify-between">
              <span className="truncate">
                https://{VENDOR_PORTALS[activeVendor].domain}/clinic/patient/{activeWebpagePatient.patientId}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded shrink-0 ml-2">HTTPS SECURE</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {VENDOR_PORTALS[activeVendor].name}
            </div>
          </div>

          {/* Patient Quick-Switch Roster (Simulating Clinician moving between patients) */}
          <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Simulated Portal Patient Directory (Click to Navigate):</span>
              </span>
              <span className="text-[10px] text-slate-500">
                Active in Browser: <strong>{activeWebpagePatient.patientName}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {portalMockData[activeVendor].map((p, idx) => {
                const isSelected = activePatientIndex === idx;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleNavigatePortal(activeVendor, idx)}
                    className={`p-2 rounded-lg text-left text-xs border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {p.patientName}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {p.deviceModel}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Trans: {p.transmissionDate}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portal Content View */}
          <div className="p-5 space-y-4 bg-slate-50 min-h-[480px]">
            {/* Vendor Portal Branding Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded border ${VENDOR_PORTALS[activeVendor].badgeClass}`}>
                  {VENDOR_PORTALS[activeVendor].logoText}
                </span>
                <span className="text-xs text-slate-500 font-medium">{activeWebpagePatient.clinic}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Portal Session</span>
              </div>
            </div>

            {/* Patient Postage Stamp / Banner Mock */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Patient Demographics</div>
                  <h4 className="text-xl font-bold text-slate-900">{activeWebpagePatient.patientName}</h4>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    MRN / Clinic ID: <span className="font-mono font-semibold text-slate-800">{activeWebpagePatient.patientId}</span>
                    {activeWebpagePatient.patientDob && (
                      <span className="ml-3">DOB: <strong className="text-slate-800">{activeWebpagePatient.patientDob}</strong></span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Transmission Received</div>
                  <div className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 mt-0.5">
                    {activeWebpagePatient.transmissionDate}
                  </div>
                </div>
              </div>

              {/* Device Block */}
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Implanted Cardiac Device:</span>
                  <span className="font-bold text-slate-800">{activeWebpagePatient.deviceModel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Serial Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{activeWebpagePatient.deviceSerial}</span>
                </div>
              </div>

              {/* Clinical Telemetry Summary */}
              <div className="text-xs text-slate-600 bg-amber-50/60 p-3 rounded-md border border-amber-200/60">
                <span className="font-bold text-amber-900 block mb-0.5">Telemetry Observation:</span>
                {activeWebpagePatient.sampleFindings}
              </div>
            </div>

            {/* DOM Selector Inspector */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Matched DOM Selectors for Active Patient:</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-semibold">Active Scrape OK</span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {activeWebpagePatient.htmlSnippets.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-blue-600 truncate max-w-[260px]">{s.selector}</span>
                    <span className="text-slate-700 font-semibold truncate max-w-[180px]">"{s.value}"</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: The Browser Extension (Docked Side Panel) */}
        <div className={`${isDocked ? 'lg:col-span-5' : 'lg:col-span-4'} bg-white rounded-xl border border-blue-400 shadow-xl overflow-hidden ring-2 ring-blue-500/20 transition-all duration-300`}>
          {/* Extension Header Bar */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center font-bold text-xs">
                  CR
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight">Cardiac Billing Hub</h4>
                  <p className="text-[11px] text-blue-200">
                    {isDocked ? '📌 Docked Side Panel (Persistent)' : '🪟 Browser Extension'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Hub Online
              </span>
            </div>

            {/* TAB NAVIGATION: Capture & Bill vs Sent This Session */}
            <div className="flex border-b border-blue-500/40 mt-3 pt-1 gap-1">
              <button
                onClick={() => setActiveExtensionTab('capture')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeExtensionTab === 'capture'
                    ? 'border-white text-white'
                    : 'border-transparent text-blue-200 hover:text-white'
                }`}
              >
                <span>🩺 Capture & Bill</span>
              </button>
              <button
                onClick={() => setActiveExtensionTab('session')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeExtensionTab === 'session'
                    ? 'border-white text-white'
                    : 'border-transparent text-blue-200 hover:text-white'
                }`}
              >
                <span>📋 Sent This Session</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeExtensionTab === 'session'
                    ? 'bg-white text-blue-800'
                    : 'bg-blue-600 text-blue-100'
                }`}>
                  {sessionLog.length}
                </span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3.5">
            {/* TAB 1: CAPTURE & BILL */}
            {activeExtensionTab === 'capture' && (
              <>
                {/* Auto-Sync & Manual Re-scan Controls */}
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSyncOnNav}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAutoSyncOnNav(checked);
                        if (checked && formPatient.patientId !== activeWebpagePatient.patientId) {
                          handleForceRescan();
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Auto-sync on page change
                    </span>
                  </label>

                  <button
                    onClick={handleForceRescan}
                    className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-bold text-blue-700 text-[11px] shadow-2xs transition-all cursor-pointer"
                    title="Force re-scan active portal webpage"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-600" />
                    <span>Re-scan Page</span>
                  </button>
                </div>

                {/* Toast Notification when auto-sync fires */}
                {autoSyncToast && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-3 py-2 rounded-lg flex items-center justify-between animate-fadeIn">
                    <span className="font-semibold">{autoSyncToast}</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                      Live Form Updated
                    </span>
                  </div>
                )}

                {/* High-visibility Warning Banner when autoSync is OFF and user navigated to another patient */}
                {pendingPatientNotice && !autoSyncOnNav && (
                  <div className="bg-sky-50 border border-sky-300 text-sky-950 p-3 rounded-lg text-xs space-y-2 animate-fadeIn shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-sky-900">
                        <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>New Patient Page Detected!</span>
                      </div>
                      <span className="text-[10px] font-bold bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded">
                        Page Changed
                      </span>
                    </div>
                    <div className="text-[11px] text-sky-800">
                      Browser is now viewing <strong>{pendingPatientNotice.patientName}</strong> ({pendingPatientNotice.patientId}), but extension form holds <strong>{formPatient.patientName}</strong>.
                    </div>
                    <button
                      onClick={handleAcceptDetectedPatient}
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Load Telemetry for {pendingPatientNotice.patientName}
                    </button>
                  </div>
                )}

                {/* Form fields filled by scraper */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Patient Name</label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Portal: {VENDOR_PORTALS[activeVendor].name.split(' ')[0]}
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={formPatient.patientName}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-semibold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Patient ID / MRN</label>
                      <input
                        type="text"
                        readOnly
                        value={formPatient.patientId}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="text"
                        readOnly
                        value={formPatient.patientDob}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Device Model</label>
                      <input
                        type="text"
                        readOnly
                        value={formPatient.deviceModel}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        readOnly
                        value={formPatient.deviceSerial}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Real-time Medicare Collision & Billing Eligibility Status */}
                  {!eligibility.canBill ? (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 space-y-2 text-xs shadow-xs animate-fadeIn">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Medicare Collision Alert — Cannot Bill</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-red-200 text-red-900 px-2 py-0.5 rounded-full border border-red-300">
                          Collision
                        </span>
                      </div>

                      <p className="text-red-800 leading-relaxed font-medium">
                        {eligibility.reason}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-200/80 text-[11px]">
                        <div className="bg-white/90 p-2 rounded border border-red-200">
                          <span className="text-red-600 font-semibold block text-[10px]">Next Eligible Date:</span>
                          <strong className="text-red-950 font-mono text-xs">{eligibility.nextEligibleDate || 'In Progress'}</strong>
                        </div>
                        <div className="bg-white/90 p-2 rounded border border-red-200">
                          <span className="text-red-600 font-semibold block text-[10px]">Days Remaining:</span>
                          <strong className="text-red-950 text-xs">{eligibility.daysRemaining ? `${eligibility.daysRemaining} days` : 'Exclusion active'}</strong>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-red-700">Hold claim by setting status to <strong>Logged</strong>:</span>
                        {recordStatus !== 'Logged' && (
                          <button
                            type="button"
                            onClick={() => setRecordStatus('Logged')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] whitespace-nowrap shadow-xs cursor-pointer transition-all"
                          >
                            Set to Logged
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1 text-xs shadow-xs animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Eligible to Bill Now — No Collisions</span>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                          Verified
                        </span>
                      </div>
                      <p className="text-emerald-800 text-[11px] leading-relaxed">
                        {eligibility.reason}
                      </p>
                      <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-2 pt-0.5">
                        <span>• Multi-year practice history checked (&gt;1 year)</span>
                        <span>• Safe to bill MBS Item {overrideCode} (${BILLING_CODES[overrideCode].mbsFeeAud.toFixed(2)})</span>
                      </div>
                    </div>
                  )}

                  {/* MBS Billing Code Selector with Auto-Suggest Highlight */}
                  <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-blue-900">MBS Billing Item Code</label>
                      <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">
                        Auto-Suggested
                      </span>
                    </div>
                    <select
                      value={overrideCode}
                      onChange={(e) => setOverrideCode(e.target.value as BillingCode)}
                      className="w-full bg-white border border-blue-300 rounded px-3 py-1.5 font-bold text-blue-950 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="11736">11736 - Loop Recorder (AF) [Max 4 per year] ($35.80)</option>
                      <option value="11737">11737 - Loop Recorder (Stroke/Syncope) [Once per 4 wks] ($35.80)</option>
                      <option value="11725">11725 - Pacemaker (PPM) [Once per 90 days] ($44.55)</option>
                      <option value="11719">11719 - Defibrillator (ICD / CRT-D) [Once per 90 days] ($89.15)</option>
                    </select>
                    <div className="text-[11px] text-blue-900 leading-tight space-y-0.5">
                      <div><strong>Frequency Rule:</strong> {BILLING_CODES[overrideCode].frequencyRule}</div>
                      <div className="text-blue-700">{BILLING_CODES[overrideCode].description}</div>
                    </div>
                  </div>

                  {/* Record Status Selector (Clinician Decision directly in Extension) */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span>Record Status (Clinician Decision)</span>
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Decide in Extension
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRecordStatus('Logged')}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          recordStatus === 'Logged'
                            ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">Logged</div>
                        <div className="text-[9px] font-normal opacity-80">Pending Review</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordStatus('Reviewed')}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          recordStatus === 'Reviewed'
                            ? 'bg-blue-100 border-blue-400 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">Reviewed</div>
                        <div className="text-[9px] font-normal opacity-80">Clinically Verified</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordStatus('Billed')}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          recordStatus === 'Billed'
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">Billed</div>
                        <div className="text-[9px] font-normal opacity-80">Mark for Payment</div>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Decide status directly from extension before sending to Practice Hub. Email status option permanently removed.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Clinical Findings / Billing Notes</label>
                    <textarea
                      rows={2}
                      value={technicianNotes}
                      onChange={(e) => setTechnicianNotes(e.target.value)}
                      placeholder="Enter reviewer notes, rhythm diagnosis, lead thresholds..."
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={handleSave}
                    className={`w-full py-2.5 px-4 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                      !eligibility.canBill && recordStatus === 'Billed'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {!eligibility.canBill && recordStatus === 'Billed'
                      ? '⚠️ Override Conflict & Save as Billed'
                      : `Save as "${recordStatus}" to Practice Hub`}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleTriggerOutlook}
                      className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Outlook Draft
                    </button>
                    <button
                      onClick={handleCopyLine}
                      className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      Copy Billing Line
                    </button>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold p-2.5 rounded-lg flex items-center justify-between gap-2 animate-fadeIn">
                    <span>✓ Saved to Practice Hub & added to Session Log!</span>
                    <button
                      onClick={() => setActiveExtensionTab('session')}
                      className="text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 rounded font-bold transition-all cursor-pointer"
                    >
                      View Session ({sessionLog.length}) ❯
                    </button>
                  </div>
                )}
                {copySuccess && (
                  <div className="bg-blue-100 border border-blue-300 text-blue-900 text-xs font-semibold p-2.5 rounded-lg text-center animate-fadeIn">
                    ✓ Copied tab-separated patient row to clipboard!
                  </div>
                )}
              </>
            )}

            {/* TAB 2: SENT THIS SESSION */}
            {activeExtensionTab === 'session' && (
              <div className="space-y-3">
                {/* Shift Statistics Bar */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Transmissions Sent:</span>
                    <strong className="text-base font-bold text-slate-900">{sessionLog.length} Patients</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Est. MBS Revenue:</span>
                    <strong className="text-base font-bold text-emerald-700">${totalSessionFee.toFixed(2)} AUD</strong>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search patients sent this shift..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Patient List */}
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {filteredSession.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
                      No matching patients found in this session.
                    </div>
                  ) : (
                    filteredSession.map((item) => (
                      <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:border-blue-300 transition-all text-xs space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-[13px]">{item.patientName}</div>
                            <div className="text-[11px] text-slate-500">
                              ID: <span className="font-mono text-slate-700">{item.patientIdOrMrn}</span>
                              {item.patientDob && ` • DOB: ${item.patientDob}`}
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${VENDOR_PORTALS[item.vendor]?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {item.vendor.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                          <div><strong>Device:</strong> {item.deviceModel} (SN: {item.deviceSerial})</div>
                          <div className="text-slate-500">Transmission: {item.transmissionDate} • Sent at {item.timestamp}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            MBS {item.billingCode} (${item.mbsFeeAud.toFixed(2)})
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-medium">Status:</span>
                              <select
                                value={item.recordStatus || 'Reviewed'}
                                onChange={(e) => handleSessionStatusChange(item.id, e.target.value as LogStatus)}
                                className={`text-[10px] font-bold py-0.5 px-1.5 rounded border cursor-pointer ${
                                  (item.recordStatus === 'Billed' || item.recordStatus === 'Finalized & Billed')
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : item.recordStatus === 'Logged'
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : 'bg-blue-50 border-blue-300 text-blue-800'
                                }`}
                              >
                                <option value="Logged">Logged</option>
                                <option value="Reviewed">Reviewed</option>
                                <option value="Billed">Billed</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handleCopySessionRow(item)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              {copiedSessionRowId === item.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Session Actions */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <button
                    onClick={handleCopyAllSession}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {copiedAllSession ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAllSession ? 'Copied All to Clipboard!' : 'Copy All Session Rows (for Genie / PMS)'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportSessionCsv}
                      className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] flex items-center justify-center gap-1 border border-slate-300 transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-slate-600" />
                      Export CSV
                    </button>
                    <button
                      onClick={handleClearSession}
                      className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] flex items-center justify-center gap-1 border border-rose-200 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      Clear Shift Log
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper inline icon
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
