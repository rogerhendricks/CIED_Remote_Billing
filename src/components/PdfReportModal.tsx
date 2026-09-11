import React, { useRef } from 'react';
import { PatientRecord } from '../types';
import { BILLING_CODES, VENDOR_PORTALS } from '../data/billingCodes';
import { Printer, X, Download, FileText, CheckCircle2 } from 'lucide-react';

interface PdfReportModalProps {
  records: PatientRecord[];
  onClose: () => void;
  clinicName?: string;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  records,
  onClose,
  clinicName = 'Westmead Hospital Cardiology Remote Monitoring Practice'
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const totalPatients = records.length;
  const totalAud = records.reduce((acc, r) => acc + (BILLING_CODES[r.billingCode]?.mbsFeeAud || 0), 0);

  // Group counts by code
  const codeCounts = records.reduce((acc, r) => {
    acc[r.billingCode] = (acc[r.billingCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Remote Monitoring Clinical & Billing PDF Report</h3>
              <p className="text-xs text-slate-500">Print or save as high-resolution PDF document for clinical records and billing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          <div 
            ref={reportRef}
            className="bg-white p-8 sm:p-10 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 max-w-3xl mx-auto text-slate-800 space-y-6"
          >
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-700 block">
                  Cardiac Electrophysiology & Device Service
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">
                  Remote Cardiac Device Monitoring Summary
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">{clinicName}</p>
              </div>

              <div className="text-right text-xs space-y-1">
                <div>Date Generated: <strong>{new Date().toLocaleDateString('en-AU')}</strong></div>
                <div>Audit Period: <strong>Current Surveillance Cycle</strong></div>
                <div>Total Reviewed: <strong>{totalPatients} Patients</strong></div>
              </div>
            </div>

            {/* Billing Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-center p-2">
                <span className="text-[11px] font-bold text-slate-500 block">MBS 11725 (PPM)</span>
                <span className="text-xl font-black text-slate-900">{codeCounts['11725'] || 0}</span>
                <span className="text-[10px] text-slate-400 block">$44.55 ea</span>
              </div>
              <div className="text-center p-2">
                <span className="text-[11px] font-bold text-slate-500 block">MBS 11719 (ICD)</span>
                <span className="text-xl font-black text-slate-900">{codeCounts['11719'] || 0}</span>
                <span className="text-[10px] text-slate-400 block">$89.15 ea</span>
              </div>
              <div className="text-center p-2">
                <span className="text-[11px] font-bold text-slate-500 block">MBS 11736 (ILR - AF)</span>
                <span className="text-xl font-black text-slate-900">{codeCounts['11736'] || 0}</span>
                <span className="text-[10px] text-slate-400 block">$35.80 ea</span>
              </div>
              <div className="text-center p-2">
                <span className="text-[11px] font-bold text-slate-500 block">MBS 11737 (ILR - Stroke/Syncope)</span>
                <span className="text-xl font-black text-slate-900">{codeCounts['11737'] || 0}</span>
                <span className="text-[10px] text-slate-400 block">$35.80 ea</span>
              </div>
            </div>

            {/* Total Rebate Banner */}
            <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-lg border border-blue-200 text-xs">
              <span className="font-semibold text-blue-900">Estimated Practice Total Medicare Benefits Schedule (MBS) Value:</span>
              <span className="text-base font-black text-blue-900">${totalAud.toFixed(2)} AUD</span>
            </div>

            {/* Patient Table */}
            <div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[11px] uppercase tracking-wider text-slate-500 font-bold bg-slate-50">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Patient & ID</th>
                    <th className="py-2.5 px-3">Portal / Vendor</th>
                    <th className="py-2.5 px-3">Device & Serial</th>
                    <th className="py-2.5 px-3">Trans. Date</th>
                    <th className="py-2.5 px-3">Billing Code</th>
                    <th className="py-2.5 px-3">Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{r.patientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {r.patientIdOrMrn} {r.patientDob ? `| DOB: ${r.patientDob}` : ''}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {VENDOR_PORTALS[r.vendor]?.name.replace(' Network', '').replace(' PCN', '')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{r.deviceModel}</div>
                        <div className="text-[10px] font-mono text-slate-500">SN: {r.deviceSerial}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.transmissionDate}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          {r.billingCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{r.loggedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature & Compliance Footer */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="font-bold text-slate-900">Clinical Reviewer Sign-Off:</p>
                <div className="mt-8 border-b border-slate-400 w-64"></div>
                <p className="text-[11px] text-slate-500 mt-1">Cardiac Technologist / Specialist Cardiologist</p>
                <p className="text-[11px] text-slate-400">Date: ____ / ____ / ________</p>
              </div>

              <div className="text-right text-[10px] text-slate-400 space-y-1">
                <p>Confidential Medical Record — For Official Practice & Billing Use Only</p>
                <p>Governed by Australian Privacy Principles & Health Records Act</p>
                <p>MBS Compliance: Verify 90-day intervals prior to Medicare claim submission</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
