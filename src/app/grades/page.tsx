"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  BookOpen,
  User,
  CheckCircle2,
  Save,
  AlertCircle,
  Calendar,
  GraduationCap,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  Trophy,
  Medal,
  Award,
  Clock,
  Printer,
  ChevronDown,
  Plus,
  Send,
} from "lucide-react";
import { StudentGradeRow, DEFAULT_GRADE_SUBJECTS } from "@/types/grades";

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
  "ឆមាសទី១",
  "ឆមាសទី២",
  "ប្រចាំឆ្នាំ",
];

function GradesContent() {
  const searchParams = useSearchParams();
  const [sheetId, setSheetId] = useState(searchParams.get("sheetId") || "");
  const [className, setClassName] = useState(searchParams.get("class") || "12A");
  const [month, setMonth] = useState(searchParams.get("month") || "តុលា");

  const [availableClasses, setAvailableClasses] = useState<string[]>(["12", "12A"]);
  const [subjects, setSubjects] = useState<string[]>(
    DEFAULT_GRADE_SUBJECTS.map((s) => s.name)
  );
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [subjectStats, setSubjectStats] = useState<
    Record<string, { submittedCount: number; totalCount: number }>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSubject, setCopiedSubject] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Initialize sheetId and classes from localStorage if not in URL
  useEffect(() => {
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

  // Load matrix from API
  const fetchMatrix = async () => {
    if (!sheetId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/grades?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
          className
        )}&month=${encodeURIComponent(month)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "បរាជ័យក្នុងការទាញយកតារាងពិន្ទុ");
      }

      setSubjects(json.data.subjects || []);
      setStudents(json.data.students || []);
      setSubjectStats(json.data.subjectStats || {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sheetId) {
      fetchMatrix();
    }
  }, [sheetId, className, month]);

  // Handle cell edit
  const handleScoreChange = (
    studentId: string,
    subjectName: string,
    value: string
  ) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    const num = parseFloat(value);
    if (!isNaN(num) && (num < 0 || num > 100)) return;

    setStudents((prev) =>
      prev.map((st) => {
        if (st.studentId === studentId) {
          const updatedScores = { ...st.scores };
          updatedScores[subjectName] = value === "" ? "" : isNaN(num) ? "" : num;
          return { ...st, scores: updatedScores };
        }
        return st;
      })
    );
  };

  // Recompute ranks and totals locally
  const handleCalculateRanks = () => {
    const computed = students.map((st) => {
      let sum = 0;
      let count = 0;
      for (const sub of subjects) {
        const val = st.scores[sub];
        if (val !== undefined && val !== "" && !isNaN(Number(val))) {
          sum += Number(val);
          count++;
        }
      }

      const avg = subjects.length > 0 && count > 0
        ? parseFloat((sum / subjects.length).toFixed(2))
        : 0;

      let mention = "-";
      if (count > 0) {
        if (avg >= 42.5) mention = "និទ្ទេស A";
        else if (avg >= 37.5) mention = "និទ្ទេស B";
        else if (avg >= 32.5) mention = "និទ្ទេស C";
        else if (avg >= 27.5) mention = "និទ្ទេស D";
        else if (avg >= 25.0) mention = "និទ្ទេស E";
        else mention = "និទ្ទេស F";
      }

      return {
        ...st,
        total: parseFloat(sum.toFixed(2)),
        average: avg,
        mention,
        hasScore: count > 0,
        rank: "-" as number | "-",
      };
    });

    const scored = computed
      .filter((s) => s.hasScore)
      .sort((a, b) => b.total - a.total);

    let currentRank = 1;
    for (let i = 0; i < scored.length; i++) {
      if (i > 0 && scored[i].total < scored[i - 1].total) {
        currentRank = i + 1;
      }
      scored[i].rank = currentRank;
    }

    const rankMap = new Map<string, number | "-">();
    scored.forEach((s) => rankMap.set(s.studentId, s.rank));

    const finalStudents = computed.map((s) => ({
      ...s,
      rank: rankMap.get(s.studentId) ?? "-",
    }));

    setStudents(finalStudents);
    setSuccessMsg("បានគណនា និងរៀបចំណាត់ថ្នាក់សិស្សជោគជ័យ! សូមចុច «រក្សាទុក» ដើម្បី Sync ចូល Google Sheet។");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Save full matrix to Google Sheets
  const handleSaveMatrix = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_matrix",
          sheetId,
          className,
          month,
          subjects,
          students,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "បរាជ័យក្នុងការរក្សាទុក");
      }

      setStudents(json.data.students || []);
      setSubjectStats(json.data.subjectStats || {});
      setSuccessMsg("បានរក្សាទុកពិន្ទុ និងចំណាត់ថ្នាក់ចូល Google Sheet ដោយជោគជ័យ!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Copy Telegram link for a specific subject
  const copySubjectLink = (subjectName: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/grades/input?sheetId=${encodeURIComponent(
      sheetId
    )}&class=${encodeURIComponent(className)}&month=${encodeURIComponent(
      month
    )}&subject=${encodeURIComponent(subjectName)}`;

    navigator.clipboard.writeText(link);
    setCopiedSubject(subjectName);
    setTimeout(() => setCopiedSubject(null), 3000);
  };

  const getRankBadge = (rank: number | "-") => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 shadow-sm">
          <Trophy className="w-3.5 h-3.5 text-amber-600" />
          <span>លេខ ១</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300">
          <Medal className="w-3.5 h-3.5 text-slate-600" />
          <span>លេខ ២</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 font-bold text-xs border border-amber-200">
          <Award className="w-3.5 h-3.5 text-amber-700" />
          <span>លេខ ៣</span>
        </span>
      );
    }
    if (rank === "-") {
      return <span className="text-slate-400 font-medium text-xs">-</span>;
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs">
        លេខ {rank}
      </span>
    );
  };

  const getMentionBadge = (mention: string) => {
    if (mention.includes("A")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          {mention}
        </span>
      );
    }
    if (mention.includes("B") || mention.includes("C")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {mention}
        </span>
      );
    }
    if (mention.includes("D") || mention.includes("E")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          {mention}
        </span>
      );
    }
    if (mention.includes("F")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          {mention}
        </span>
      );
    }
    return <span className="text-slate-400 text-xs">-</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hide navbar when in print mode */}
      {!isPrintMode && <Navbar sheetId={sheetId} />}

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Controls Bar */}
        {!isPrintMode && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-emerald-600" />
                  <span>តារាងពិន្ទុ និងចំណាត់ថ្នាក់ប្រចាំខែ</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  សម្រាប់លោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់ គ្រប់គ្រងពិន្ទុ និងផ្ញើ Link ទៅគ្រូមុខវិជ្ជា
                </p>
              </div>

              {/* Class & Month Selectors */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Class selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {availableClasses.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setClassName(cls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        className === cls
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ថ្នាក់ {cls}
                    </button>
                  ))}
                </div>

                {/* Month dropdown */}
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="appearance-none bg-slate-100 border-none font-bold text-xs text-slate-800 py-2 pl-3 pr-8 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m} value={m}>
                        ខែ {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchMatrix}
                  disabled={loading}
                  className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-slate-200"
                  title="Reload"
                >
                  <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCalculateRanks}
                  disabled={students.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>គណនាចំណាត់ថ្នាក់ស្វ័យប្រវត្តិ</span>
                </button>

                <button
                  onClick={handleSaveMatrix}
                  disabled={saving || students.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>រក្សាទុកទាំងអស់</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPrintMode(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>មើលទម្រង់ព្រីន (Print / PDF)</span>
                </button>

                {sheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>បើក Google Sheet</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Telegram Direct Links Card */}
        {!isPrintMode && (
          <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 rounded-2xl p-5 border border-blue-200/80 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    តំណភ្ជាប់សម្រាប់ផ្ញើតាម Telegram ទៅគ្រូតាមមុខវិជ្ជា
                  </h2>
                  <p className="text-xs text-slate-500">
                    គ្រាន់តែចុច «ចម្លង Link» រួច Paste ផ្ញើទៅគ្រូមុខវិជ្ជា គាត់នឹងចូលបញ្ចូលពិន្ទុតាមទូរស័ព្ទបានភ្លាម!
                  </p>
                </div>
              </div>
            </div>

            {/* Subject Link Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
              {subjects.map((sub) => {
                const stat = subjectStats[sub];
                const isFullySubmitted =
                  stat && stat.totalCount > 0 && stat.submittedCount >= stat.totalCount;
                const isPartiallySubmitted =
                  stat && stat.submittedCount > 0 && stat.submittedCount < stat.totalCount;
                const isCopied = copiedSubject === sub;

                return (
                  <div
                    key={sub}
                    className="bg-white rounded-xl p-3 border border-slate-200/80 hover:border-blue-300 transition-all flex flex-col justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs block truncate">
                          {sub}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isFullySubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>រួចរាល់ ({stat.submittedCount}/{stat.totalCount})</span>
                            </span>
                          ) : isPartiallySubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                              <Clock className="w-3 h-3" />
                              <span>({stat.submittedCount}/{stat.totalCount})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>មិនទាន់បញ្ចូល</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/grades/input?sheetId=${encodeURIComponent(
                          sheetId
                        )}&class=${encodeURIComponent(className)}&month=${encodeURIComponent(
                          month
                        )}&subject=${encodeURIComponent(sub)}`}
                        target="_blank"
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="បើកទំព័រនេះ"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <button
                      onClick={() => copySubjectLink(sub)}
                      className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCopied
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>បានចម្លងរួច!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>ចម្លង Link Telegram</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p className="font-semibold">{successMsg}</p>
          </div>
        )}

        {/* Print Mode Header */}
        {isPrintMode && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none space-y-4">
            <div className="flex items-center justify-between print:hidden pb-4 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-700">
                ទិដ្ឋភាពបោះពុម្ព (Print Preview)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700"
                >
                  <Printer className="w-4 h-4" />
                  <span>បោះពុម្ពឥឡូវនេះ</span>
                </button>
                <button
                  onClick={() => setIsPrintMode(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200"
                >
                  ត្រឡប់ក្រោយ
                </button>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-wider">
                ព្រះរាជាណាចក្រកម្ពុជា
              </h2>
              <p className="text-xs font-semibold text-slate-700">
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </p>
              <div className="pt-2">
                <h3 className="text-base font-black text-slate-900">
                  តារាងស្រង់ពិន្ទុ និងចំណាត់ថ្នាក់សិស្ស
                </h3>
                <p className="text-xs text-slate-600">
                  ថ្នាក់៖ {className} • ប្រចាំខែ៖ {month}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Master Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
              <p className="text-sm text-slate-500 font-medium">
                កំពុងទាញយកតារាងពិន្ទុពី Google Sheet...
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <User className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700">
                មិនទាន់មានសិស្សក្នុងថ្នាក់ {className} នៅឡើយទេ
              </h3>
              <p className="text-xs text-slate-500">
                សូមចុះឈ្មោះសិស្សចូលក្នុងថ្នាក់នេះជាមុនសិន។
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[120px]">ឈ្មោះសិស្ស</th>
                    <th className="py-3 px-2 w-12 text-center">ភេទ</th>
                    {subjects.map((sub) => (
                      <th
                        key={sub}
                        className="py-3 px-2 min-w-[70px] text-center whitespace-nowrap"
                      >
                        {sub}
                      </th>
                    ))}
                    <th className="py-3 px-3 min-w-[70px] text-center bg-emerald-50 text-emerald-900">
                      សរុប
                    </th>
                    <th className="py-3 px-3 min-w-[70px] text-center bg-emerald-50 text-emerald-900">
                      មធ្យមភាគ
                    </th>
                    <th className="py-3 px-3 min-w-[85px] text-center bg-purple-50 text-purple-900">
                      ចំណាត់ថ្នាក់
                    </th>
                    <th className="py-3 px-3 min-w-[80px] text-center bg-purple-50 text-purple-900">
                      និទ្ទេស
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st, idx) => (
                    <tr
                      key={st.studentId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">
                          {st.studentName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {st.studentId}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`font-semibold ${
                            st.gender === "ស្រី"
                              ? "text-pink-600"
                              : "text-blue-600"
                          }`}
                        >
                          {st.gender || "-"}
                        </span>
                      </td>

                      {/* Subject Scores Input Cells */}
                      {subjects.map((sub) => {
                        const scoreVal =
                          st.scores[sub] !== undefined && st.scores[sub] !== ""
                            ? String(st.scores[sub])
                            : "";

                        return (
                          <td key={sub} className="py-2 px-1 text-center">
                            {isPrintMode ? (
                              <span className="font-semibold text-slate-800">
                                {scoreVal || "-"}
                              </span>
                            ) : (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                placeholder="-"
                                value={scoreVal}
                                onChange={(e) =>
                                  handleScoreChange(
                                    st.studentId,
                                    sub,
                                    e.target.value
                                  )
                                }
                                className="w-14 py-1 text-center font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-lg outline-none transition-all text-xs"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-emerald-50/40">
                        {st.total > 0 ? st.total : "-"}
                      </td>

                      {/* Average */}
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40">
                        {st.average > 0 ? st.average : "-"}
                      </td>

                      {/* Rank */}
                      <td className="py-2.5 px-3 text-center bg-purple-50/30">
                        {getRankBadge(st.rank)}
                      </td>

                      {/* Mention */}
                      <td className="py-2.5 px-3 text-center bg-purple-50/30">
                        {getMentionBadge(st.mention)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GradesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <GradesContent />
    </Suspense>
  );
}
