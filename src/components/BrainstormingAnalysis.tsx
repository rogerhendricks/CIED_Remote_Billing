import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Layers, 
  Lock, 
  Mail, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  Workflow,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  ArrowRight,
  Server,
  Laptop,
  Network,
  Database,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Key,
  ShieldCheck
} from 'lucide-react';


export const BrainstormingAnalysis: React.FC = () => {
  const [activeOption, setActiveOption] = useState<number>(1);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const options = [
    {
      title: 'Option A: Pure Browser Extension (Local Storage Only)',
      badge: 'Quickest to Prototype',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      summary: 'Each staff member installs a standalone Chrome/Edge extension. When viewing a portal, 1 click extracts data and saves to that specific computer browser storage.',
      pros: [
        'Zero backend infrastructure or clinic network configuration required',
        'Works directly inside existing vendor login sessions in the browser',
        'Auto-fills patient name, device, serial, and billing code in 1 second',
        'Easy for one person to export a personal daily CSV or draft an Outlook email'
      ],
      cons: [
        'No multi-user synchronization: PC 1 cannot see what PC 2 logged',
        'High risk of duplicate billing across colleagues reviewing the same portal',
        'Cannot enforce practice-wide Medicare interval rules (4 weeks for 11737, 4x/yr for 11736, 90 days for 11725/11719)',
        'If browser cache is cleared or PC reimaged, un-exported records are lost'
      ],
      score: 6.8,
      recommendation: 'Only suitable for a solo practitioner on a single PC. Highly problematic for a team of multiple people.'
    },
    {
      title: 'Option B: Extension + Central Practice Hub Server (Recommended)',
      badge: 'Best Practice Clinic Solution',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      summary: 'Staff use the browser extension on their individual PCs, but each 1-click capture automatically sends an HTTP POST request to a designated Clinic PC or Web Server running this Billing Hub.',
      pros: [
        'Real-time multi-staff sync: Staff B immediately sees patients already checked by Staff A',
        'Automated Medicare Frequency Engine: Instantly alerts if 11737 is billed within 4 weeks or 11736 exceeds 4/year',
        'Central Practice Dashboard: Practice managers & billing clerks can view, approve, and export all records across all staff in one place',
        'Direct batch export: One click to generate a consolidated Outlook email batch or PMS-compatible CSV',
        'Offline buffer: If the clinic hub PC is offline, the extension queues records locally and syncs upon reconnection'
      ],
      cons: [
        'Requires 1 designated PC in the clinic to run the hub (or host it on your clinic cloud/web server)',
        'Requires setting the clinic IP/URL in the extension popup settings once during setup'
      ],
      score: 9.4,
      recommendation: 'The optimal balance: gives reviewers the fast 1-click extension in vendor portals, while keeping billing data centralized and collision-free.'
    },
    {
      title: 'Option C: Centralized Shared Network Folder (JSON / CSV Drop)',
      badge: 'No-Server Network Alternative',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      summary: 'Extensions export daily logs to a mapped clinic shared network drive (e.g. Z:\\Cardiology_Billing\\), which the billing team opens in Excel.',
      pros: [
        'Uses existing Windows File Sharing / clinic mapped drives',
        'No custom backend software server required on a clinic PC'
      ],
      cons: [
        'Extensions cannot write directly to local file systems without user file-save dialogs',
        'No real-time duplicate collision prevention while reviewing portals',
        'Risk of concurrent file write conflicts if two people save simultaneously'
      ],
      score: 7.4,
      recommendation: 'A workable fallback if clinic IT policies strictly prohibit internal HTTP port communication.'
    }
  ];

  const criticalIssues = [
    {
      title: 'Open Hub Port 3000 on Clinic LAN / Wi-Fi (Patient Privacy & Security)',
      severity: 'Critical Security & Privacy Risk',
      icon: Lock,
      iconColor: 'text-rose-600',
      description: 'You are 100% right: Running an unauthenticated HTTP service on a local clinic PC leaves port 3000 open. Anyone connected to the clinic network (e.g. patients on guest Wi-Fi, visiting reps, or other devices) could browse to http://[PC-IP]:3000 and view confidential patient health information (PHI).',
      mitigations: [
        'Application Security Key: All browser extensions must send the pre-shared Clinic Security Key (X-Clinic-Key) or receive an instant 401 Unauthorized.',
        'Staff Authentication & Screen Lock: The Web Hub requires a 4-digit Staff PIN with configurable auto-lock (5, 15, or 30 min) to prevent walk-by snooping (Australian Privacy Principle 11 compliance).',
        'Windows Firewall Subnet Isolation: A single PowerShell rule configures Windows Defender to only accept port 3000 packets from your specific staff subnet (e.g. 192.168.1.0/24), dropping guest Wi-Fi requests.',
        'Wi-Fi VLAN Segmentation: Clinic Wi-Fi should isolate guest visitors from the medical practice LAN.'
      ]
    },
    {
      title: 'Medicare Frequency & Indication Compliance (11736 vs 11737 vs 11725 vs 11719)',
      severity: 'Critical Billing Risk',
      icon: Clock,
      iconColor: 'text-amber-600',
      description: 'Under Australian Medicare guidelines, cardiac device items carry strict frequency restrictions and clinical indication criteria that Medicare claims will automatically reject if breached.',
      mitigations: [
        'Item 11736: ILR / ICM for Atrial Fibrillation (AF) investigation — Strictly limited to max 4 times in any 12-month period.',
        'Item 11737: ILR / ICM for Cryptogenic Stroke or Recurrent Syncope — Strictly limited to once in any 4-week (28-day) period.',
        'Items 11725 (PPM) & 11719 (ICD): Restricted to once in any 3-month (90-day) period per patient.',
        'The Practice Hub actively enforces these date-math rules across all staff, flagging any potential claim collision before submission.'
      ]
    },
    {
      title: 'Multi-Staff Portals & Overlapping Patient Reviews',
      severity: 'Workflow Efficiency Risk',
      icon: Users,
      iconColor: 'text-amber-600',
      description: 'When multiple technologists review portal alerts, two people can review the same patient on CareLink or Latitude on the same day or a week apart, wasting time and double-billing.',
      mitigations: [
        'Centralized Practice Log synchronizes all reviews into a unified ledger.',
        'Real-time status tracking: Logged → Reviewed → Billed → Emailed.',
        'Audit trail shows exact reviewer name, date of review, and device serial number.'
      ]
    },
    {
      title: 'Privacy & Outlook Email Transmission (Australian Privacy Act / HRIPA)',
      severity: 'Legal & Compliance Risk',
      icon: Lock,
      iconColor: 'text-indigo-600',
      description: 'Emailing unencrypted patient names, dates of birth, and medical findings via standard external email violates health privacy regulations.',
      mitigations: [
        'Built-in Privacy Mode: Automatically de-identifies patient names to "Patient [ID/MRN]" in email bodies.',
        'The billing clerk matches the ID inside the practice management software (Genie, Best Practice, MedicalDirector).',
        'Direct Outlook draft (.eml) or mailto: protocol keeps transmission within your practice Microsoft 365 Exchange tenant.'
      ]
    },
    {
      title: 'Vendor Portal DOM Fragility (HTML Structure Updates)',
      severity: 'Technical Maintenance Risk',
      icon: Cpu,
      iconColor: 'text-blue-600',
      description: 'Biotronik, Boston Scientific, Medtronic, and Abbott periodically update their portal websites, which can alter CSS classes and IDs.',
      mitigations: [
        'Fallback selector arrays: Scraper checks 2-3 alternative selector queries per portal.',
        'Manual override capability: Popup fields remain editable if any field fails to auto-fill.',
        'Centralized extension updates distributed via the built-in Extension Downloader tab.'
      ]
    }
  ];

  const faqs = [
    {
      q: 'How does the Option 3 Travel Bridge / Pocket Wi-Fi Router setup work with our Linux server and staff laptops?',
      a: 'Option 3 is the chosen production architecture for your clinic! It requires zero long cables through walls or floors and creates an isolated, high-security cardiac monitoring bubble.\n\nHere is how the setup operates:\n\n1. Hardware Placement & Cabling:\n• Place a compact pocket travel router (e.g. GL.iNet Opal / Beryl AX or TP-Link Nano Router, ~$40-$60) directly beside your Linux server.\n• Connect a short 15cm Ethernet patch lead between the travel router LAN port and the Linux server (or connect via Wi-Fi).\n\n2. Repeater Mode (Wire-Free Clinic Internet):\n• The pocket router connects wirelessly to your clinic staff Wi-Fi in "Repeater Mode". It receives clinic internet without running any physical cables across the building.\n\n3. Private Staff Wi-Fi Bubble:\n• The pocket router broadcasts a dedicated private SSID (e.g. "CardioHub-Staff") with WPA2/WPA3 encryption. Staff laptops connect to this Wi-Fi.\n• Laptops get seamless internet access for Biotronik, CareLink, Latitude, and Merlin, AND instant sub-millisecond local network access to the Linux hub at http://192.168.8.100:3000.\n\n4. Hardware-Level NAT Firewall Isolation:\n• Because the travel router operates its own NAT firewall, devices on the main clinic Wi-Fi or patient guest Wi-Fi cannot see or reach the Linux server or staff laptops.'
    },
    {
      q: 'Being local, do we need basic authentication? Will port 3000 be open to anyone on the clinic network or Wi-Fi?',
      a: 'You are 100% right: without authentication, any device connected to your clinic local network or Wi-Fi could access port 3000 and view patient records. To prevent this, we have implemented a multi-tiered security defense:\n1. Clinic Security Key (Passcode): The extensions must transmit a pre-shared clinic secret key in the X-Clinic-Key HTTP header. Any request without this key is immediately rejected with HTTP 401 Unauthorized.\n2. Staff PIN & Screen Lock: The Web Hub requires a 4-digit Staff PIN and features an automatic screen lock after inactivity (configurable to 5, 15, or 30 minutes) in compliance with Australian Privacy Principle 11 (Security of personal information).\n3. Host Firewall Rule: We provide a 1-line PowerShell rule for Windows Defender that limits port 3000 traffic exclusively to your medical staff subnet (e.g. 192.168.1.0/24), automatically dropping all connection attempts from visitor or guest Wi-Fi devices.'
    },
    {
      q: 'How do we isolate port 3000 so patients or visitors on clinic guest Wi-Fi cannot access the Hub?',
      a: 'There are two best practices for medical clinics:\n• Network Layer (Router/AP): Ensure your clinic router has Guest Wi-Fi on a separate VLAN with "Client Isolation / Block Intra-VLAN Traffic" enabled. This ensures phones and laptops in the waiting room cannot see or ping clinic PCs.\n• Workstation Layer (Windows Firewall): Run the provided PowerShell command on the Hub PC: New-NetFirewallRule -DisplayName "Clinic Hub Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -RemoteAddress 192.168.1.0/24. This ensures that even if someone joins the Wi-Fi, Windows Firewall silently drops any packet aimed at port 3000 unless it originates from an authorized staff IP.'
    },
    {
      q: 'How does the billing hub run on a PC in our clinic, and how does the extension send data to it?',
      a: 'The Billing Hub is a lightweight web application. In your clinic, it can run on any designated workstation (e.g. the tech workstation or a small practice mini-PC) or be hosted on your clinic cloud server. When a technologist is on Biotronik or CareLink, their Chrome/Edge extension runs a standard HTTP POST request in the background to the hub IP address (e.g. http://192.168.1.50:3000/api/records). It records the patient into the master database instantly. If the central PC is turned off, the extension stores the records in local browser memory and syncs them once reconnected.'
    },
    {
      q: 'What is the clinical difference between MBS Item 11736 and MBS Item 11737 for Loop Recorders?',
      a: 'Both are for Implantable Loop Recorders (ILR / ICM), but they have different clinical indications and billing frequency limits:\n• Item 11736 ($35.80): For the investigation or management of documented or suspected Atrial Fibrillation (AF). It can be claimed a maximum of 4 times in any 12-month period (~once every 3 months).\n• Item 11737 ($35.80): For the investigation of cryptogenic stroke or recurrent unexplained syncope (fainting/collapse). It can be claimed once in any 4-week period (~monthly surveillance).'
    },
    {
      q: 'Do staff members need to install Node.js on every clinic computer?',
      a: 'No! Staff only need the lightweight browser extension in Chrome or Edge (which takes 30 seconds to load via Developer Mode). Only the one designated "Hub PC" or clinic web server runs the backend. Everyone else simply uses the browser extension or views the dashboard in their browser like any webpage.'
    },
    {
      q: 'Can this data be exported into our practice management software (Genie, Best Practice, MedicalDirector)?',
      a: 'Yes. The hub includes a 1-click "Export CSV for PMS" button formatted with Patient ID, Service Date, MBS Item Number, Provider/Technician, and Clinical Notes, which can be imported directly into clinic billing batches.'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Clinical & Technical Architecture Review
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Multi-User Remote Device Monitoring & MBS Billing Architecture
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            A comprehensive evaluation of how multiple cardiac technicians and clinicians can seamlessly capture patient transmissions across Biotronik, Latitude, CareLink, and Merlin, and route them to Outlook and Practice Billing while avoiding Medicare claim rejections.
          </p>
        </div>
      </div>

      {/* NEW SECTION: How the Billing Hub & Extensions Communicate */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              How the Billing Hub Runs on a Clinic PC & Extensions Send Data
            </h3>
            <p className="text-xs text-slate-500">
              Understanding the network topology between individual staff workstations and the central clinic database.
            </p>
          </div>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Step 1: Staff Workstations */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                <Laptop className="w-4 h-4 text-blue-600" />
                Staff Workstations (1 to N)
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span>Nurse Station PC</span>
                  <span className="font-mono text-[10px] text-slate-400">Chrome Ext</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span>EP Tech Office PC</span>
                  <span className="font-mono text-[10px] text-slate-400">Edge Ext</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span>Cardiologist Laptop</span>
                  <span className="font-mono text-[10px] text-slate-400">Chrome Ext</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Technologist reviews portal. 1 click extracts patient & device. Extension sends background <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">POST /api/records</code>.
              </p>
            </div>

            {/* Network Arrows / Sync */}
            <div className="flex flex-col items-center justify-center text-center space-y-2 py-2">
              <div className="hidden lg:flex items-center justify-center w-full">
                <div className="h-0.5 bg-blue-300 flex-1"></div>
                <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-[11px] font-bold shadow-xs">
                  Clinic Local Network (Wi-Fi / LAN)
                </div>
                <div className="h-0.5 bg-blue-300 flex-1"></div>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Instant HTTP REST Sync & Collision Check
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                ✓ Offline queue if network offline
              </span>
            </div>

            {/* Step 2: Designated Clinic Hub PC */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-200 shadow-xs ring-1 ring-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase">
                  <Server className="w-4 h-4 text-blue-600" />
                  Clinic Billing Hub (Designated PC)
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Port 3000
                </span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  Central Practice Database:
                </div>
                <ul className="text-[11px] text-blue-900/80 space-y-1 pl-4 list-disc">
                  <li>Enforces 4-week (11737), 12-mo (11736) & 90-day rules</li>
                  <li>Centralized audit log for all staff</li>
                  <li>Generates Outlook email batch & PDF report</li>
                </ul>
              </div>
              <div className="text-[11px] text-slate-500">
                Accessible to the Billing Clerk at: <code className="text-blue-700 font-semibold">http://[PC-IP]:3000</code> or your practice web address.
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-step clinic deployment explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block text-sm">1. Choose One Clinic PC</span>
            <p>
              Designate one PC in the clinic (e.g. the EP lab computer, nurse manager PC, or practice server) to run the Billing Hub. It keeps the master list of all patient reviews.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block text-sm">2. Install Extension on All PCs</span>
            <p>
              Each technician unzips the extension in Chrome or Edge. In the extension settings, they enter the Hub PC address (e.g. <code className="text-slate-800">http://192.168.1.50:3000</code>).
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block text-sm">3. Automatic Reconciliation</span>
            <p>
              When any staff member logs a patient, the Hub receives it immediately. If another staff member reviews that same patient too soon, the extension warns them on the spot!
            </p>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Clinic LAN Security & Port 3000 Protection */}
      <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Clinic LAN Security: Protecting Port 3000 from Unauthorized Access
              </h3>
              <p className="text-xs text-slate-500">
                How we enforce authentication and prevent open port exposure across your local network and Wi-Fi.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Australian Privacy APP 11 Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase">
              <Key className="w-4 h-4 text-blue-600" />
              1. Extension Secret Key
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every request from a browser extension must include the Clinic Security Key (<code className="text-blue-700 font-mono">X-Clinic-Key</code> header). Unauthenticated requests are denied instantly with a 401 response.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase">
              <Lock className="w-4 h-4 text-indigo-600" />
              2. Staff PIN & Auto-Lock
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Staff authenticate with a 4-digit PIN. If the computer is left unattended, the screen automatically locks after the configured timeout (e.g. 15 minutes) to protect patient records.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
              <Server className="w-4 h-4 text-emerald-600" />
              3. Firewall Subnet Scope
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Windows Firewall restricts port 3000 strictly to the staff subnet (e.g. <code className="text-slate-800 font-mono">192.168.1.0/24</code>), blocking any phone or laptop connected to clinic guest Wi-Fi.
            </p>
          </div>
        </div>
      </div>


      {/* NEW SECTION: Clarified Medicare Benefits Schedule (MBS) Item Rules Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Australian Medicare Benefits Schedule (MBS) Rules Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Exact clinical indications, frequency limits, and rebate values implemented across the Hub and Extension.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">MBS Item</th>
                <th className="p-3">Device Category</th>
                <th className="p-3">Clinical Indication Criteria</th>
                <th className="p-3">Medicare Frequency Rule</th>
                <th className="p-3">MBS Fee (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-blue-50/40">
                <td className="p-3 font-bold font-mono text-blue-800">11736</td>
                <td className="p-3 font-semibold text-slate-900">Implantable Loop Recorder (ILR / ICM)</td>
                <td className="p-3 text-slate-700 font-medium">Investigation or management of <strong>Atrial Fibrillation (AF)</strong></td>
                <td className="p-3 text-blue-900 font-semibold">Not more than 4 times in a 12-month period (~every 3 months)</td>
                <td className="p-3 font-bold text-emerald-700">$35.80</td>
              </tr>
              <tr className="bg-emerald-50/40">
                <td className="p-3 font-bold font-mono text-emerald-800">11737</td>
                <td className="p-3 font-semibold text-slate-900">Implantable Loop Recorder (ILR / ICM)</td>
                <td className="p-3 text-slate-700 font-medium">Investigation of <strong>Cryptogenic Stroke or Recurrent Unexplained Syncope</strong></td>
                <td className="p-3 text-emerald-900 font-semibold">Once in any 4-week period (~monthly surveillance)</td>
                <td className="p-3 font-bold text-emerald-700">$35.80</td>
              </tr>
              <tr>
                <td className="p-3 font-bold font-mono text-slate-800">11725</td>
                <td className="p-3 font-semibold text-slate-900">Permanent Pacemaker (PPM)</td>
                <td className="p-3 text-slate-700">Routine surveillance of single or dual chamber pacemaker</td>
                <td className="p-3 text-slate-700 font-medium">Once in any 3-month (90-day) period</td>
                <td className="p-3 font-bold text-emerald-700">$44.55</td>
              </tr>
              <tr>
                <td className="p-3 font-bold font-mono text-slate-800">11719</td>
                <td className="p-3 font-semibold text-slate-900">Defibrillator (ICD / CRT-D)</td>
                <td className="p-3 text-slate-700">Routine surveillance of implantable cardioverter defibrillator</td>
                <td className="p-3 text-slate-700 font-medium">Once in any 3-month (90-day) period</td>
                <td className="p-3 font-bold text-emerald-700">$89.15</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Architectural Options Comparison */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Comparison of Architectural Options for Your Practice
          </h3>
          <p className="text-sm text-slate-500">
            Evaluating the trade-offs of local extensions versus a shared clinic hub.
          </p>
        </div>

        {/* Option Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setActiveOption(idx)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activeOption === idx 
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-600/20' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{opt.title.split(':')[0]}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{opt.summary}</p>
            </button>
          ))}
        </div>

        {/* Active Option Detail Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${options[activeOption].badgeColor}`}>
                {options[activeOption].badge}
              </span>
              <h4 className="text-xl font-bold text-slate-900 mt-2">{options[activeOption].title}</h4>
              <p className="text-sm text-slate-600 mt-1">{options[activeOption].summary}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center shrink-0">
              <div className="text-xs font-medium text-slate-500">Practice Score</div>
              <div className="text-2xl font-black text-blue-600">{options[activeOption].score} <span className="text-xs text-slate-400 font-normal">/ 10</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Advantages
              </h5>
              <ul className="space-y-2 text-sm text-slate-700">
                {options[activeOption].pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <h5 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Disadvantages & Challenges
              </h5>
              <ul className="space-y-2 text-sm text-slate-700">
                {options[activeOption].cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-900">
              <strong className="font-semibold">Clinical Recommendation: </strong>
              {options[activeOption].recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Pitfalls & Solutions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Crucial Problems That May Arise & Practical Solutions
          </h3>
          <p className="text-sm text-slate-500">
            Real-world regulatory, technical, and billing obstacles specific to Australian remote cardiac monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalIssues.map((issue, idx) => {
            const Icon = issue.icon;
            return (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                    <Icon className={`w-5 h-5 ${issue.iconColor}`} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      {issue.severity}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{issue.title}</h4>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {issue.description}
                </p>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">Actionable Solutions:</div>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    {issue.mitigations.map((m, mi) => (
                      <li key={mi} className="flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          Practical Questions for Clinic Setup
        </h3>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50 hover:bg-slate-100/80 transition-colors font-semibold text-xs sm:text-sm text-slate-900 cursor-pointer"
              >
                <span>{faq.q}</span>
                {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {expandedFaq === i && (
                <div className="p-4 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-200">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
