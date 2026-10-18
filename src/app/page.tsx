"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "@/components/Navbar";
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Users,
  UserCheck,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  Download,
  Share2,
  Plus,
  Layers,
  Tag,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  gender: string;
  phone: string;
  className: string;
  registeredAt: string;
  note?: string;
}

export default function Home() {
  const botEmail =
    process.env.NEXT_PUBLIC_BOT_EMAIL ||
    "attendance-bot@student-attendance-512002.iam.gserviceaccount.com";

  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [connectedSheet, setConnectedSheet] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  // Multi-Class Management state
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [showAddClass, setShowAddClass] = useState(false);
  const [activeClassForQR, setActiveClassForQR] = useState<string>("all");

  const [emailCopied, setEmailCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // Load saved sheet from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("connected_sheet");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id) {
          setConnectedSheet(parsed);
          fetchStudents(parsed.id);
          const savedClasses = localStorage.getItem(`classes_${parsed.id}`);
          if (savedClasses) {
            setCustomClasses(JSON.parse(savedClasses));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchStudents = async (id: string) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/students?sheetId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sheet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "មិនអាចភ្ជាប់ជាមួយ Google Sheet នេះបានទេ");
      }

      const sheetData = {
        id: data.sheet.id,
        title: data.sheet.title,
      };

      setConnectedSheet(sheetData);
      localStorage.setItem("connected_sheet", JSON.stringify(sheetData));
      setSheetUrl("");
      fetchStudents(sheetData.id);
    } catch (err: any) {
      setError(err.message || "មានបញ្ហាក្នុងការភ្ជាប់");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm("តើអ្នកចង់ផ្ដាច់ Sheet នេះមែនទេ?")) {
      localStorage.removeItem("connected_sheet");
      setConnectedSheet(null);
      setStudents([]);
    }
  };

  const copyBotEmail = () => {
    navigator.clipboard.writeText(botEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  // Classes list: combined from registered students and teacher's custom classes
  const studentClasses = students.map((s) => s.className).filter(Boolean);
  const allClasses = Array.from(new Set([...studentClasses, ...customClasses]));

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    if (!allClasses.includes(trimmed)) {
      const updated = [...customClasses, trimmed];
      setCustomClasses(updated);
      if (connectedSheet) {
        localStorage.setItem(`classes_${connectedSheet.id}`, JSON.stringify(updated));
      }
    }
    setActiveClassForQR(trimmed);
    setSelectedClass(trimmed);
    setNewClassName("");
    setShowAddClass(false);
  };

  const getStudentRegisterUrl = () => {
    if (typeof window === "undefined" || !connectedSheet) return "";
    let url = `${window.location.origin}/register?sheetId=${encodeURIComponent(
      connectedSheet.id
    )}`;
    if (activeClassForQR !== "all") {
      url += `&class=${encodeURIComponent(activeClassForQR)}`;
    }
    return url;
  };

  const copyRegisterLink = () => {
    const url = getStudentRegisterUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const downloadQRCode = () => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const classSuffix = activeClassForQR !== "all" ? `_ថ្នាក់_${activeClassForQR}` : "";
      downloadLink.download = `QR_ចុះឈ្មោះ_${connectedSheet?.title || "Class"}${classSuffix}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "all" || s.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen flex flex-col" suppressHydrationWarning>
      <Navbar sheetId={connectedSheet?.id} sheetTitle={connectedSheet?.title} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-6 sm:p-10 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
              <Sparkles className="w-3.5 h-3.5" /> ភ្ជាប់ត្រង់ជាមួយ Google Sheet
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
              ប្រព័ន្ធកត់វត្តមាន និងចុះឈ្មោះសិស្ស
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              សិស្សចុះឈ្មោះតាមទូរស័ព្ទដោយ Scan QR Code ឬបើក Link ហើយគ្រូអាចកត់វត្តមានបានភ្លាមៗ។
              ទិន្នន័យទាំងអស់រត់ត្រង់ចូល Google Sheet របស់អ្នកដោយសុវត្ថិភាព។
            </p>
          </div>
        </div>

        {/* Step 1 & Connect Sheet Section */}
        {!connectedSheet ? (
          <div className="grid md:grid-cols-12 gap-6">
            {/* Guide Card */}
            <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-lg border-b pb-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold">
                  ១
                </span>
                <span>របៀបរៀបចំ Google Sheet</span>
              </div>

              <div className="space-y-4 text-sm text-slate-600">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-medium text-slate-800 block">
                    អ៊ីមែល Bot សម្រាប់ Share Sheet៖
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white px-2.5 py-1.5 rounded border border-slate-300 text-emerald-800 break-all flex-1 font-mono">
                      {botEmail}
                    </code>
                    <button
                      onClick={copyBotEmail}
                      type="button"
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex-shrink-0"
                      title="ចម្លងអ៊ីមែល"
                    >
                      {emailCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {emailCopied && (
                    <span className="text-xs text-emerald-600 font-medium block">
                      ✓ បានចម្លងអ៊ីមែល Bot រួចហើយ!
                    </span>
                  )}
                </div>

                <ol className="list-decimal list-inside space-y-2.5 pl-1 leading-relaxed">
                  <li>
                    បើក <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium underline inline-flex items-center gap-0.5">Google Sheets <ExternalLink className="w-3 h-3" /></a> រួចបង្កើត Sheet ថ្មីមួយ។
                  </li>
                  <li>
                    ចុចប៊ូតុង <strong>Share</strong> (នៅខាងស្ដាំលើ) រួច Paste អ៊ីមែល Bot ខាងលើនេះជា <strong>Editor</strong>។
                  </li>
                  <li>
                    ចម្លង <strong>Link (URL)</strong> នៃ Google Sheet នោះមកដាក់ក្នុងប្រអប់ខាងស្ដាំនេះ។
                  </li>
                </ol>
              </div>
            </div>

            {/* Input Form Card */}
            <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg border-b pb-3">
                  <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                    ២
                  </span>
                  <span>ភ្ជាប់ Google Sheet របស់គ្រូ</span>
                </div>

                <form onSubmit={handleConnectSheet} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="sheetUrl"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      បញ្ចូល Google Sheet Link ឬ ID៖
                    </label>
                    <input
                      id="sheetUrl"
                      type="text"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono text-slate-800 placeholder:text-slate-400"
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 transition-colors shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>កំពុងភ្ជាប់ និងរៀបចំ Sheet...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-5 h-5" />
                        <span>ភ្ជាប់ Google Sheet ឥឡូវនេះ</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                ⚡ ប្រព័ន្ធនឹងបង្កើត Tab ឈ្មោះ <code>Students</code> និង <code>Attendance</code> ដោយស្វ័យប្រវត្តិ។
              </div>
            </div>
          </div>
        ) : (
          /* Active Connected Dashboard */
          <div className="space-y-6">
            {/* Connected Header Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-lg">
                      {connectedSheet.title}
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      បានភ្ជាប់
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Sheet ID: {connectedSheet.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${connectedSheet.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>បើកមើល Sheet</span>
                </a>

                <Link
                  href={`/attendance?sheetId=${encodeURIComponent(connectedSheet.id)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>កត់វត្តមានសិស្ស</span>
                </Link>

                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  ផ្ដាច់
                </button>
              </div>
            </div>

            {/* Quick Actions & QR Code Card */}
            <div className="grid md:grid-cols-12 gap-6">
              {/* Registration Link & QR Code */}
              <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-emerald-600" />
                    <span>តំណភ្ជាប់ និង QR Code ចុះឈ្មោះ</span>
                  </h3>
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>ពង្រីក QR Code</span>
                  </button>
                </div>

                {/* Class Selector Pills */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ជ្រើសរើសថ្នាក់ដើម្បីបង្កើត QR Code៖</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddClass(!showAddClass)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>បន្ថែមថ្នាក់</span>
                    </button>
                  </div>

                  {/* Add Class Form */}
                  {showAddClass && (
                    <form onSubmit={handleAddClass} className="flex items-center gap-2 p-2 bg-emerald-50/70 rounded-xl border border-emerald-200 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="ឧ. 12B, 11A, English..."
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 focus:outline-none bg-white flex-1 text-slate-800"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                      >
                        + បន្ថែម
                      </button>
                    </form>
                  )}

                  {/* Class Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveClassForQR("all");
                        setSelectedClass("all");
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                        activeClassForQR === "all"
                          ? "bg-slate-900 text-white shadow-sm font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>គ្រប់ថ្នាក់</span>
                      <span className="ml-1 text-[10px] opacity-75">({students.length})</span>
                    </button>

                    {allClasses.map((cls) => {
                      const count = students.filter((s) => s.className === cls).length;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setActiveClassForQR(cls);
                            setSelectedClass(cls);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                            activeClassForQR === cls
                              ? "bg-emerald-600 text-white shadow-sm font-bold ring-2 ring-emerald-500/20"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          <span>ថ្នាក់ {cls}</span>
                          <span className="ml-1 text-[10px] opacity-80">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeClassForQR !== "all" && (
                    <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <span>✨ QR Code នេះគឺសម្រាប់តែសិស្ស <strong>ថ្នាក់ {activeClassForQR}</strong> ប៉ុណ្ណោះ (ស្វ័យប្រវត្តិចូល Tab ថ្នាក់_{activeClassForQR})</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={getStudentRegisterUrl()}
                    className="text-xs bg-transparent flex-1 font-mono text-slate-700 outline-none select-all"
                  />
                  <button
                    onClick={copyRegisterLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>បានចម្លង</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ចម្លង Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div
                    ref={qrCanvasRef}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors"
                    onClick={() => setShowQRModal(true)}
                    title="ចុចដើម្បីពង្រីក"
                  >
                    <QRCodeCanvas
                      value={getStudentRegisterUrl() || "https://google.com"}
                      size={105}
                      level="M"
                    />
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">
                      {activeClassForQR !== "all"
                        ? `📱 QR Code សម្រាប់ថ្នាក់ ${activeClassForQR}៖`
                        : "📱 QR Code សម្រាប់សិស្សទូទៅ៖"}
                    </p>
                    <p className="leading-relaxed">
                      {activeClassForQR !== "all"
                        ? `សិស្ស Scan ទៅនឹងមានជាប់ឈ្មោះថ្នាក់ "${activeClassForQR}" ស្រាប់ ហើយទិន្នន័យរត់ចូល Tab ថ្នាក់_${activeClassForQR} ក្នុង Google Sheet!`
                        : "សិស្សអាច Scan ឬចុច Link ដើម្បីបំពេញឈ្មោះ និងថ្នាក់ដោយខ្លួនឯង។"}
                    </p>
                    <button
                      onClick={downloadQRCode}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        ទាញយក QR Code {activeClassForQR !== "all" ? `ថ្នាក់ ${activeClassForQR}` : ""} (PNG)
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendance Quick Stats */}
              <div className="md:col-span-5 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    សកម្មភាពបន្ទាប់
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {activeClassForQR !== "all"
                      ? `កត់វត្តមានថ្នាក់ ${activeClassForQR}`
                      : "ដល់ម៉ោងកត់វត្តមានសិស្ស?"}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeClassForQR !== "all"
                      ? `បើកបញ្ជីឈ្មោះសិស្សក្នុងថ្នាក់ ${activeClassForQR} ហើយចុចកត់ វត្តមាន ច្បាប់ ឬអវត្តមាន យ៉ាងរហ័ស។`
                      : "បើកបញ្ជីឈ្មោះសិស្សតាមថ្នាក់ ហើយចុចកត់ វត្តមាន ច្បាប់ ឬអវត្តមាន យ៉ាងងាយស្រួលនៅលើទូរស័ព្ទ ឬកុំព្យូទ័រ។"}
                  </p>
                </div>

                <div className="pt-4">
                  <Link
                    href={`/attendance?sheetId=${encodeURIComponent(connectedSheet.id)}${
                      activeClassForQR !== "all" ? `&class=${encodeURIComponent(activeClassForQR)}` : ""
                    }`}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>
                      {activeClassForQR !== "all"
                        ? `កត់វត្តមានថ្នាក់ ${activeClassForQR}`
                        : "ចូលទៅកត់វត្តមាន"}
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Students List Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-lg">
                    បញ្ជីឈ្មោះសិស្សបានចុះឈ្មោះ
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {students.length} នាក់
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => fetchStudents(connectedSheet.id)}
                    disabled={loadingStudents}
                    className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Refresh បញ្ជីសិស្ស"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loadingStudents ? "animate-spin" : ""}`}
                    />
                  </button>

                  {/* Filter by class */}
                  {allClasses.length > 0 && (
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">គ្រប់ថ្នាក់ទាំងអស់</option>
                      {allClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          ថ្នាក់ {cls}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ស្វែងរកឈ្មោះ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
                    />
                  </div>
                </div>
              </div>

              {/* Table or Empty State */}
              {loadingStudents ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  កំពុងទាញយកបញ្ជីឈ្មោះសិស្សពី Google Sheet...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-600">
                    {students.length === 0
                      ? "មិនទាន់មានសិស្សចុះឈ្មោះនៅឡើយទេ។ សូមផ្ញើ Link ឬ QR Code ឱ្យសិស្សចុះឈ្មោះ!"
                      : "រកមិនឃើញសិស្សតាមការស្វែងរកនេះទេ។"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 font-semibold">ID</th>
                        <th className="px-5 py-3 font-semibold">ឈ្មោះពេញ</th>
                        <th className="px-5 py-3 font-semibold">ភេទ</th>
                        <th className="px-5 py-3 font-semibold">លេខទូរស័ព្ទ</th>
                        <th className="px-5 py-3 font-semibold">ថ្នាក់/ជំនាញ</th>
                        <th className="px-5 py-3 font-semibold">ថ្ងៃចុះឈ្មោះ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((stu) => (
                        <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3 font-mono font-medium text-xs text-slate-500">
                            {stu.id}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            {stu.name}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs rounded-md font-medium ${
                                stu.gender === "ស្រី"
                                  ? "bg-pink-50 text-pink-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {stu.gender}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs">{stu.phone}</td>
                          <td className="px-5 py-3">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">
                              {stu.className}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {stu.registeredAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* QR Code Big Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-slate-900 text-xl">
                Scan ដើម្បីចុះឈ្មោះសិស្ស
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {connectedSheet?.title}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <QRCodeCanvas
                value={getStudentRegisterUrl() || ""}
                size={220}
                level="H"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={downloadQRCode}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>ទាញយកជារូបភាព (Download PNG)</span>
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                បិទផ្ទាំងនេះ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
