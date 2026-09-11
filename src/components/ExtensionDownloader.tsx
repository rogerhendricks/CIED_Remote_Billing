import React, { useState } from 'react';
import JSZip from 'jszip';
import { EXTENSION_FILES, ExtensionFile } from '../data/extensionCode';
import { 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  Chrome, 
  HelpCircle, 
  FolderDown, 
  ExternalLink,
  ShieldCheck,
  Code
} from 'lucide-react';

export const ExtensionDownloader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(EXTENSION_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipSuccess, setZipSuccess] = useState<boolean>(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add all extension files into zip
      EXTENSION_FILES.forEach(file => {
        zip.file(file.filename, file.content);
      });

      // Generate zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cardiac-device-billing-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsZipping(false);
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner / Download Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <Chrome className="w-3.5 h-3.5" /> Manifest V3 Ready
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Chrome & Edge Browser Extension Package
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Ready-to-deploy browser extension for Biotronik, Latitude, CareLink, and Merlin.net. Download the complete source bundle in 1 click and load it into your clinic's browser.
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <FolderDown className="w-5 h-5" />
            {isZipping ? 'Creating ZIP...' : 'Download Extension (.ZIP)'}
          </button>
          <span className="text-[11px] text-center text-slate-400 font-medium">
            Manifest V3 • Works on Chrome, Edge & Brave
          </span>
        </div>
      </div>

      {zipSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>ZIP package downloaded! Follow the 4-step installation instructions below to load it into Chrome or Edge.</span>
        </div>
      )}

      {/* Step by Step Install Guide */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          How to Install in 60 Seconds (Chrome or Microsoft Edge)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">1</span>
            <div className="font-bold text-slate-800">Unzip Folder</div>
            <p className="text-slate-500">Unzip the downloaded <code className="bg-slate-100 px-1 py-0.5 rounded">.zip</code> into a local folder on your PC.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">2</span>
            <div className="font-bold text-slate-800">Open Extensions</div>
            <p className="text-slate-500">Type <code className="bg-slate-100 px-1 py-0.5 rounded">chrome://extensions</code> or <code className="bg-slate-100 px-1 py-0.5 rounded">edge://extensions</code> in your browser address bar.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">3</span>
            <div className="font-bold text-slate-800">Developer Mode</div>
            <p className="text-slate-500">Toggle ON the <strong>Developer mode</strong> switch at the top right of the extensions page.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">4</span>
            <div className="font-bold text-slate-800">Load Unpacked</div>
            <p className="text-slate-500">Click <strong>Load unpacked</strong> and select your unzipped folder. Pin the icon to your toolbar!</p>
          </div>
        </div>
      </div>

      {/* Code Inspector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-900 text-sm">Source Code Inspector</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied File!' : `Copy ${selectedFile.filename}`}
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-1 text-xs">
          {EXTENSION_FILES.map((f) => (
            <button
              key={f.filename}
              onClick={() => setSelectedFile(f)}
              className={`px-3 py-2 rounded-t-lg font-mono text-xs transition-all cursor-pointer whitespace-nowrap ${
                selectedFile.filename === f.filename
                  ? 'bg-white font-bold text-blue-700 border-t-2 border-t-blue-600 border-x border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {f.filename}
            </button>
          ))}
        </div>

        {/* File Content */}
        <div className="p-4 bg-slate-900 text-slate-100 overflow-x-auto">
          <div className="text-xs text-slate-400 mb-2 font-sans flex items-center justify-between">
            <span>{selectedFile.description}</span>
            <span className="uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded">{selectedFile.language}</span>
          </div>
          <pre className="font-mono text-xs leading-relaxed select-all">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
