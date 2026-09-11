import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  Lock, 
  Clock, 
  Terminal, 
  Wifi, 
  AlertTriangle, 
  FileCheck,
  Server,
  HelpCircle,
  Laptop
} from 'lucide-react';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicSecurityKey: string;
  autoLockMinutes: number;
  onUpdateAutoLock: (mins: number) => void;
  onLockStationNow: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  clinicSecurityKey,
  autoLockMinutes,
  onUpdateAutoLock,
  onLockStationNow
}) => {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [copiedLinuxCmd, setCopiedLinuxCmd] = useState<boolean>(false);
  const [copiedService, setCopiedService] = useState<boolean>(false);
  const [copiedWifiCmd, setCopiedWifiCmd] = useState<boolean>(false);
  const [copiedHotspotCmd, setCopiedHotspotCmd] = useState<boolean>(false);
  const [copiedPocketCmd, setCopiedPocketCmd] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'keys' | 'wireless' | 'firewall' | 'vlan'>('wireless');
  const [firewallOs, setFirewallOs] = useState<'linux' | 'windows'>('linux');
  const [wirelessMode, setWirelessMode] = useState<'client' | 'hotspot' | 'pocket'>('pocket');

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(clinicSecurityKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const firewallCmd = `New-NetFirewallRule -DisplayName "Clinic Cardiac Hub Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -RemoteAddress 192.168.1.0/24`;

  const linuxUfwCmd = `sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp comment 'Cardiac Billing Hub'`;

  const linuxWifiClientCmd = `# 1. Connect Linux Server to Clinic Staff Wi-Fi (No cables needed!)
sudo nmcli dev wifi connect "YourClinicStaffWiFi" password "YourWifiPassword"

# 2. Set static IP so the hub address is permanent
sudo nmcli con mod "YourClinicStaffWiFi" ipv4.addresses 192.168.1.150/24 ipv4.gateway 192.168.1.1 ipv4.dns "1.1.1.1 8.8.8.8" ipv4.method manual

# 3. Disable Wi-Fi power-save so the wireless card stays active 24/7
sudo nmcli con mod "YourClinicStaffWiFi" 802-11-wireless.powersave 2
sudo nmcli con up "YourClinicStaffWiFi"`;

  const linuxHotspotCmd = `# Create an isolated, secure Wi-Fi Hotspot broadcast directly from the Linux PC
sudo nmcli dev wifi hotspot ifname wlan0 ssid "CardioHub-Staff" password "CardioSafe2026!"

# Check the hotspot IP (default is usually 10.42.0.1 or 192.168.4.1)
ip addr show wlan0`;

  const linuxPocketCmd = `# 1. Set static IP on Linux Ethernet port (GL.iNet travel router default subnet is 192.168.8.x)
sudo nmcli con mod "Wired connection 1" ipv4.addresses 192.168.8.100/24 ipv4.gateway 192.168.8.1 ipv4.dns "192.168.8.1 1.1.1.1" ipv4.method manual
sudo nmcli con up "Wired connection 1"

# 2. Restrict Linux UFW Firewall to the travel router's private subnet
sudo ufw allow from 192.168.8.0/24 to any port 3000 proto tcp comment 'CardioHub Travel Router'
sudo ufw enable`;

  const linuxServiceConfig = `[Unit]
Description=Cardiac Remote Monitoring Billing Hub
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/cardiac-hub
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=CLINIC_SECURITY_KEY=CARDIO-WESTMEAD-8820

[Install]
WantedBy=multi-user.target`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(firewallCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopyLinuxCmd = () => {
    navigator.clipboard.writeText(linuxUfwCmd);
    setCopiedLinuxCmd(true);
    setTimeout(() => setCopiedLinuxCmd(false), 2000);
  };

  const handleCopyService = () => {
    navigator.clipboard.writeText(linuxServiceConfig);
    setCopiedService(true);
    setTimeout(() => setCopiedService(false), 2000);
  };

  const handleCopyWifiCmd = () => {
    navigator.clipboard.writeText(linuxWifiClientCmd);
    setCopiedWifiCmd(true);
    setTimeout(() => setCopiedWifiCmd(false), 2000);
  };

  const handleCopyHotspotCmd = () => {
    navigator.clipboard.writeText(linuxHotspotCmd);
    setCopiedHotspotCmd(true);
    setTimeout(() => setCopiedHotspotCmd(false), 2000);
  };

  const handleCopyPocketCmd = () => {
    navigator.clipboard.writeText(linuxPocketCmd);
    setCopiedPocketCmd(true);
    setTimeout(() => setCopiedPocketCmd(false), 2000);
  };



  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Clinic Hub Security & Network Access</h3>
              <p className="text-xs text-slate-300">Authentication keys, auto-lock timeouts, and LAN isolation controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('wireless')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'wireless'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-blue-600" />
            100% Wireless Setup (No Cables)
          </button>
          <button
            onClick={() => setActiveSubTab('keys')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'keys'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Clinic Key & Auto-Lock
          </button>
          <button
            onClick={() => setActiveSubTab('firewall')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'firewall'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Firewall & Systemd (Linux/Win)
          </button>
          <button
            onClick={() => setActiveSubTab('vlan')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'vlan'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Guest Wi-Fi Isolation
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {activeSubTab === 'wireless' && (
            <div className="space-y-5">
              {/* Architecture introduction banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  Zero-Cable Deployment: 3 Ways to Run on Wi-Fi
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  In a clinical practice where running network cables across floors or through walls is not feasible, your Linux server can operate <strong>100% wirelessly</strong>. Choose the approach that fits your clinic setup:
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setWirelessMode('pocket')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    wirelessMode === 'pocket'
                      ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                    <span>Option 3: Travel Bridge</span>
                    {wirelessMode === 'pocket' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-1">★ Selected by Clinic</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pocket travel router (GL.iNet/TP-Link) creates private staff Wi-Fi & bridges clinic internet.
                  </p>
                </button>

                <button
                  onClick={() => setWirelessMode('client')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    wirelessMode === 'client'
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                    <span>Option 1: Wi-Fi Client</span>
                    {wirelessMode === 'client' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold mt-1">Direct Wi-Fi</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Linux server connects directly to clinic staff Wi-Fi without a separate device.
                  </p>
                </button>

                <button
                  onClick={() => setWirelessMode('hotspot')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    wirelessMode === 'hotspot'
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                    <span>Option 2: Linux Hotspot</span>
                    {wirelessMode === 'hotspot' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold mt-1">OS Broadcast</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Linux Wi-Fi card creates an internal AP directly without extra hardware.
                  </p>
                </button>
              </div>

              {/* Mode Details */}
              {wirelessMode === 'pocket' && (
                <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">✓</span>
                      Option 3: Travel Bridge Setup Walkthrough
                    </h4>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      Clinic Standard
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    This setup gives you the best of both worlds: <strong>zero cables across the clinic</strong>, full internet connectivity for Biotronik / CareLink / Latitude / Merlin, and a private, firewalled Wi-Fi network dedicated to your cardiac remote monitoring team.
                  </p>

                  {/* 4-Step Setup Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                        Hardware Placement & Power
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Place a pocket router (e.g. <strong>GL.iNet Opal / Beryl AX</strong> or <strong>TP-Link TL-WR902AC</strong>, ~$40-$60) directly beside your Linux server. Connect a short 15cm Ethernet patch cable between the router's LAN port and the Linux server (or connect via Wi-Fi).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                        Repeater Mode (Wire-Free Internet)
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Open the travel router admin page (<code className="font-mono text-blue-700 font-bold">http://192.168.8.1</code>) on a laptop. Under <strong>Internet → Repeater</strong>, connect wirelessly to your clinic's existing staff Wi-Fi. The pocket router now bridges internet wirelessly!
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                        Private Staff Wi-Fi Network
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Name your private Wi-Fi SSID <code className="font-mono font-bold text-slate-800">CardioHub-Staff</code> with a secure WPA2/WPA3 password. Staff laptops join this network for automatic access to both the internet and the Linux hub.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                        Extension Hub Endpoint
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        In the Chrome / Edge extension settings, set the Hub URL to <code className="font-mono text-blue-700 font-bold">http://192.168.8.100:3000</code> and key <code className="font-mono text-slate-800 font-bold">{clinicSecurityKey}</code>. 1-click captures will sync in under 50ms.
                      </p>
                    </div>
                  </div>

                  {/* Terminal Command for Linux static IP & UFW on Pocket Router subnet */}
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>Linux Server Configuration (Static IP & UFW on 192.168.8.x)</span>
                      <button
                        onClick={handleCopyPocketCmd}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPocketCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPocketCmd ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-emerald-400 whitespace-pre font-mono text-[11px] overflow-x-auto select-all">
                      {linuxPocketCmd}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Security Advantage of the Travel Bridge:</span>
                      Because the pocket router operates its own Network Address Translation (NAT) firewall, <strong>phones or computers on the general clinic Wi-Fi or patient guest Wi-Fi cannot even see the Linux server or staff laptops</strong>.
                    </div>
                  </div>
                </div>
              )}

              {wirelessMode === 'client' && (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      How Option 1 Works (Linux as Wireless Station):
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Your Linux server (laptop or small mini-PC) uses its onboard Wi-Fi to join your existing clinic staff Wi-Fi network. Both the Linux server and your staff laptops share the same wireless network. Laptops can browse Biotronik, CareLink, Latitude, and Merlin over the clinic internet while logging to the Hub at <code className="text-blue-700 font-bold">http://192.168.1.150:3000</code>.
                    </p>
                  </div>

                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>Linux Terminal Commands (nmcli)</span>
                      <button
                        onClick={handleCopyWifiCmd}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedWifiCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWifiCmd ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-emerald-400 whitespace-pre font-mono text-[11px] overflow-x-auto select-all">
                      {linuxWifiClientCmd}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <div className="font-bold">Crucial Linux Wi-Fi Setting: Disable Powersave</div>
                    <p>
                      By default, Linux power management puts Wi-Fi chips to sleep after 10 minutes of idle time. The command above sets <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">powersave 2</code> (disabled), guaranteeing the Hub answers extension queries 24/7 without lag.
                    </p>
                  </div>
                </div>
              )}

              {wirelessMode === 'hotspot' && (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      How Option 2 Works (Linux as Standalone Access Point):
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      If your hospital or clinic IT department blocks device-to-device communication on the clinic Wi-Fi, your Linux PC can broadcast its own dedicated Wi-Fi network (e.g. <code className="text-indigo-700 font-bold">CardioHub-Staff</code>). Staff laptops connect directly to this Wi-Fi.
                    </p>
                  </div>

                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>Create Standalone Linux Hotspot</span>
                      <button
                        onClick={handleCopyHotspotCmd}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedHotspotCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedHotspotCmd ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-emerald-400 whitespace-pre font-mono text-[11px] overflow-x-auto select-all">
                      {linuxHotspotCmd}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <strong>Internet Sharing Note:</strong> If staff laptops need internet while on this hotspot, the Linux server can share an upstream cellular 4G/5G dongle or secondary Wi-Fi adapter via Linux IP forwarding (<code className="font-mono">net.ipv4.ip_forward=1</code>).
                  </div>
                </div>
              )}

            </div>
          )}


          {activeSubTab === 'keys' && (
            <div className="space-y-6">
              {/* Clinic Key Card */}
              <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase">
                    <Key className="w-4 h-4 text-blue-600" />
                    Clinic Extension Security Key
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Active & Enforced
                  </span>
                </div>
                <p className="text-xs text-blue-950/80 leading-relaxed">
                  Technicians paste this key into their Chrome/Edge extension settings once. Requests without this key are automatically blocked with <code className="text-blue-800 font-mono bg-blue-100/60 px-1 py-0.5 rounded font-bold">401 Unauthorized</code>.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={clinicSecurityKey}
                    className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-2 font-mono font-bold text-blue-950 text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              {/* Station Auto-Lock Inactivity Setting */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Station Auto-Lock on Inactivity
                  </div>
                  <span className="text-xs text-slate-500">Australian Health Privacy APP 11 Compliance</span>
                </div>
                <p className="text-xs text-slate-600">
                  Automatically hides patient records and locks the Hub screen when the mouse and keyboard are inactive for the selected period:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[5, 15, 30, 60, 0].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onUpdateAutoLock(mins)}
                      className={`p-2.5 rounded-lg border text-center font-bold text-xs cursor-pointer transition-all ${
                        autoLockMinutes === mins
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      {mins === 0 ? 'Disabled' : `${mins} Mins`}
                      {mins === 15 && <span className="block text-[9px] font-normal text-blue-600">(Hospital Std)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Immediate Lock Button */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Step Away From Workstation</h4>
                  <p className="text-xs text-slate-500">Instantly lock the display to protect patient confidentiality.</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onLockStationNow();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Station Now</span>
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'firewall' && (
            <div className="space-y-4">
              {/* OS Selector Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 pl-2">Server Operating System:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFirewallOs('linux')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      firewallOs === 'linux'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🐧 Linux Server (Ubuntu / Debian / RHEL)
                  </button>
                  <button
                    onClick={() => setFirewallOs('windows')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      firewallOs === 'windows'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🪟 Windows PC
                  </button>
                </div>
              </div>

              {/* Linux Wi-Fi vs Router Architecture Callout */}
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs text-blue-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-blue-900">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  Wi-Fi Router vs. Linux Wi-Fi Ad-Hoc:
                </div>
                <p className="leading-relaxed">
                  <strong>Do you need a separate Wi-Fi router or can Linux use ad-hoc?</strong><br />
                  <strong>Recommendation:</strong> Connect your Linux server directly to your <em>existing clinic Wi-Fi router or network switch</em> (via an Ethernet cable or standard Wi-Fi client mode). 
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg border border-blue-200/60 space-y-1">
                  <span className="font-bold text-rose-800 block text-[11px]">⚠️ Why pure "Ad-Hoc" Wi-Fi should be avoided:</span>
                  <p className="text-[11px] text-slate-700">
                    If staff laptops connect to an ad-hoc Wi-Fi network on the Linux box, they would <strong>disconnect from the clinic's internet</strong>—preventing them from accessing Biotronik, CareLink, Latitude, or Merlin. By connecting the Linux server to your regular clinic router, laptops have uninterrupted internet access to vendor portals <em>and</em> direct LAN access to the Hub at <code className="font-mono font-bold text-blue-700">http://192.168.1.X:3000</code> at the same time.
                  </p>
                </div>
              </div>

              {firewallOs === 'linux' ? (
                <div className="space-y-4">
                  {/* Linux UFW Firewall Rule */}
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>1. Linux UFW Firewall (Restrict Port 3000 to Staff Subnet)</span>
                      <button
                        onClick={handleCopyLinuxCmd}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLinuxCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLinuxCmd ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-emerald-400 break-all leading-relaxed select-all">
                      {linuxUfwCmd}
                    </div>
                  </div>

                  {/* Systemd Service Configuration */}
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>2. Linux Systemd Service (/etc/systemd/system/cardiac-hub.service)</span>
                      <button
                        onClick={handleCopyService}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedService ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedService ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-slate-300 whitespace-pre font-mono text-[11px] overflow-x-auto max-h-36 select-all">
                      {linuxServiceConfig}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    <strong>Enable & Start on Linux:</strong> <code className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-800">sudo systemctl enable --now cardiac-hub</code>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Windows Firewall PowerShell */}
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>Windows PowerShell (Run as Administrator)</span>
                      <button
                        onClick={handleCopyCmd}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-emerald-400 break-all leading-relaxed select-all">
                      {firewallCmd}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <h5 className="font-bold text-slate-800">What this PowerShell command does:</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Creates an inbound Windows Firewall rule specifically for Port 3000.</li>
                      <li>Restricts traffic strictly to your internal medical subnet (192.168.1.0/24).</li>
                      <li>Silently drops packets from guest Wi-Fi and unauthorized external devices.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}


          {activeSubTab === 'vlan' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                <Wifi className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-emerald-900 space-y-1">
                  <div className="font-bold">Clinic Wi-Fi Network Architecture</div>
                  <p>
                    Ensure your clinic router or access points have <strong>Client Isolation</strong> and <strong>VLAN Segmentation</strong> enabled.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="font-bold text-slate-900 block">1. Medical Staff VLAN (Subnet A)</span>
                  <p className="text-[11px] text-slate-500">
                    Staff laptops, EP workstations, and Hub PC live here. Port 3000 is open exclusively within this private VLAN.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="font-bold text-slate-900 block">2. Patient & Visitor Guest Wi-Fi (Subnet B)</span>
                  <p className="text-[11px] text-slate-500">
                    Must have <em>"Block Intra-VLAN Traffic / Client Isolation"</em> turned on. Visitors cannot see or ping clinic PCs.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">HTTPS / SSL Encryption (Optional for Local LAN):</span>
                <p className="text-[11px] text-slate-500">
                  If transmitting over clinic Wi-Fi, a local reverse proxy (such as Caddy or Nginx) can supply local SSL certificates so that all traffic between the Chrome extension and Hub PC is encrypted in transit via HTTPS.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Protected by Clinic Key: <code className="font-bold text-slate-700">{clinicSecurityKey}</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
