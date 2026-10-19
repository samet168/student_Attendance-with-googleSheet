"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Printer,
  QrCode,
  ArrowLeft,
  Copy,
  Check,
  Download,
  ExternalLink,
  BookOpen,
  Filter,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { DEFAULT_GRADE_SUBJECTS } from "@/types/grades";

const ALL_SUBJECTS = [
  ...DEFAULT_GRADE_SUBJECTS,
  { id: "general", name: "វត្តមានទូទៅ", maxScore: 50 },
];

const MONTHS_LIST = [
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
];

function SubjectQrCardsContent() {
  const searchParams = useSearchParams();
  const paramSheetId = searchParams.get("sheetId") || "";
  const paramClass = searchParams.get("class") || "12A";
  const paramMonth = searchParams.get("month") || "តុលា";

  const [sheetId, setSheetId] = useState<string>(paramSheetId);
  const [className, setClassName] = useState<string>(paramClass);
  const [month, setMonth] = useState<string>(paramMonth);
  const [availableClasses, setAvailableClasses] = useState<string[]>([paramClass]);
  const [copiedSubject, setCopiedSubject] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }

    try {
      const saved = localStorage.getItem("connected_sheet");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id && !sheetId) {
          setSheetId(parsed.id);
        }
        const savedClasses = localStorage.getItem(`classes_${parsed.id}`);
        if (savedClasses) {
          const cls = JSON.parse(savedClasses);
          if (Array.isArray(cls) && cls.length > 0) {
            setAvailableClasses(cls);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [sheetId]);

  const getMonitorLink = (subjectName: string) => {
    const origin = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    return `${origin}/attendance/monitor?sheetId=${encodeURIComponent(
      sheetId
    )}&class=${encodeURIComponent(className)}&subject=${encodeURIComponent(
      subjectName
    )}&month=${encodeURIComponent(month)}`;
  };

  const handleCopyLink = (subjectName: string) => {
    const link = getMonitorLink(subjectName);
    navigator.clipboard.writeText(link);
    setCopiedSubject(subjectName);
    setTimeout(() => setCopiedSubject(null), 3000);
  };

  const handleDownloadQr = (subjectName: string) => {
    const canvas = document.getElementById(`qr-canvas-${subjectName}`) as HTMLCanvasElement;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `QR_${className}_${subjectName}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Non-Printable Header */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/attendance?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
                className
              )}`}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="ត្រឡប់ក្រោយ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden relative border border-slate-200 bg-white shrink-0">
                <Image
                  src="/images/app-logo.png"
                  alt="Logo"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                  <span>សន្លឹក QR Code តាមមុខវិជ្ជា</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    សម្រាប់ប្រធានថ្នាក់
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500">
                  ព្រីនសន្លឹកកាត QR សម្រាប់បិទក្នុងថ្នាក់ ឬលើតុគ្រូដើម្បីកត់វត្តមាន
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>ព្រីនសន្លឹក QR ទាំងអស់</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Controls Bar (Hidden in Print) */}
        <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">ជ្រើសរើសថ្នាក់:</span>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      ថ្នាក់ {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">ខែសិក្សា:</span>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m} value={m}>
                      ខែ {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              សរុប: <span className="font-bold text-slate-800">{ALL_SUBJECTS.length} មុខវិជ្ជា</span> (ទម្រង់ព្រីន A4 រៀបចំស្វ័យប្រវត្តិ)
            </div>
          </div>
        </div>

        {/* Printable Grid of Subject QR Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4 print:p-0">
          {ALL_SUBJECTS.map((sub) => {
            const monitorLink = getMonitorLink(sub.name);
            const isCopied = copiedSubject === sub.name;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs flex flex-col items-center text-center print:border-slate-400 print:shadow-none print:break-inside-avoid print:p-4"
              >
                {/* School Emblem & Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg overflow-hidden relative border border-slate-200 bg-white shrink-0">
                    <Image
                      src="/images/app-logo.png"
                      alt="Logo"
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700">វត្តមាន & ពិន្ទុ</span>
                </div>

                {/* Class & Subject Badge */}
                <div className="mb-3">
                  <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1">
                    ថ្នាក់: {className}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {sub.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ច្រកកត់វត្តមានប្រធានថ្នាក់ • ខែ {month}
                  </p>
                </div>

                {/* QR Code Canvas */}
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs mb-3 flex items-center justify-center">
                  <QRCodeCanvas
                    id={`qr-canvas-${sub.name}`}
                    value={monitorLink}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* Instructions */}
                <p className="text-[11px] font-medium text-slate-600 mb-4 print:mb-0">
                  ស្កេន QR Code នេះដើម្បីកត់វត្តមានម៉ោង {sub.name}
                </p>

                {/* Action Buttons (Hidden when printing) */}
                <div className="no-print w-full flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href={`/attendance/monitor?sheetId=${encodeURIComponent(
                      sheetId
                    )}&class=${encodeURIComponent(className)}&subject=${encodeURIComponent(
                      sub.name
                    )}&month=${encodeURIComponent(month)}`}
                    target="_blank"
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>បើកមើល</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(sub.name)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">បានចម្លង</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ចម្លង Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadQr(sub.name)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="ទាញយកជារូបភាព QR"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Print Style Injections */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

export default function SubjectQrCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-xs">
            <p className="text-sm font-semibold text-slate-700">កំពុងរៀបចំសន្លឹក QR Code...</p>
          </div>
        </div>
      }
    >
      <SubjectQrCardsContent />
    </Suspense>
  );
}
