import React, { useState } from 'react';
import { PatientRecord, PortalVendor, BillingCode, LogStatus } from '../types';
import { BILLING_CODES, VENDOR_PORTALS, recommendBillingCode } from '../data/billingCodes';
import { X, Plus, Sparkles } from 'lucide-react';

interface AddRecordModalProps {
  onClose: () => void;
  onAddRecord: (record: PatientRecord) => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({ onClose, onAddRecord }) => {
  const [patientName, setPatientName] = useState('');
  const [patientIdOrMrn, setPatientIdOrMrn] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [vendor, setVendor] = useState<PortalVendor>('biotronik');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [deviceCategory, setDeviceCategory] = useState<PatientRecord['deviceCategory']>('PPM');
  const [transmissionDate, setTransmissionDate] = useState(new Date().toLocaleDateString('en-AU'));
  const [visitDate, setVisitDate] = useState(new Date().toLocaleDateString('en-AU'));
  const [billingCode, setBillingCode] = useState<BillingCode>('11725');
  const [loggedBy, setLoggedBy] = useState('R. Hendricks');
  const [clinicName, setClinicName] = useState('Westmead Hospital Cardiology');
  const [status, setStatus] = useState<LogStatus>('Logged');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [notes, setNotes] = useState('');

  const handleDeviceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeviceModel(val);
    if (val.trim()) {
      const autoCode = recommendBillingCode(val);
      setBillingCode(autoCode);
      if (autoCode === '11736') setDeviceCategory('CRT-D');
      else if (autoCode === '11737') setDeviceCategory('ILR/ICM');
      else if (autoCode === '11719') setDeviceCategory('ICD');
      else setDeviceCategory('PPM');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientIdOrMrn) return;

    const newRecord: PatientRecord = {
      id: 'rec-' + Date.now(),
      patientName,
      patientIdOrMrn,
      patientDob: patientDob || undefined,
      vendor,
      portalUrl: `https://${VENDOR_PORTALS[vendor].domain}`,
      deviceModel: deviceModel || 'Standard Implantable Device',
      deviceSerial: deviceSerial || 'N/A',
      deviceCategory,
      transmissionDate,
      visitDate,
      billingCode,
      loggedBy,
      clinicName,
      status,
      clinicalFindings: clinicalFindings || undefined,
      notes: notes || undefined
    };

    onAddRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Add Patient Remote Monitoring Log</h3>
              <p className="text-xs text-slate-500">Record a cardiac transmission and assign Medicare billing item.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient Name *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Smith, John"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient ID / MRN *</label>
              <input
                type="text"
                required
                value={patientIdOrMrn}
                onChange={(e) => setPatientIdOrMrn(e.target.value)}
                placeholder="e.g. 5581902"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor Portal</label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value as PortalVendor)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                {(Object.keys(VENDOR_PORTALS) as PortalVendor[]).map((v) => (
                  <option key={v} value={v}>{VENDOR_PORTALS[v].name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="text"
                value={patientDob}
                onChange={(e) => setPatientDob(e.target.value)}
                placeholder="e.g. 14/02/1985"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Device Model</span>
                <span className="text-[10px] text-blue-600 font-normal flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> Auto-predicts code
                </span>
              </label>
              <input
                type="text"
                value={deviceModel}
                onChange={handleDeviceChange}
                placeholder="e.g. Quadra Assura MP CRT-D"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
                placeholder="e.g. RNJ157637G"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
            <label className="block font-bold text-blue-900">MBS Billing Item Code</label>
            <select
              value={billingCode}
              onChange={(e) => setBillingCode(e.target.value as BillingCode)}
              className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 font-bold text-blue-950"
            >
              <option value="11736">11736 - Loop Recorder (AF investigation) [Max 4 per 12 mos] ($35.80)</option>
              <option value="11737">11737 - Loop Recorder (Stroke/Syncope) [Once per 4 wks] ($35.80)</option>
              <option value="11725">11725 - Pacemaker (PPM) [Once per 90 days] ($44.55)</option>
              <option value="11719">11719 - Defibrillator (ICD / CRT-D) [Once per 90 days] ($89.15)</option>
            </select>
            <div className="text-[11px] text-blue-900 leading-tight space-y-0.5">
              <div><strong>Rule:</strong> {BILLING_CODES[billingCode].frequencyRule}</div>
              <div className="text-blue-700">{BILLING_CODES[billingCode].description}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transmission Date</label>
              <input
                type="text"
                value={transmissionDate}
                onChange={(e) => setTransmissionDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reviewer / Staff Name</label>
              <input
                type="text"
                value={loggedBy}
                onChange={(e) => setLoggedBy(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinical Findings</label>
            <textarea
              rows={2}
              value={clinicalFindings}
              onChange={(e) => setClinicalFindings(e.target.value)}
              placeholder="e.g. Stable thresholds, VP 100%, battery longevity 11 years..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-all shadow-sm"
            >
              Add Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
