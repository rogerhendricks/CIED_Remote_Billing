import React, { useState, useMemo, useRef } from 'react';
import { PatientRecord, EndOfWeekBillingSheet, BillingCode, ClinicStaff } from '../types';
import { BILLING_CODES, VENDOR_PORTALS } from '../data/billingCodes';
import { 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Printer, 
  Download, 
  Mail, 
  Copy, 
  X, 
  Calendar, 
  AlertTriangle, 
  UserCheck, 
  Building2, 
  FileText, 
  DollarSign, 
  Layers, 
  Lock, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Check,
  History,
  ArrowRight
} from 'lucide-react';

interface EndOfWeekBillingSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: PatientRecord[];
  activeStaff: ClinicStaff;
  clinicName?: string;
  onFinalizeSheet: (sheet: EndOfWeekBillingSheet, recordIds: string[]) => void;
  existingSheets?: EndOfWeekBillingSheet[];
}

export const EndOfWeekBillingSheetModal: React.FC<EndOfWeekBillingSheetModalProps> = ({
  isOpen,
  onClose,
  records,
  activeStaff,
  clinicName = 'Westmead Hospital Cardiology Remote Monitoring Practice',
  onFinalizeSheet,
  existingSheets = []
}) => {
  if (!isOpen) return null;

  // Helper to calculate Friday of current week (or given offset)
  const getFridayOfWeek = (offsetWeeks = 0): Date => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sun, 5 = Fri
    const diffToFriday = 5 - day;
    d.setDate(d.getDate() + diffToFriday + offsetWeeks * 7);
    return d;
  };

  // Helper to get ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const targetFriday = useMemo(() => getFridayOfWeek(weekOffset), [weekOffset]);
  const weekNumber = useMemo(() => getWeekNumber(targetFriday), [targetFriday]);
  const year = targetFriday.getFullYear();

  const formattedWeekEnding = useMemo(() => {
    return targetFriday.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, [targetFriday]);

  const pbrcBatchId = useMemo(() => {
    return `PBRC-EOW-${year}-W${String(weekNumber).padStart(2, '0')}-WESTMEAD`;
  }, [year, weekNumber]);

  // Active view tab within modal
  const [activeTab, setActiveTab] = useState<'selection' | 'preview_sheet' | 'preview_csv' | 'email_draft' | 'history'>('selection');

  // Provider and Billing Clerk Details
  const [providerName, setProviderName] = useState<string>('Dr. David Tanous (Cardiologist)');
  const [providerNumber, setProviderNumber] = useState<string>('2418902A');
  const [hospitalCostCentre, setHospitalCostCentre] = useState<string>('CARD-PBRC-8820 (Cardiology Outpatients)');
  const [billingClerkName, setBillingClerkName] = useState<string>('Sarah Jenkins (PBRC Revenue Clerk)');
  const [billingClerkEmail, setBillingClerkEmail] = useState<string>('billing.clerk@westmead.health.nsw.gov.au');
  const [ccEmail, setCcEmail] = useState<string>('cardiology-admin@westmead.health.nsw.gov.au');
  const [clerkNotes, setClerkNotes] = useState<string>(
    'All remote device follow-ups reviewed, reported in hospital electronic medical record, and meet MBS criteria. Please process for PBRC billing.'
  );

  // Selected patient records for this sheet
  // Default to selecting unbilled / reviewed / logged records that aren't already finalized
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>(() => {
    const unfinalized = records.filter(r => r.status !== 'Finalized & Billed');
    return unfinalized.map(r => r.id);
  });

  const [copiedNotification, setCopiedNotification] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalizedSuccessSheet, setFinalizedSuccessSheet] = useState<EndOfWeekBillingSheet | null>(null);

  // Filtered candidate records
  const candidateRecords = useMemo(() => {
    return records;
  }, [records]);

  // Selected records objects
  const selectedRecords = useMemo(() => {
    return records.filter(r => selectedRecordIds.includes(r.id));
  }, [records, selectedRecordIds]);

  // Breakdown statistics
  const totalClaimFeeAud = useMemo(() => {
    return selectedRecords.reduce((sum, r) => sum + (BILLING_CODES[r.billingCode]?.mbsFeeAud || 0), 0);
  }, [selectedRecords]);

  const codeBreakdown = useMemo(() => {
    const map: Record<BillingCode, { count: number; subtotal: number }> = {
      '11725': { count: 0, subtotal: 0 },
      '11719': { count: 0, subtotal: 0 },
      '11736': { count: 0, subtotal: 0 },
      '11737': { count: 0, subtotal: 0 },
    };

    selectedRecords.forEach(r => {
      if (map[r.billingCode]) {
        map[r.billingCode].count += 1;
        map[r.billingCode].subtotal += (BILLING_CODES[r.billingCode]?.mbsFeeAud || 0);
      }
    });

    return (Object.keys(map) as BillingCode[]).map(code => ({
      code,
      count: map[code].count,
      subtotalAud: map[code].subtotal
    })).filter(item => item.count > 0);
  }, [selectedRecords]);

  // Selection handlers
  const handleToggleRecord = (id: string) => {
    setSelectedRecordIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnbilled = () => {
    const unbilled = records.filter(r => r.status !== 'Finalized & Billed').map(r => r.id);
    setSelectedRecordIds(unbilled);
  };

  const handleSelectAll = () => {
    setSelectedRecordIds(records.map(r => r.id));
  };

  const handleDeselectAll = () => {
    setSelectedRecordIds([]);
  };

  const handleExcludeFlagged = () => {
    const clean = records.filter(r => !r.isFlaggedDuplicate && r.status !== 'Finalized & Billed').map(r => r.id);
    setSelectedRecordIds(clean);
  };

  // Generate plain text body for email dispatch to clerk
  const emailSubject = `[PBRC BILLING] End of Week Cardiac Device Monitoring Sheet - W/E ${formattedWeekEnding} (${selectedRecords.length} claims - $${totalClaimFeeAud.toFixed(2)} AUD)`;

  const buildClerkEmailText = () => {
    let body = `ATTN: ${billingClerkName}\r\nPBRC Revenue & Patient Accounts Office\r\n${clinicName}\r\n\r\n`;
    body += `RE: End of Week Remote Cardiac Device Monitoring Billing Batch\r\n`;
    body += `PBRC Batch Reference: ${pbrcBatchId}\r\n`;
    body += `Week Ending: ${formattedWeekEnding} (Week ${weekNumber}, ${year})\r\n`;
    body += `Supervising Clinician / Provider: ${providerName} (Provider No: ${providerNumber})\r\n`;
    body += `Cost Centre: ${hospitalCostCentre}\r\n`;
    body += `Submitted By: ${activeStaff.name} (${activeStaff.role})\r\n`;
    body += `Total Patients / Claims: ${selectedRecords.length}\r\n`;
    body += `Total MBS Rebate Value: $${totalClaimFeeAud.toFixed(2)} AUD\r\n\r\n`;

    body += `MBS ITEM CODE SUMMARY:\r\n`;
    codeBreakdown.forEach(item => {
      const info = BILLING_CODES[item.code];
      body += ` - Item ${item.code} (${info?.deviceType || 'Cardiac Device'}): ${item.count} claim(s) @ $${info?.mbsFeeAud || 0} = $${item.subtotalAud.toFixed(2)} AUD\r\n`;
    });
    body += `\r\n`;

    if (clerkNotes.trim()) {
      body += `SPECIAL NOTES FOR BILLING CLERK:\r\n${clerkNotes}\r\n\r\n`;
    }

    body += `========================================================================================\r\n`;
    body += `ITEMIZED PATIENT BILLING LIST FOR PBRC ENTRY:\r\n`;
    body += `========================================================================================\r\n\r\n`;

    selectedRecords.forEach((r, idx) => {
      const codeInfo = BILLING_CODES[r.billingCode];
      const vendorName = VENDOR_PORTALS[r.vendor]?.name || r.vendor;
      body += `[${idx + 1}] Patient: ${r.patientName}\r\n`;
      body += `    MRN / URN: ${r.patientIdOrMrn} | DOB: ${r.patientDob || 'N/A'}\r\n`;
      body += `    Service / Review Date: ${r.visitDate} (Transmission: ${r.transmissionDate})\r\n`;
      body += `    Portal: ${vendorName} | Device: ${r.deviceModel} (Serial: ${r.deviceSerial})\r\n`;
      body += `    MBS Item: ${r.billingCode} ($${codeInfo?.mbsFeeAud || 0} AUD) - ${codeInfo?.description || ''}\r\n`;
      if (r.clinicalIndication) {
        body += `    Clinical Indication: ${r.clinicalIndication}\r\n`;
      }
      if (r.clinicalFindings) {
        body += `    Findings: ${r.clinicalFindings}\r\n`;
      }
      body += `\r\n`;
    });

    body += `========================================================================================\r\n`;
    body += `CLINICAL CERTIFICATION:\r\n`;
    body += `I certify that remote device telemetry transmissions for the patients listed above were\r\n`;
    body += `duly received, reviewed, clinically reported, and archived in accordance with Medicare\r\n`;
    body += `Benefits Schedule (MBS) rules and clinical governance protocols.\r\n\r\n`;
    body += `Sign-off: ${activeStaff.name} (${activeStaff.role})\r\n`;
    body += `Date: ${new Date().toLocaleDateString('en-AU')} ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}\r\n`;

    return body;
  };

  // Generate PBRC CSV string
  const buildPbrcCsv = () => {
    const headers = [
      'PBRC_BATCH_REF',
      'WEEK_ENDING',
      'PROVIDER_NO',
      'PROVIDER_NAME',
      'PATIENT_MRN',
      'PATIENT_NAME',
      'DOB',
      'SERVICE_DATE',
      'TRANSMISSION_DATE',
      'MBS_ITEM',
      'FEE_AUD',
      'VENDOR_PORTAL',
      'DEVICE_MODEL',
      'DEVICE_SERIAL',
      'CLINICAL_INDICATION',
      'CLERK_STATUS'
    ];

    const rows = selectedRecords.map(r => [
      `"${pbrcBatchId}"`,
      `"${formattedWeekEnding}"`,
      `"${providerNumber}"`,
      `"${providerName}"`,
      `"${r.patientIdOrMrn}"`,
      `"${r.patientName}"`,
      `"${r.patientDob || ''}"`,
      `"${r.visitDate}"`,
      `"${r.transmissionDate}"`,
      `"${r.billingCode}"`,
      `"${BILLING_CODES[r.billingCode]?.mbsFeeAud || 0}"`,
      `"${VENDOR_PORTALS[r.vendor]?.name || r.vendor}"`,
      `"${r.deviceModel}"`,
      `"${r.deviceSerial}"`,
      `"${(r.clinicalIndication || '').replace(/"/g, '""')}"`,
      `"READY_FOR_PBRC_ENTRY"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  };

  // Dispatch & Finalization action
  const handleFinalizeAndSend = (deliveryMethod: 'email' | 'eml' | 'download_csv' | 'direct') => {
    if (selectedRecordIds.length === 0) {
      alert('Please select at least one patient record to include on this End of Week Billing Sheet.');
      return;
    }

    const emailText = buildClerkEmailText();
    const csvContent = buildPbrcCsv();

    // Trigger delivery helper
    if (deliveryMethod === 'email') {
      const mailtoUrl = `mailto:${encodeURIComponent(billingClerkEmail)}?cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailText)}`;
      window.open(mailtoUrl, '_blank');
    } else if (deliveryMethod === 'eml') {
      const emlContent = `From: "${activeStaff.name}" <cardiology-practice@westmead.health.nsw.gov.au>
To: ${billingClerkEmail}
Cc: ${ccEmail}
Subject: ${emailSubject}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

${emailText}`;
      const blob = new Blob([emlContent], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pbrcBatchId}.eml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (deliveryMethod === 'download_csv') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pbrcBatchId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Build the sheet object
    const newSheet: EndOfWeekBillingSheet = {
      id: pbrcBatchId,
      weekEndingDate: formattedWeekEnding,
      weekNumber,
      year,
      createdDate: new Date().toLocaleDateString('en-AU'),
      clinicName,
      providerName,
      providerNumber,
      billingClerkEmail,
      billingClerkName,
      pbrcBatchRef: pbrcBatchId,
      notesForClerk: clerkNotes,
      recordIds: selectedRecordIds,
      patientCount: selectedRecordIds.length,
      totalFeeAud: totalClaimFeeAud,
      codeBreakdown,
      status: 'Sent to PBRC Billing Clerk',
      sentAt: new Date().toISOString(),
      sentByStaff: `${activeStaff.name} (${activeStaff.role})`
    };

    // Callback to App.tsx to update records and sheets
    onFinalizeSheet(newSheet, selectedRecordIds);
    setFinalizedSuccessSheet(newSheet);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(buildClerkEmailText());
    setCopiedNotification('Email body copied to clipboard!');
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(buildPbrcCsv());
    setCopiedNotification('PBRC CSV data copied to clipboard!');
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  End of Week Billing Sheet
                </h2>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                  PBRC Billing Workflow
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Compile weekly remote monitoring claims, dispatch to hospital billing clerk, and mark as finalized & billed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner if sheet was just finalized */}
        {finalizedSuccessSheet && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-950">
                  Batch Dispatched & Marked as Finalized and Billed!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Batch <strong>{finalizedSuccessSheet.id}</strong> ({finalizedSuccessSheet.patientCount} patients, ${finalizedSuccessSheet.totalFeeAud.toFixed(2)} AUD) is locked and sent to {billingClerkEmail}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview_sheet')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                View Finalized Sheet
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Return to Hub
              </button>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {copiedNotification && (
          <div className="bg-blue-600 text-white text-xs font-semibold py-1.5 px-4 text-center animate-fadeIn print:hidden">
            {copiedNotification}
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center justify-between overflow-x-auto print:hidden">
          <div className="flex space-x-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('selection')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'selection'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              1. Patient Selection ({selectedRecords.length})
            </button>

            <button
              onClick={() => setActiveTab('preview_sheet')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'preview_sheet'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              2. Formal PBRC Sheet
            </button>

            <button
              onClick={() => setActiveTab('preview_csv')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'preview_csv'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              3. PBRC CSV Batch
            </button>

            <button
              onClick={() => setActiveTab('email_draft')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'email_draft'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              4. Clerk Dispatch Email
            </button>

            {existingSheets.length > 0 && (
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Sheet History ({existingSheets.length})
              </button>
            )}
          </div>

          {/* Quick Week Offset Navigator */}
          <div className="flex items-center gap-1 pb-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-800">
              Week {weekNumber} (W/E {formattedWeekEnding})
            </div>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB 1: PATIENT SELECTION & PBRC METADATA */}
          {activeTab === 'selection' && (
            <div className="space-y-6">
              
              {/* Summary Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Week Ending</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">{formattedWeekEnding}</div>
                  <div className="text-[10px] text-blue-600/90 font-mono">Week {weekNumber} • {year}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">PBRC Batch Ref</span>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-1 truncate" title={pbrcBatchId}>
                    {pbrcBatchId}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Hospital Audit ID</div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Claims Selected</span>
                  <div className="text-xl font-black text-indigo-900 mt-0.5">
                    {selectedRecords.length} <span className="text-xs font-medium text-slate-500">/ {records.length}</span>
                  </div>
                  <div className="text-[10px] text-indigo-600/90 font-medium">Ready for clerk dispatch</div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Rebate Value</span>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    ${totalClaimFeeAud.toFixed(2)} <span className="text-[10px] font-bold text-slate-500">AUD</span>
                  </div>
                  <div className="text-[10px] text-emerald-600/90 font-medium">MBS Items 11725, 11719, 11736, 11737</div>
                </div>
              </div>

              {/* Code Breakdown Chips */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1 text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" /> MBS Breakdown:
                </span>
                {codeBreakdown.length === 0 ? (
                  <span className="text-slate-400 italic">No patients currently selected</span>
                ) : (
                  codeBreakdown.map(b => (
                    <span key={b.code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs font-semibold text-slate-800">
                      <span className="font-mono font-bold text-blue-700">Item {b.code}:</span>
                      <span>{b.count} claim{b.count > 1 ? 's' : ''}</span>
                      <span className="text-emerald-700 font-mono">(${b.subtotalAud.toFixed(2)})</span>
                    </span>
                  ))
                )}
              </div>

              {/* Provider & Billing Clerk Configuration Fields */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> PBRC Hospital & Billing Clerk Settings
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Configured for Westmead Hospital</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Supervising Clinician / Provider</label>
                    <input
                      type="text"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Provider Number</label>
                    <input
                      type="text"
                      value={providerNumber}
                      onChange={(e) => setProviderNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-mono font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">PBRC Cost Centre / Location</label>
                    <input
                      type="text"
                      value={hospitalCostCentre}
                      onChange={(e) => setHospitalCostCentre(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">PBRC Billing Clerk Name</label>
                    <input
                      type="text"
                      value={billingClerkName}
                      onChange={(e) => setBillingClerkName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Billing Clerk Email (PBRC Office)</label>
                    <input
                      type="email"
                      value={billingClerkEmail}
                      onChange={(e) => setBillingClerkEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CC Practice Email</label>
                    <input
                      type="email"
                      value={ccEmail}
                      onChange={(e) => setCcEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Instructions / Notes for Billing Clerk</label>
                    <input
                      type="text"
                      value={clerkNotes}
                      onChange={(e) => setClerkNotes(e.target.value)}
                      placeholder="e.g. Please process against Medicare bulk billing. Any rejections please notify technician..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Patient Selection Controls */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Eligible Transmissions for Week Ending {formattedWeekEnding}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({selectedRecords.length} selected of {candidateRecords.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      onClick={handleSelectAllUnbilled}
                      className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors cursor-pointer"
                    >
                      Select All Unbilled
                    </button>
                    <button
                      onClick={handleExcludeFlagged}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                      title="Exclude flagged 90-day / 4-week duplicate alert patients"
                    >
                      Exclude Flagged
                    </button>
                    <button
                      onClick={handleSelectAll}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Candidate Records Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRecordIds.length === candidateRecords.length && candidateRecords.length > 0}
                            onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Patient Name & MRN</th>
                        <th className="py-2.5 px-3">Service Date</th>
                        <th className="py-2.5 px-3">Device & Serial</th>
                        <th className="py-2.5 px-3">Vendor Portal</th>
                        <th className="py-2.5 px-3">MBS Item</th>
                        <th className="py-2.5 px-3">Current Status</th>
                        <th className="py-2.5 px-3 text-right">Fee (AUD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidateRecords.map((r) => {
                        const isSelected = selectedRecordIds.includes(r.id);
                        const isAlreadyFinalized = r.status === 'Finalized & Billed';
                        const codeInfo = BILLING_CODES[r.billingCode];

                        return (
                          <tr
                            key={r.id}
                            onClick={() => handleToggleRecord(r.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50/80'
                            } ${r.isFlaggedDuplicate ? 'bg-rose-50/40' : ''}`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRecord(r.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{r.patientName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">MRN: {r.patientIdOrMrn}</div>
                              {r.isFlaggedDuplicate && (
                                <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>{r.conflictReason || 'MBS Frequency Conflict'}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              <div>{r.visitDate}</div>
                              <div className="text-[10px] text-slate-400">Tx: {r.transmissionDate}</div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800">{r.deviceModel}</div>
                              <div className="text-[10px] font-mono text-slate-500">SN: {r.deviceSerial}</div>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${VENDOR_PORTALS[r.vendor]?.badgeClass || ''}`}>
                                {VENDOR_PORTALS[r.vendor]?.name.split(' ')[0] || r.vendor}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {r.billingCode}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              {isAlreadyFinalized ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Finalized & Billed
                                </span>
                              ) : r.status === 'Reviewed' ? (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                                  Reviewed
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                  {r.status}
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ${codeInfo?.mbsFeeAud || 0} AUD
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORMAL PBRC BILLING SHEET (PRINTABLE VIEW) */}
          {activeTab === 'preview_sheet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 print:hidden">
                <span className="text-xs text-slate-600 font-medium">
                  Official clinical billing sheet formatted for hospital records and PBRC data entry.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintSheet}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </button>
                  <button
                    onClick={() => handleFinalizeAndSend('direct')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Finalize & Mark as Billed
                  </button>
                </div>
              </div>

              {/* Document Container */}
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm text-slate-900 space-y-6">
                {/* Hospital Letterhead Header */}
                <div className="border-b-2 border-slate-900 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                        {clinicName}
                      </h1>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">
                        Cardiac Device Remote Monitoring Service • Department of Cardiology
                      </div>
                    </div>
                    <div className="text-right sm:text-right text-xs">
                      <div className="font-mono font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block">
                        PBRC BATCH: {pbrcBatchId}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        Date: {new Date().toLocaleDateString('en-AU')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Batch Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Week Ending</span>
                    <span className="font-bold text-slate-900">{formattedWeekEnding}</span>
                    <span className="text-[10px] text-slate-500 block">Week {weekNumber}, {year}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Treating Cardiologist</span>
                    <span className="font-bold text-slate-900">{providerName}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Provider: {providerNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Hospital Cost Centre</span>
                    <span className="font-bold text-slate-900">{hospitalCostCentre}</span>
                    <span className="text-[10px] text-slate-500 block">Westmead PBRC Unit</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">PBRC Revenue Clerk</span>
                    <span className="font-bold text-slate-900">{billingClerkName}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{billingClerkEmail}</span>
                  </div>
                </div>

                {/* MBS Category Summary Sub-table */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">MBS Claim Schedule Summary</h3>
                  <table className="w-full text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-left">MBS Item Code</th>
                        <th className="py-2 px-3 text-left">Device Category & Description</th>
                        <th className="py-2 px-3 text-center">Frequency Rule</th>
                        <th className="py-2 px-3 text-center">Count</th>
                        <th className="py-2 px-3 text-right">MBS Fee (AUD)</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {codeBreakdown.map(item => {
                        const info = BILLING_CODES[item.code];
                        return (
                          <tr key={item.code} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono font-bold text-blue-800">{item.code}</td>
                            <td className="py-2 px-3 text-slate-800">{info?.description || ''}</td>
                            <td className="py-2 px-3 text-center text-[10px] text-slate-500">{info?.frequencyRule}</td>
                            <td className="py-2 px-3 text-center font-bold">{item.count}</td>
                            <td className="py-2 px-3 text-right font-mono">${info?.mbsFeeAud || 0}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${item.subtotalAud.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 uppercase text-[11px] tracking-wider">Total Claims For This Batch</td>
                        <td className="py-2.5 px-3 text-center text-sm text-blue-900">{selectedRecords.length}</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-sm text-emerald-800 font-mono">${totalClaimFeeAud.toFixed(2)} AUD</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Patient Itemized Roster */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Itemized Patient Claims ({selectedRecords.length})
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5 w-6 text-center">#</th>
                          <th className="py-2 px-3 text-left">Patient Name & URN/MRN</th>
                          <th className="py-2 px-3 text-left">DOB</th>
                          <th className="py-2 px-3 text-left">Service Date</th>
                          <th className="py-2 px-3 text-left">Portal & Device</th>
                          <th className="py-2 px-3 text-left">Serial No</th>
                          <th className="py-2 px-3 text-center">MBS Item</th>
                          <th className="py-2 px-3 text-right">Fee (AUD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecords.map((r, idx) => {
                          const info = BILLING_CODES[r.billingCode];
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900">{r.patientName}</div>
                                <div className="text-[10px] font-mono text-slate-500">URN: {r.patientIdOrMrn}</div>
                              </td>
                              <td className="py-2 px-3 text-slate-700 text-[11px]">{r.patientDob || 'N/A'}</td>
                              <td className="py-2 px-3 text-slate-700 text-[11px]">
                                {r.visitDate}
                                <span className="text-[9px] text-slate-400 block">Tx: {r.transmissionDate}</span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-800">{r.deviceModel}</div>
                                <div className="text-[10px] text-slate-400">{VENDOR_PORTALS[r.vendor]?.name}</div>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-700">{r.deviceSerial}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {r.billingCode}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                ${info?.mbsFeeAud || 0}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clinician Certification & Clerk Verification Sign-off Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-slate-200 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-700" /> Clinician / Supervisor Certification
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      I certify that remote monitoring transmission data for the patients above has been reviewed,
                      documented in hospital clinical charts, and complies with MBS and hospital governance rules.
                    </p>
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-[11px]">
                      <div>
                        <span className="block text-slate-400 text-[10px]">Supervisor Signature</span>
                        <span className="font-bold font-serif text-slate-800 italic text-sm">{activeStaff.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-slate-400 text-[10px]">Date</span>
                        <span className="font-medium text-slate-700">{formattedWeekEnding}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-700" /> PBRC Hospital Revenue Office Entry
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      To be completed by billing clerk upon posting into PBRC hospital accounts.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">PBRC Entry Officer:</span>
                        <span className="font-semibold text-slate-800">{billingClerkName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Batch Receipt #:</span>
                        <span className="font-mono text-slate-700">________________</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: PBRC CSV / EXCEL BATCH PREVIEW */}
          {activeTab === 'preview_csv' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    PBRC Batch File (CSV Format)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Standard comma-separated dataset ready for direct import into hospital Patient Billing & Revenue Collection.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCsv}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy CSV
                  </button>
                  <button
                    onClick={() => handleFinalizeAndSend('download_csv')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download & Finalize
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-[400px] border border-slate-800">
                <pre>{buildPbrcCsv()}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: DISPATCH EMAIL TO BILLING CLERK */}
          {activeTab === 'email_draft' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" /> Send End of Week Sheet to Billing Clerk
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Dispatches the full formatted weekly billing schedule directly to the PBRC billing clerk and finalizes all records.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyEmail}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Text
                    </button>
                    <button
                      onClick={() => handleFinalizeAndSend('eml')}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Generates desktop Outlook .eml file"
                    >
                      <Download className="w-3.5 h-3.5" /> Outlook .EML
                    </button>
                    <button
                      onClick={() => handleFinalizeAndSend('email')}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Send & Finalize
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 text-[11px]">To (Billing Clerk):</span>
                    <span className="ml-2 font-mono font-medium text-slate-800">{billingClerkEmail}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 text-[11px]">CC (Practice Admin):</span>
                    <span className="ml-2 font-mono font-medium text-slate-800">{ccEmail}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-bold text-slate-500 text-[11px]">Subject:</span>
                    <span className="ml-2 font-semibold text-slate-900">{emailSubject}</span>
                  </div>
                </div>
              </div>

              {/* Email Content Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-[420px] overflow-y-auto leading-relaxed shadow-inner">
                {buildClerkEmailText()}
              </div>
            </div>
          )}

          {/* TAB 5: PAST END OF WEEK SHEETS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Previously Finalized Weekly Billing Sheets
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Audit log of all sheets dispatched to the hospital PBRC billing clerk.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Batch ID / Ref</th>
                      <th className="py-2.5 px-3">Week Ending</th>
                      <th className="py-2.5 px-3">Provider</th>
                      <th className="py-2.5 px-3 text-center">Patients</th>
                      <th className="py-2.5 px-3 text-right">Total (AUD)</th>
                      <th className="py-2.5 px-3">Billing Clerk</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {existingSheets.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{s.id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{s.weekEndingDate}</td>
                        <td className="py-2.5 px-3 text-slate-700">{s.providerName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{s.patientCount}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">${s.totalFeeAud.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{s.billingClerkEmail}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Sending this sheet will automatically mark <strong>{selectedRecords.length} patients</strong> as <strong>Finalized & Billed</strong> with batch ref <strong>{pbrcBatchId}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => handleFinalizeAndSend('email')}
              disabled={selectedRecords.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send to Billing Clerk & Finalize ({selectedRecords.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
