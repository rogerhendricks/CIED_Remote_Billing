import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Key, 
  Building2, 
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { ClinicStaff } from '../types';

export const CLINIC_STAFF_MEMBERS: ClinicStaff[] = [
  {
    id: 'staff-1',
    name: 'Roger Hendricks',
    role: 'Cardiac Technologist / EP Specialist',
    initials: 'RH',
    pin: ''
  },
  {
    id: 'staff-2',
    name: 'Sarah Chen, RN',
    role: 'Cardiac Device Specialist Nurse',
    initials: 'SC',
    pin: ''
  },
  {
    id: 'staff-3',
    name: 'Dr. David Tanous',
    role: 'Consultant Cardiologist & EP',
    initials: 'DT',
    pin: ''
  }
];

interface ClinicLockScreenProps {
  onUnlock: (staff: ClinicStaff, sessionToken: string) => void;
  clinicSecurityKey: string;
}

export const ClinicLockScreen: React.FC<ClinicLockScreenProps> = ({
  onUnlock,
  clinicSecurityKey
}) => {
  const [selectedStaff, setSelectedStaff] = useState<ClinicStaff>(CLINIC_STAFF_MEMBERS[0]);
  const [pin, setPin] = useState<string>('');
  const [useMasterKey, setUseMasterKey] = useState<boolean>(false);
  const [masterKeyInput, setMasterKeyInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsAuthenticating(true);

    try {
      if (useMasterKey) {
        if (!masterKeyInput.trim()) {
          setErrorMsg('Please enter the Master Clinic Security Key.');
          setIsAuthenticating(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passcode: masterKeyInput.trim(),
            staffName: 'Clinic Administrator'
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const adminStaff: ClinicStaff = {
            id: 'admin',
            name: 'Clinic Administrator',
            role: 'Practice Administrator',
            initials: 'CA',
            pin: ''
          };
          onUnlock(adminStaff, data.sessionToken);
          return;
        } else {
          setErrorMsg(data.error || 'Invalid Clinic Security Key. Please verify with your Practice Manager.');
          setIsAuthenticating(false);
          return;
        }
      }

      if (!pin.trim()) {
        setErrorMsg('Please enter your Staff PIN.');
        setIsAuthenticating(false);
        return;
      }

      // Check PIN via server authentication
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pin.trim(),
          staffName: selectedStaff.name
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onUnlock(selectedStaff, data.sessionToken);
      } else {
        setErrorMsg(data.error || 'Incorrect Staff PIN. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to Hub Server. Please verify local network connection.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleQuickDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6 text-blue-300" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Cardiac Device Practice Hub</h2>
          <p className="text-xs text-blue-200 mt-1 flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Westmead Hospital Cardiology
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-3 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Station Locked • PHI Protected
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50/70 border-b border-blue-100 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-tight">
            <strong>Clinical Station Authentication:</strong> Staff login is required to view confidential patient records and MBS billing summaries.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {!useMasterKey ? (
            <>
              {/* Select Staff Member */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select Staff Member:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {CLINIC_STAFF_MEMBERS.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setPin('');
                        setErrorMsg('');
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        selectedStaff.id === staff.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          selectedStaff.id === staff.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {staff.initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{staff.name}</div>
                          <div className="text-[10px] text-slate-500">{staff.role}</div>
                        </div>
                      </div>
                      {selectedStaff.id === staff.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Entry */}
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Enter Staff PIN for {selectedStaff.name.split(' ')[0]}:
                    </label>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      autoFocus
                      className="w-full text-center tracking-[0.6em] text-2xl font-bold py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Quick Keypad */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === 'C') setPin('');
                        else if (k === '⌫') setPin(prev => prev.slice(0, -1));
                        else handleQuickDigit(k);
                      }}
                      className="h-10 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-blue-100 text-slate-800 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center border border-slate-200/70"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isAuthenticating ? 'Verifying...' : 'Unlock Station'}</span>
                </button>
              </form>
            </>
          ) : (
            /* Master Clinic Security Key Option */
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Master Clinic Security Key:
                  </label>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-bold">
                    Admin Key
                  </span>
                </div>
                <input
                  type="password"
                  value={masterKeyInput}
                  onChange={(e) => setMasterKeyInput(e.target.value)}
                  placeholder="Enter Master Security Key"
                  autoFocus
                  className="w-full text-center font-mono font-bold py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Authorized clinic administrators can unlock with the master security key configured in server environment.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                <span>{isAuthenticating ? 'Verifying...' : 'Verify Master Key & Unlock'}</span>
              </button>
            </form>
          )}

          {/* Toggle between Staff PIN and Master Key */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setUseMasterKey(!useMasterKey);
                setErrorMsg('');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
            >
              {useMasterKey ? '← Back to Staff PIN Sign In' : '🔑 Unlock with Master Clinic Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
