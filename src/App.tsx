/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PatientRecord, LogStatus, ClinicStaff, EndOfWeekBillingSheet } from './types';
import { INITIAL_PATIENT_RECORDS } from './data/initialRecords';
import { PracticeLogTable } from './components/PracticeLogTable';
import { PortalSimulator } from './components/PortalSimulator';
import { BrainstormingAnalysis } from './components/BrainstormingAnalysis';
import { ExtensionDownloader } from './components/ExtensionDownloader';
import { OutlookEmailModal } from './components/OutlookEmailModal';
import { PdfReportModal } from './components/PdfReportModal';
import { AddRecordModal } from './components/AddRecordModal';
import { EndOfWeekBillingSheetModal } from './components/EndOfWeekBillingSheetModal';
import { ClinicLockScreen, CLINIC_STAFF_MEMBERS } from './components/ClinicLockScreen';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { StorageArchitectureModal } from './components/StorageArchitectureModal';
import { 
  Activity, 
  Layers, 
  FolderDown, 
  Lightbulb, 
  HeartPulse, 
  Mail, 
  Printer, 
  ShieldCheck, 
  Users, 
  Building2,
  Bell,
  Lock,
  Key,
  Database
} from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'log' | 'simulator' | 'extension' | 'brainstorm'>('log');

  // Security and Clinic Staff Authentication State
  const [clinicSecurityKey, setClinicSecurityKey] = useState<string>('CARDIO-WESTMEAD-8820');
  const [activeStaff, setActiveStaff] = useState<ClinicStaff>(CLINIC_STAFF_MEMBERS[0]);
  const [sessionToken, setSessionToken] = useState<string>('dev-session-cardiac-auth');
  const [isStationLocked, setIsStationLocked] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);

  // Master records with localStorage and Hub API synchronization
  const [records, setRecords] = useState<PatientRecord[]>(() => {
    try {
      const saved = localStorage.getItem('cardiac_practice_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved records', e);
    }
    return INITIAL_PATIENT_RECORDS;
  });

  // End of Week Billing Sheets store
  const [billingSheets, setBillingSheets] = useState<EndOfWeekBillingSheet[]>(() => {
    try {
      const saved = localStorage.getItem('cardiac_practice_billing_sheets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved billing sheets', e);
    }
    return [];
  });

  const [isHubOnline, setIsHubOnline] = useState<boolean>(true);

  // Poll / sync with Backend Express Server using authenticated headers
  const fetchHubRecords = async () => {
    try {
      const res = await fetch('/api/records', {
        headers: {
          'X-Clinic-Key': clinicSecurityKey,
          'X-Session-Token': sessionToken
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          setRecords(data.records);
          setIsHubOnline(true);
        }
      } else if (res.status === 401) {
        // Auth rejected
        setIsHubOnline(false);
      }

      // Fetch saved billing sheets
      const sheetsRes = await fetch('/api/billing-sheets', {
        headers: {
          'X-Clinic-Key': clinicSecurityKey,
          'X-Session-Token': sessionToken
        }
      });
      if (sheetsRes.ok) {
        const sheetsData = await sheetsRes.json();
        if (sheetsData.sheets) {
          setBillingSheets(sheetsData.sheets);
        }
      }
    } catch (err) {
      // Backend may be running purely client-side in preview
      setIsHubOnline(false);
    }
  };

  useEffect(() => {
    fetchHubRecords();
    const interval = setInterval(fetchHubRecords, 10000); // 10s live sync for multi-user
    return () => clearInterval(interval);
  }, [clinicSecurityKey, sessionToken]);

  // Auto-lock on inactivity timer (Australian Privacy APP 11 compliance)
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    if (autoLockMinutes === 0) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    const checkInterval = setInterval(() => {
      if (isStationLocked) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > autoLockMinutes * 60 * 1000) {
        setIsStationLocked(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearInterval(checkInterval);
    };
  }, [autoLockMinutes, isStationLocked]);

  // Modals state
  const [isOutlookOpen, setIsOutlookOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEndOfWeekModalOpen, setIsEndOfWeekModalOpen] = useState(false);
  const [activeRecordsForModal, setActiveRecordsForModal] = useState<PatientRecord[]>([]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cardiac_practice_records', JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records', e);
    }
  }, [records]);

  // Save billing sheets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cardiac_practice_billing_sheets', JSON.stringify(billingSheets));
    } catch (e) {
      console.error('Failed to save billing sheets', e);
    }
  }, [billingSheets]);

  // Handler for End of Week Billing Sheet Finalization
  const handleFinalizeBillingSheet = async (sheet: EndOfWeekBillingSheet, recordIds: string[]) => {
    const now = new Date().toISOString();
    setRecords(prev => prev.map(r => {
      if (recordIds.includes(r.id)) {
        return {
          ...r,
          status: 'Finalized & Billed' as LogStatus,
          eowSheetId: sheet.id,
          pbrcBatchRef: sheet.pbrcBatchRef,
          finalizedAt: now,
          finalizedBy: sheet.sentByStaff
        };
      }
      return r;
    }));

    setBillingSheets(prev => [sheet, ...prev.filter(s => s.id !== sheet.id)]);

    try {
      await fetch('/api/billing-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Clinic-Key': clinicSecurityKey,
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify(sheet)
      });
    } catch (e) {
      console.error('Failed to persist billing sheet to server', e);
    }
  };

  // Record handlers with Authenticated API integration
  const handleAddRecord = async (newRec: PatientRecord) => {
    setRecords(prev => [newRec, ...prev]);
    try {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Clinic-Key': clinicSecurityKey,
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify(newRec)
      });
    } catch (e) {
      // Offline fallback
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/records/${id}`, { 
        method: 'DELETE',
        headers: {
          'X-Clinic-Key': clinicSecurityKey,
          'X-Session-Token': sessionToken
        }
      });
    } catch (e) {
      // Offline fallback
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: LogStatus) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    try {
      await fetch(`/api/records/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Clinic-Key': clinicSecurityKey,
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      // Offline fallback
    }
  };

  const handleResetSampleData = () => {
    setRecords(INITIAL_PATIENT_RECORDS);
  };

  const handleMarkAsEmailed = (ids: string[]) => {
    setRecords(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'Emailed' } : r));
    setIsOutlookOpen(false);
  };

  const handleOpenOutlook = (subset: PatientRecord[]) => {
    setActiveRecordsForModal(subset.length > 0 ? subset : records);
    setIsOutlookOpen(true);
  };

  const handleOpenPdf = (subset: PatientRecord[]) => {
    setActiveRecordsForModal(subset.length > 0 ? subset : records);
    setIsPdfOpen(true);
  };

  const handleUnlockStation = (staff: ClinicStaff, token: string) => {
    setActiveStaff(staff);
    setSessionToken(token);
    setIsStationLocked(false);
    lastActivityRef.current = Date.now();
  };


  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Practice Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
            {/* Logo & Clinic Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                    Cardiac Device Remote Monitoring & Billing Hub
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    MBS Codes: 11725, 11719, 11736, 11737
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Westmead Hospital Cardiology Practice
                  </span>
                  <span>•</span>
                  <span>Biotronik, Latitude NXT, CareLink, Merlin.net</span>
                </div>
              </div>
            </div>

            {/* Current Reviewer Profile & Quick Batch Dispatch */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Hub API: Online</span>
              </div>

              {/* SQLite Database Engine Status & Multi-Clinician Architecture */}
              <button
                onClick={() => setIsStorageModalOpen(true)}
                title="View SQLite 3 Database Status, Concurrency & Medicare Compliance Audit"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">SQLite Engine</span>
              </button>

              {/* LAN Security & Keys button */}
              <button
                onClick={() => setIsSecurityModalOpen(true)}
                title="Configure Clinic Hub LAN Security & Extension Key"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">LAN Security</span>
              </button>

              {/* Lock Station Button */}
              <button
                onClick={() => setIsStationLocked(true)}
                title="Lock Station Screen (Australian Privacy APP 11 Compliance)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Lock</span>
              </button>

              <button
                onClick={() => setActiveTab('brainstorm')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>LAN Setup</span>
              </button>

              {/* Active Staff profile */}
              <div 
                onClick={() => setIsStationLocked(true)}
                title="Click to Switch Staff or Lock Station"
                className="flex items-center gap-2.5 pl-2 border-l border-slate-200 cursor-pointer hover:opacity-80"
              >
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">{activeStaff.name}</span>
                  <span className="text-[10px] text-slate-500">{activeStaff.role}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center border border-slate-200 shadow-xs">
                  {activeStaff.initials}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Bar Tabs */}
          <div className="flex space-x-1 sm:space-x-4 border-t border-slate-100 pt-1 -mb-px overflow-x-auto text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('log')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'log'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              Practice Log & Billing ({records.length})
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              Portal Scraper Simulator (4 Portals)
            </button>

            <button
              onClick={() => setActiveTab('extension')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'extension'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <FolderDown className="w-4 h-4" />
              Browser Extension Package (.zip)
            </button>

            <button
              onClick={() => setActiveTab('brainstorm')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'brainstorm'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Brainstorming & Risk Analysis
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'log' && (
          <PracticeLogTable
            records={records}
            onDeleteRecord={handleDeleteRecord}
            onUpdateStatus={handleUpdateStatus}
            onOpenAddModal={() => setIsAddOpen(true)}
            onOpenOutlookModal={handleOpenOutlook}
            onOpenPdfModal={handleOpenPdf}
            onOpenEndOfWeekSheetModal={() => setIsEndOfWeekModalOpen(true)}
            existingBillingSheets={billingSheets}
            onResetSampleData={handleResetSampleData}
          />
        )}

        {activeTab === 'simulator' && (
          <PortalSimulator
            records={records}
            onUpdateStatus={handleUpdateStatus}
            onSaveRecord={handleAddRecord}
            onDraftOutlook={(rec) => {
              setActiveRecordsForModal([rec]);
              setIsOutlookOpen(true);
            }}
          />
        )}

        {activeTab === 'extension' && (
          <ExtensionDownloader />
        )}

        {activeTab === 'brainstorm' && (
          <BrainstormingAnalysis />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Cardiac Remote Monitoring Practice Hub • Tailored for Medicare Items 11725, 11719, 11736 & 11737</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy & 90-Day Rule Audit Engine Active
            </span>
          </div>
        </div>
      </footer>

      {/* Modals & Screens */}
      {isStationLocked && (
        <ClinicLockScreen
          clinicSecurityKey={clinicSecurityKey}
          onUnlock={handleUnlockStation}
        />
      )}

      {isSecurityModalOpen && (
        <SecuritySettingsModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          clinicSecurityKey={clinicSecurityKey}
          autoLockMinutes={autoLockMinutes}
          onUpdateAutoLock={(mins) => setAutoLockMinutes(mins)}
          onLockStationNow={() => setIsStationLocked(true)}
        />
      )}

      {isStorageModalOpen && (
        <StorageArchitectureModal
          isOpen={isStorageModalOpen}
          onClose={() => setIsStorageModalOpen(false)}
          clinicSecurityKey={clinicSecurityKey}
          sessionToken={sessionToken}
        />
      )}

      {isOutlookOpen && (
        <OutlookEmailModal
          records={activeRecordsForModal}
          onClose={() => setIsOutlookOpen(false)}
          onMarkAsEmailed={handleMarkAsEmailed}
        />
      )}

      {isPdfOpen && (
        <PdfReportModal
          records={activeRecordsForModal}
          onClose={() => setIsPdfOpen(false)}
        />
      )}

      {isEndOfWeekModalOpen && (
        <EndOfWeekBillingSheetModal
          isOpen={isEndOfWeekModalOpen}
          onClose={() => setIsEndOfWeekModalOpen(false)}
          records={records}
          activeStaff={activeStaff}
          clinicName="Westmead Hospital Cardiology Remote Monitoring Practice"
          onFinalizeSheet={handleFinalizeBillingSheet}
          existingSheets={billingSheets}
        />
      )}

      {isAddOpen && (
        <AddRecordModal
          onClose={() => setIsAddOpen(false)}
          onAddRecord={handleAddRecord}
        />
      )}
    </div>
  );
}
