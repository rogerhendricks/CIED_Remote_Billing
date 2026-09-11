import React, { useState, useMemo } from 'react';
import { PatientRecord, PortalVendor, BillingCode, LogStatus, EndOfWeekBillingSheet } from '../types';
import { BILLING_CODES, VENDOR_PORTALS, evaluateBillingEligibility } from '../data/billingCodes';
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Printer, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronDown,
  DollarSign,
  Users,
  Check,
  RotateCcw,
  FileSpreadsheet,
  CalendarCheck
} from 'lucide-react';

interface PracticeLogTableProps {
  records: PatientRecord[];
  onDeleteRecord: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: LogStatus) => void;
  onOpenAddModal: () => void;
  onOpenOutlookModal: (selectedRecords: PatientRecord[]) => void;
  onOpenPdfModal: (selectedRecords: PatientRecord[]) => void;
  onOpenEndOfWeekSheetModal: () => void;
  existingBillingSheets?: EndOfWeekBillingSheet[];
  onResetSampleData: () => void;
}

export const PracticeLogTable: React.FC<PracticeLogTableProps> = ({
  records,
  onDeleteRecord,
  onUpdateStatus,
  onOpenAddModal,
  onOpenOutlookModal,
  onOpenPdfModal,
  onOpenEndOfWeekSheetModal,
  existingBillingSheets = [],
  onResetSampleData
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedCode, setSelectedCode] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReviewer, setSelectedReviewer] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Unique reviewers
  const reviewers = useMemo(() => {
    return Array.from(new Set(records.map(r => r.loggedBy))).filter(Boolean);
  }, [records]);

  // Check Medicare frequency duplicate risks dynamically based on MBS rules:
  // - 11737: Max once in 4 weeks (28 days)
  // - 11736: Max 4 times in 12 months (365 days)
  // - 11725 & 11719: Max once in 90 days
  const recordsWithDuplicateChecks = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const dateA = new Date(a.visitDate.split('/').reverse().join('-')).getTime();
      const dateB = new Date(b.visitDate.split('/').reverse().join('-')).getTime();
      return dateB - dateA;
    });

    return sorted.map((r) => {
      const eligibility = evaluateBillingEligibility({
        patientIdOrMrn: r.patientIdOrMrn,
        patientName: r.patientName,
        deviceSerial: r.deviceSerial,
        billingCode: r.billingCode,
        records: sorted,
        currentRecordId: r.id,
        targetDateStr: r.visitDate || r.transmissionDate
      });

      const hasConflict = !eligibility.canBill || eligibility.status === 'COLLISION_CANNOT_BILL';

      return {
        ...r,
        isFlaggedDuplicate: hasConflict || r.isFlaggedDuplicate,
        conflictReason: hasConflict ? eligibility.reason : r.conflictReason
      };
    });
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return recordsWithDuplicateChecks.filter(r => {
      const matchesSearch = 
        r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.patientIdOrMrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.deviceSerial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.loggedBy.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesVendor = selectedVendor === 'all' || r.vendor === selectedVendor;
      const matchesCode = selectedCode === 'all' || r.billingCode === selectedCode;
      const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
      const matchesReviewer = selectedReviewer === 'all' || r.loggedBy === selectedReviewer;

      return matchesSearch && matchesVendor && matchesCode && matchesStatus && matchesReviewer;
    });
  }, [recordsWithDuplicateChecks, searchQuery, selectedVendor, selectedCode, selectedStatus, selectedReviewer]);

  // Bulk selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedRecords = useMemo(() => {
    return filteredRecords.filter(r => selectedIds.includes(r.id));
  }, [filteredRecords, selectedIds]);

  const targetRecordsForAction = selectedRecords.length > 0 ? selectedRecords : filteredRecords;

  // Totals for metrics
  const totalBillableAud = filteredRecords.reduce((acc, r) => acc + (BILLING_CODES[r.billingCode]?.mbsFeeAud || 0), 0);

  // CSV Export for Practice Management Systems (Genie, Best Practice, MedicalDirector)
  const handleExportCsv = () => {
    const headers = ['Visit Date', 'Patient Name', 'Patient ID/MRN', 'DOB', 'Vendor Portal', 'Device Model', 'Serial Number', 'Transmission Date', 'MBS Item Code', 'MBS Fee (AUD)', 'Reviewer', 'Status', 'Clinical Notes'];
    const rows = targetRecordsForAction.map(r => [
      `"${r.visitDate}"`,
      `"${r.patientName}"`,
      `"${r.patientIdOrMrn}"`,
      `"${r.patientDob || ''}"`,
      `"${VENDOR_PORTALS[r.vendor]?.name || r.vendor}"`,
      `"${r.deviceModel}"`,
      `"${r.deviceSerial}"`,
      `"${r.transmissionDate}"`,
      `"${r.billingCode}"`,
      `"${BILLING_CODES[r.billingCode]?.mbsFeeAud || 0}"`,
      `"${r.loggedBy}"`,
      `"${r.status}"`,
      `"${(r.clinicalFindings || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cardiac_Monitoring_Billing_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Reviews Logged</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredRecords.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all 4 portals</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Estimated MBS Billings</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">${totalBillableAud.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">MBS Items 11725, 11719, 11736, 11737</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Weekly Sheet</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {records.filter(r => r.status !== 'Finalized & Billed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ready for PBRC billing clerk</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Finalized & Billed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {records.filter(r => r.status === 'Finalized & Billed').length}
          </div>
          <div className="text-[11px] text-emerald-600/90 mt-0.5 font-medium">Dispatched to PBRC accounts</div>
        </div>
      </div>

      {/* Medicare Collision Alert Banner */}
      {recordsWithDuplicateChecks.filter(r => r.isFlaggedDuplicate).length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong className="text-rose-900 font-bold">
                {recordsWithDuplicateChecks.filter(r => r.isFlaggedDuplicate).length} Medicare Billing Collision(s) Flagged:
              </strong>{' '}
              <span>
                Patients marked with red alerts have conflicting claims within the Medicare rule exclusion window (e.g. 90-day interval or 4-claim annual cap). Set these to "Reviewed" instead of billing to maintain compliance.
              </span>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full self-start sm:self-auto">
            Medicare Rule Guard Active
          </span>
        </div>
      )}

      {/* Action Bar & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, ID/MRN, device, serial..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Prominent End of Week Billing Sheet trigger */}
            <button
              onClick={onOpenEndOfWeekSheetModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              title="Generate End of Week Billing Sheet for PBRC clerk and mark finalized"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-200" />
              <span>End of Week Billing Sheet</span>
              {records.filter(r => r.status !== 'Finalized & Billed').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {records.filter(r => r.status !== 'Finalized & Billed').length}
                </span>
              )}
            </button>

            <button
              onClick={() => onOpenOutlookModal(targetRecordsForAction)}
              className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              Outlook Email {selectedIds.length > 0 ? `(${selectedIds.length})` : 'All'}
            </button>

            <button
              onClick={() => onOpenPdfModal(targetRecordsForAction)}
              className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF Document
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download Excel / CSV file formatted for PMS import"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </button>

            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Vendor Portal</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800"
            >
              <option value="all">All Portals (4)</option>
              <option value="biotronik">Biotronik</option>
              <option value="boston_latitude">Boston Latitude</option>
              <option value="medtronic_carelink">Medtronic CareLink</option>
              <option value="abbott_merlin">Abbott Merlin</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">MBS Billing Item</label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800"
            >
              <option value="all">All Codes (11725, 11719, 11736, 11737)</option>
              <option value="11725">11725 - Pacemaker (PPM)</option>
              <option value="11719">11719 - Defibrillator (ICD)</option>
              <option value="11736">11736 - CRT Device</option>
              <option value="11737">11737 - Loop Recorder (ILR/ICM)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Claim Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800"
            >
              <option value="all">All Statuses</option>
              <option value="Logged">Logged</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Billed">Billed</option>
              <option value="Finalized & Billed">Finalized & Billed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Staff Member</label>
            <select
              value={selectedReviewer}
              onChange={(e) => setSelectedReviewer(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800"
            >
              <option value="all">All Staff Members</option>
              {reviewers.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Master Patient Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Patient Name & Details</th>
                <th className="py-3 px-3">Vendor Portal</th>
                <th className="py-3 px-3">Implanted Device & SN</th>
                <th className="py-3 px-3">Transmission Date</th>
                <th className="py-3 px-3">MBS Item & Fee</th>
                <th className="py-3 px-3">Reviewed By</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No patient records match the filters.</p>
                    <button
                      onClick={onResetSampleData}
                      className="mt-2 text-xs text-blue-600 underline hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Reset with sample patient logs from the 4 portals
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  const portalConfig = VENDOR_PORTALS[r.vendor];
                  const codeInfo = BILLING_CODES[r.billingCode];

                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      } ${r.isFlaggedDuplicate ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Patient Name + 90-day alert */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{r.patientName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">ID: {r.patientIdOrMrn}</span>
                          {r.patientDob && <span>• DOB: {r.patientDob}</span>}
                        </div>
                        {r.isFlaggedDuplicate && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded mt-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>{r.conflictReason || 'MBS Frequency Conflict: Claimed within interval'}</span>
                          </div>
                        )}
                      </td>

                      {/* Vendor Badge */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${portalConfig.badgeClass}`}>
                          {portalConfig.name.split(' ')[0]}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px]">{r.clinicName}</div>
                      </td>

                      {/* Device & Serial */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{r.deviceModel}</div>
                        <div className="text-[10px] font-mono text-slate-500">SN: {r.deviceSerial}</div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{r.transmissionDate}</div>
                        <div className="text-[10px] text-slate-400">Visited: {r.visitDate}</div>
                      </td>

                      {/* Billing Code */}
                      <td className="py-3 px-3">
                        <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                          {r.billingCode}
                        </span>
                        <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                          ${codeInfo?.mbsFeeAud || 0} AUD
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {r.loggedBy}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-3">
                        {r.status === 'Finalized & Billed' ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Finalized & Billed
                            </span>
                            {r.pbrcBatchRef && (
                              <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 truncate max-w-[130px]" title={r.pbrcBatchRef}>
                                {r.pbrcBatchRef.replace('-WESTMEAD', '')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <select
                            value={r.status}
                            onChange={(e) => onUpdateStatus(r.id, e.target.value as LogStatus)}
                            className={`text-xs font-bold px-2 py-1 rounded-md border cursor-pointer ${
                              r.status === 'Billed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              r.status === 'Reviewed' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="Logged">Logged</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Billed">Billed</option>
                            <option value="Finalized & Billed">Finalized & Billed</option>
                          </select>
                        )}
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Delete log entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Summary Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records
            {selectedIds.length > 0 && <span className="ml-2 font-bold text-blue-700">({selectedIds.length} selected for batch)</span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onResetSampleData}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reload Demo Sample Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
