"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Save,
  ArrowLeft,
  Users,
  RefreshCw,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Filter,
  BarChart3,
  Printer,
  Search,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  BookOpen,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { SubjectAbsenceSummaryData, StudentSubjectAbsence } from "@/types/attendance";
import { DEFAULT_GRADE_SUBJECTS } from "@/types/grades";

interface Student {
  id: string;
  name: string;
  gender: string;
  phone: string;
  className: string;
  registeredAt: string;
  note?: string;
}

type AttendanceStatus = "present" | "permission" | "absent";

interface StudentAttendanceState {
  status: AttendanceStatus;
  note: string;
}

const MONTHS_OPTIONS = [
  { value: "all", label: "គ្រប់ខែ (សរុប)" },
  { value: "2026-10", label: "ខែ តុលា 2026" },
  { value: "2026-09", label: "ខែ កញ្ញា 2026" },
  { value: "2026-08", label: "ខែ សីហា 2026" },
  { value: "2026-07", label: "ខែ កក្កដា 2026" },
  { value: "2026-06", label: "ខែ មិថុនា 2026" },
  { value: "2026-05", label: "ខែ ឧសភា 2026" },
  { value: "2026-04", label: "ខែ មេសា 2026" },
  { value: "2026-03", label: "ខែ មីនា 2026" },
  { value: "2026-02", label: "ខែ កុម្ភៈ 2026" },
  { value: "2026-01", label: "ខែ មករា 2026" },
];

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSheetId = searchParams.get("sheetId");
  const paramClass = searchParams.get("class");
  const paramView = searchParams.get("view");

  const [sheetId, setSheetId] = useState<string>("");
  const [sheetTitle, setSheetTitle] = useState<string>("");

  // Mode switcher: "daily" (Daily attendance calling) vs "summary" (Subject absence matrix)
  const [viewMode, setViewMode] = useState<"daily" | "summary">(
    paramView === "summary" ? "summary" : "daily"
  );

  // Daily Mode States
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState(paramClass || "all");
  const [selectedDailySubject, setSelectedDailySubject] = useState<string>("វត្តមានទូទៅ");
  const [attendanceData, setAttendanceData] = useState<
    Record<string, StudentAttendanceState>
  >({});

  // Summary Matrix States
  const [summaryData, setSummaryData] = useState<SubjectAbsenceSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryMonth, setSummaryMonth] = useState<string>("all");
  const [summaryClass, setSummaryClass] = useState<string>(paramClass || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"table" | "cards">("table");
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Initialize sheet info
  useEffect(() => {
    let id = paramSheetId;
    let title = "";

    if (!id) {
      try {
        const saved = localStorage.getItem("connected_sheet");
        if (saved) {
          const parsed = JSON.parse(saved);
          id = parsed.id;
          title = parsed.title;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (id) {
      setSheetId(id);
      setSheetTitle(title);
      loadDailyData(id, selectedDate, selectedDailySubject);
    } else {
      setLoading(false);
    }
  }, [paramSheetId]);

  // Load summary data when switching to summary mode or filters change
  useEffect(() => {
    if (viewMode === "summary" && sheetId) {
      loadSummaryData(sheetId, summaryClass, summaryMonth);
    }
  }, [viewMode, sheetId, summaryClass, summaryMonth]);

  // Sync viewMode with search params without full refresh
  const handleSwitchView = (mode: "daily" | "summary") => {
    setViewMode(mode);
    const params = new URLSearchParams(window.location.search);
    params.set("view", mode);
    if (mode === "summary" && summaryClass !== "all") {
      params.set("class", summaryClass);
    } else if (mode === "daily" && selectedClass !== "all") {
      params.set("class", selectedClass);
    }
    router.replace(`/attendance?${params.toString()}`);
  };

  // 1. Daily Data Loader
  const loadDailyData = async (
    targetSheetId: string,
    targetDate: string,
    targetSubject: string = selectedDailySubject
  ) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const stuRes = await fetch(
        `/api/students?sheetId=${encodeURIComponent(targetSheetId)}`
      );
      const stuData = await stuRes.json();
      if (!stuRes.ok || !stuData.success) {
        throw new Error(stuData.error || "បរាជ័យក្នុងការទាញយកបញ្ជីសិស្ស");
      }

      const fetchedStudents: Student[] = stuData.students || [];
      setStudents(fetchedStudents);

      const subParam =
        targetSubject && targetSubject !== "វត្តមានទូទៅ"
          ? `&subject=${encodeURIComponent(targetSubject)}`
          : "";
      const attRes = await fetch(
        `/api/attendance?sheetId=${encodeURIComponent(targetSheetId)}&date=${encodeURIComponent(
          targetDate
        )}${subParam}`
      );
      const attData = await attRes.json();
      const existingRecords = attData.records || {};

      const initialMap: Record<string, StudentAttendanceState> = {};
      fetchedStudents.forEach((stu) => {
        if (existingRecords[stu.id]) {
          initialMap[stu.id] = {
            status: existingRecords[stu.id].status || "present",
            note: existingRecords[stu.id].note || "",
          };
        } else {
          initialMap[stu.id] = {
            status: "present",
            note: "",
          };
        }
      });

      setAttendanceData(initialMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDailySubjectChange = (newSub: string) => {
    setSelectedDailySubject(newSub);
    if (sheetId) {
      loadDailyData(sheetId, selectedDate, newSub);
    }
  };

  // 2. Summary Data Loader
  const loadSummaryData = async (
    targetSheetId: string,
    targetClass: string,
    targetMonth: string
  ) => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch(
        `/api/attendance/summary?sheetId=${encodeURIComponent(
          targetSheetId
        )}&class=${encodeURIComponent(targetClass)}&month=${encodeURIComponent(targetMonth)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "បរាជ័យក្នុងការទាញយកទិន្នន័យសរុបអវត្តមាន");
      }
      setSummaryData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSummaryError(msg);
    } finally {
      setSummaryLoading(false);
    }
  };

  // 3. Export Summary to Dedicated Google Sheet Tab
  const handleExportSummaryToSheet = async () => {
    if (!sheetId) return;
    setExporting(true);
    setExportSuccess(null);
    setSummaryError(null);
    try {
      const res = await fetch("/api/attendance/summary/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          className: summaryClass,
          month: summaryMonth,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "បរាជ័យក្នុងការ Export ចូល Google Sheet");
      }
      setExportSuccess(`បានបង្កើតសន្លឹកកិច្ចការ «${json.tabName}» ក្នុង Google Sheet ជោគជ័យ!`);
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSummaryError(msg);
    } finally {
      setExporting(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (sheetId) {
      loadDailyData(sheetId, newDate);
    }
  };

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { note: "" }),
        status,
      },
    }));
  };

  const updateStudentNote = (studentId: string, note: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "present" }),
        note,
      },
    }));
  };

  const markAllAs = (status: AttendanceStatus) => {
    const updated = { ...attendanceData };
    filteredStudents.forEach((stu) => {
      updated[stu.id] = {
        ...(updated[stu.id] || { note: "" }),
        status,
      };
    });
    setAttendanceData(updated);
  };

  const handleSaveAttendance = async () => {
    if (!sheetId) return;
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const records = filteredStudents.map((stu) => {
        const item = attendanceData[stu.id] || { status: "present", note: "" };
        return {
          studentId: stu.id,
          studentName: stu.name,
          className: stu.className,
          status: item.status,
          note: item.note,
          subject: selectedDailySubject,
        };
      });

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          date: selectedDate,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "បរាជ័យក្នុងការរក្សាទុក");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const classes = Array.from(
    new Set(students.map((s) => s.className).filter(Boolean))
  );

  const filteredStudents = students.filter((s) => {
    if (selectedClass === "all") return true;
    return s.className === selectedClass;
  });

  const countPresent = filteredStudents.filter(
    (s) => (attendanceData[s.id]?.status || "present") === "present"
  ).length;
  const countPermission = filteredStudents.filter(
    (s) => attendanceData[s.id]?.status === "permission"
  ).length;
  const countAbsent = filteredStudents.filter(
    (s) => attendanceData[s.id]?.status === "absent"
  ).length;

  // Filter summary students by search query
  const filteredSummaryStudents: StudentSubjectAbsence[] = useMemo(() => {
    if (!summaryData) return [];
    if (!searchQuery.trim()) return summaryData.students;
    const q = searchQuery.toLowerCase().trim();
    return summaryData.students.filter(
      (st) =>
        st.studentName.toLowerCase().includes(q) ||
        st.studentId.toLowerCase().includes(q)
    );
  }, [summaryData, searchQuery]);

  // Students with high absences (> 3 sessions)
  const highAbsenceStudents = useMemo(() => {
    if (!summaryData) return [];
    return summaryData.students.filter((st) => st.totalMissed >= 3);
  }, [summaryData]);

  if (!sheetId) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">
              មិនទាន់បានភ្ជាប់ Google Sheet
            </h2>
            <p className="text-sm text-slate-600">
              សូមចូលទៅកាន់ទំព័រដើម ដើម្បីភ្ជាប់ Google Sheet របស់លោកគ្រូអ្នកគ្រូជាមុនសិន។
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ទៅកាន់ទំព័រដើម</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-100/60 pb-36 print:pb-0 print:bg-white"
      suppressHydrationWarning
    >
      <div className="print:hidden">
        <Navbar sheetId={sheetId} sheetTitle={sheetTitle} />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Printable Official Header (Only shown during print) */}
        <div className="hidden print:block text-center pb-4 border-b border-slate-400 mb-6 space-y-2">
          <h2 className="text-sm font-bold">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 className="text-xs font-semibold">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div className="w-20 h-0.5 bg-slate-800 mx-auto my-1"></div>
          <h1 className="text-lg font-bold text-slate-900 pt-2">
            តារាងសរុបអវត្តមានសិស្សតាមមុខវិជ្ជា
          </h1>
          <p className="text-xs text-slate-600">
            ថ្នាក់៖ {summaryClass === "all" ? "គ្រប់ថ្នាក់" : summaryClass} | សម្រាប់៖{" "}
            {summaryMonth === "all" ? "គ្រប់ខែ (សរុប)" : summaryMonth}
          </p>
        </div>

        {/* Top View Mode Switcher Header */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                title="ត្រឡប់ទៅ Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>ប្រព័ន្ធគ្រប់គ្រងវត្តមាន</span>
                </h1>
                <p className="text-xs text-slate-500">
                  {sheetTitle || "Google Sheet"}
                </p>
              </div>
            </div>

            {/* Top Sheet & Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/attendance/monitor?sheetId=${encodeURIComponent(
                  sheetId
                )}&class=${encodeURIComponent(
                  selectedClass !== "all" && selectedClass ? selectedClass : (classes[0] || "")
                )}&subject=${encodeURIComponent(
                  selectedDailySubject !== "វត្តមានទូទៅ" ? selectedDailySubject : "គណិតវិទ្យា"
                )}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors shadow-xs"
                title="ច្រកកត់វត្តមានសម្រាប់ប្រធានថ្នាក់"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ច្រកប្រធានថ្នាក់</span>
              </Link>

              <Link
                href={`/attendance/qr?sheetId=${encodeURIComponent(
                  sheetId
                )}&class=${encodeURIComponent(
                  selectedClass !== "all" && selectedClass ? selectedClass : (classes[0] || "")
                )}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-xs"
                title="សន្លឹក QR Code តាមមុខវិជ្ជា"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">សន្លឹក QR</span>
              </Link>

              <Link
                href={`/grades?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
                  viewMode === "summary"
                    ? (summaryClass !== "all" ? summaryClass : (classes[0] || ""))
                    : (selectedClass !== "all" ? selectedClass : (classes[0] || ""))
                )}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
              >
                <span>ទៅកាន់តារាងពិន្ទុ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">មើលក្នុង Sheet</span>
              </a>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full border border-slate-200">
            <button
              type="button"
              onClick={() => handleSwitchView("daily")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "daily"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>កត់វត្តមានប្រចាំថ្ងៃ</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView("summary")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "summary" && (summaryClass !== "all" || summaryMonth !== "all")
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>តារាងសរុបអវត្តមានតាមមុខវិជ្ជា</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSummaryClass("all");
                setSummaryMonth("all");
                handleSwitchView("summary");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "summary" && summaryClass === "all" && summaryMonth === "all"
                  ? "bg-white text-emerald-700 shadow-sm border border-emerald-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="ស្រង់ទិន្នន័យវត្តមានសរុបគ្រប់ថ្នាក់ និងគ្រប់មុខវិជ្ជា"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>វត្តមានសរុប (Attendance All)</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 1: DAILY ATTENDANCE CALLING */}
        {/* ------------------------------------------------------------------ */}
        {viewMode === "daily" && (
          <div className="space-y-4 print:hidden">
            {/* Daily Controls Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Date Input */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">កាលបរិច្ឆេទ៖</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="bg-transparent font-semibold text-slate-900 outline-none cursor-pointer"
                    />
                  </div>

                  {/* Class Filter */}
                  {classes.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-transparent font-semibold text-slate-900 outline-none cursor-pointer"
                      >
                        <option value="all">គ្រប់ថ្នាក់ ({students.length})</option>
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>
                            ថ្នាក់ {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Daily Subject Selector */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">មុខវិជ្ជា៖</span>
                    <select
                      value={selectedDailySubject}
                      onChange={(e) => handleDailySubjectChange(e.target.value)}
                      className="bg-transparent font-semibold text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="វត្តមានទូទៅ">វត្តមានទូទៅ</option>
                      {DEFAULT_GRADE_SUBJECTS.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Bulk Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllAs("present")}
                    className="text-xs px-3 py-1.5 rounded-xl font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>វត្តមានទាំងអស់</span>
                  </button>
                  <button
                    onClick={() => loadDailyData(sheetId, selectedDate, selectedDailySubject)}
                    disabled={loading}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    សិស្សសរុប
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-800">
                    {filteredStudents.length}
                  </span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    វត្តមាន
                  </span>
                  <span className="text-base sm:text-lg font-bold text-emerald-800">
                    {countPresent}
                  </span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-700 font-medium block">
                    ច្បាប់
                  </span>
                  <span className="text-base sm:text-lg font-bold text-amber-800">
                    {countPermission}
                  </span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-700 font-medium block">
                    អវត្តមាន
                  </span>
                  <span className="text-base sm:text-lg font-bold text-rose-800">
                    {countAbsent}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Student List */}
            {loading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm">កំពុងផ្ទុកទិន្នន័យសិស្សពី Google Sheet...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  មិនទាន់មានឈ្មោះសិស្សក្នុងថ្នាក់នេះទេ
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  សូមចែករំលែក Link ឬ QR Code ឱ្យសិស្សចុះឈ្មោះជាមុនសិន។
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ត្រឡប់ទៅមើល QR Code</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student, idx) => {
                  const currentStatus = attendanceData[student.id]?.status || "present";
                  const currentNote = attendanceData[student.id]?.note || "";

                  return (
                    <div
                      key={student.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                    >
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 font-mono flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {student.name}
                            </h4>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                student.gender === "ស្រី"
                                  ? "bg-pink-50 text-pink-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {student.gender}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono text-[11px]">{student.id}</span>
                            <span>•</span>
                            <span>{student.className}</span>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Toggle Buttons */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => updateStudentStatus(student.id, "present")}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            currentStatus === "present"
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30"
                              : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>វត្តមាន</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateStudentStatus(student.id, "permission")}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            currentStatus === "permission"
                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/30"
                              : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>ច្បាប់</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateStudentStatus(student.id, "absent")}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            currentStatus === "absent"
                              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/30"
                              : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>អវត្តមាន</span>
                        </button>

                        <input
                          type="text"
                          placeholder="ចំណាំ..."
                          value={currentNote}
                          onChange={(e) => updateStudentNote(student.id, e.target.value)}
                          className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-24 sm:w-28 text-slate-700 placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Save Bar for Daily Calling */}
            <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 p-3 sm:p-4 shadow-xl">
              <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600 hidden sm:block">
                  កាលបរិច្ឆេទ៖ <span className="font-bold text-slate-900">{selectedDate}</span> (
                  <span className="text-emerald-700 font-semibold">{countPresent} វត្តមាន</span>,{" "}
                  <span className="text-amber-700 font-semibold">{countPermission} ច្បាប់</span>,{" "}
                  <span className="text-rose-700 font-semibold">{countAbsent} អវត្តមាន</span>)
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <Check className="w-4 h-4" /> បានរក្សាទុកក្នុង Google Sheet រួចរាល់!
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={saving || filteredStudents.length === 0}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>កំពុងរក្សាទុក...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>រក្សាទុកវត្តមាន</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 2: SUBJECT ABSENCE SUMMARY MATRIX (ផ្ទាំងតារាងសរុបអវត្តមានតាមមុខវិជ្ជា) */}
        {/* ------------------------------------------------------------------ */}
        {viewMode === "summary" && (
          <div className="space-y-4">
            {/* Filter & Action Toolbar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Class selector */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-700">ថ្នាក់៖</span>
                    <select
                      value={summaryClass}
                      onChange={(e) => setSummaryClass(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="all">គ្រប់ថ្នាក់</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>
                          ថ្នាក់ {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Month Selector */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-700">ខែ៖</span>
                    <select
                      value={summaryMonth}
                      onChange={(e) => setSummaryMonth(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      {MONTHS_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Student Input */}
                  <div className="relative flex-1 sm:w-48 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="ស្វែងរកឈ្មោះ ឬ ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-slate-50 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Type Toggle on Mobile */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl sm:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileView("table")}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        mobileView === "table"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600"
                      }`}
                      title="ទិដ្ឋភាពតារាង"
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileView("cards")}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        mobileView === "cards"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600"
                      }`}
                      title="ទិដ្ឋភាពកាត"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick All-in-One Toggle Button */}
                  {(summaryClass !== "all" || summaryMonth !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryClass("all");
                        setSummaryMonth("all");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors shadow-xs"
                      title="ជ្រើសរើសគ្រប់ថ្នាក់ និងគ្រប់ខែ"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>មើលគ្រប់ថ្នាក់ & គ្រប់ខែ</span>
                    </button>
                  )}

                  {/* Sync to Sheet Button */}
                  <button
                    type="button"
                    onClick={handleExportSummaryToSheet}
                    disabled={exporting || !summaryData}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all disabled:bg-slate-300 cursor-pointer"
                    title={
                      summaryClass === "all" && summaryMonth === "all"
                        ? "Sync ទៅសន្លឹកកិច្ចការ [អវត្តមាន_all_all] ក្នុង Google Sheet"
                        : "Sync ទៅ Google Sheet"
                    }
                  >
                    {exporting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {summaryClass === "all" && summaryMonth === "all"
                        ? "Sync ទៅ Sheet [អវត្តមាន_all_all]"
                        : "Sync ទៅ Google Sheet"}
                    </span>
                  </button>

                  {/* Print Button */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors"
                    title="បោះពុម្ព ឬរក្សាទុកជា PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={() => loadSummaryData(sheetId, summaryClass, summaryMonth)}
                    disabled={summaryLoading}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                    title="Reload"
                  >
                    <RefreshCw className={`w-4 h-4 ${summaryLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Success & Error alerts */}
              {exportSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{exportSuccess}</span>
                </div>
              )}

              {summaryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{summaryError}</span>
                </div>
              )}

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>សិស្សសរុប</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-slate-900">
                    {summaryData ? summaryData.students.length : 0} នាក់
                  </span>
                </div>

                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between text-purple-700 text-xs mb-1">
                    <span>សរុបការខកខាន</span>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-purple-900">
                    {summaryData ? summaryData.totalMissed : 0} ម៉ោង
                  </span>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
                    <span>សុំច្បាប់សរុប</span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-amber-900">
                    {summaryData ? summaryData.totalPermission : 0} ម៉ោង
                  </span>
                </div>

                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <div className="flex items-center justify-between text-rose-700 text-xs mb-1">
                    <span>អវត្តមានឥតច្បាប់</span>
                    <XCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-rose-900">
                    {summaryData ? summaryData.totalAbsent : 0} ម៉ោង
                  </span>
                </div>
              </div>

              {/* Alert for high absence students */}
              {highAbsenceStudents.length > 0 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      សេចក្តីជូនដំណឹង៖ មានសិស្សចំនួន {highAbsenceStudents.length} នាក់
                      ខកខានលើសពី ៣ ម៉ោងឡើងទៅ
                    </p>
                    <p className="text-[11px] text-amber-700">
                      សិស្ស៖{" "}
                      {highAbsenceStudents
                        .slice(0, 5)
                        .map((s) => `${s.studentName} (${s.totalMissed} ម៉ោង)`)
                        .join(", ")}
                      {highAbsenceStudents.length > 5 ? "..." : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Matrix View Content */}
            {summaryLoading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-3 print:hidden">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm">កំពុងគណនាតារាងសរុបអវត្តមានតាមមុខវិជ្ជា...</p>
              </div>
            ) : !summaryData || filteredSummaryStudents.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 print:hidden">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  មិនមានទិន្នន័យអវត្តមានក្នុងចន្លោះពេលនេះទេ
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  សិស្សទាំងអស់មានវត្តមានពេញលេញ ឬមិនទាន់មានការកត់ត្រាអវត្តមានក្នុងខែនេះនៅឡើយ។
                </p>
              </div>
            ) : (
              <>
                {/* 1. TABLE MATRIX VIEW (Desktop & Mobile Swipe with Sticky Student Name) */}
                <div
                  className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${
                    mobileView === "cards" ? "hidden sm:block" : "block"
                  }`}
                >
                  {/* Mobile swipe hint */}
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between sm:hidden print:hidden">
                    <span>អូសទៅឆ្វេង-ស្តាំ ដើម្បីមើលមុខវិជ្ជាទាំងអស់</span>
                    <TableIcon className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="overflow-x-auto relative print:overflow-visible">
                    <table className="w-full text-xs text-left border-collapse min-w-[700px] print:min-w-0 print:text-[8pt]">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold print:border-b print:border-slate-400">
                          <th className="py-3 px-2 text-center w-10 print:w-6 print:py-1 print:px-0.5">#</th>
                          {/* Pinned Sticky Name Column */}
                          <th className="py-3 px-3 min-w-[140px] sticky left-0 z-20 bg-slate-100 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.02)] print:static print:shadow-none print:min-w-0 print:py-1 print:px-1">
                            ឈ្មោះសិស្ស
                          </th>
                          <th className="py-3 px-2 text-center w-12 print:w-8 print:py-1 print:px-0.5">ភេទ</th>
                          <th className="py-3 px-2 text-center w-16 print:w-10 print:py-1 print:px-0.5">ថ្នាក់</th>

                          {/* Dynamic Subject Columns */}
                          {summaryData.subjects.map((sub) => (
                            <th
                              key={sub}
                              className="py-3 px-2 text-center font-bold min-w-[100px] border-r border-slate-200 print:min-w-0 print:py-1 print:px-0.5 print:text-[7.5pt]"
                            >
                              <span className="block truncate max-w-[110px] print:max-w-none print:whitespace-nowrap" title={sub}>
                                {sub}
                              </span>
                              <span className="text-[9px] font-normal text-slate-400 block mt-0.5 print:text-[6.5pt]">
                                ច / អ
                              </span>
                            </th>
                          ))}

                          {/* Totals Columns */}
                          <th className="py-3 px-2.5 text-center bg-amber-50/70 text-amber-800 w-20 border-r border-slate-200 print:bg-transparent print:text-black print:min-w-0 print:w-auto print:py-1 print:px-0.5">
                            សរុបច្បាប់
                          </th>
                          <th className="py-3 px-2.5 text-center bg-rose-50/70 text-rose-800 w-20 border-r border-slate-200 print:bg-transparent print:text-black print:min-w-0 print:w-auto print:py-1 print:px-0.5">
                            សរុបអវត្តមាន
                          </th>
                          <th className="py-3 px-2.5 text-center bg-purple-50 text-purple-900 w-24 print:bg-transparent print:text-black print:min-w-0 print:w-auto print:py-1 print:px-0.5">
                            សរុបខកខាន
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredSummaryStudents.map((st, idx) => {
                          const hasHighAbsence = st.totalMissed >= 5;
                          const hasWarning = st.totalMissed >= 3;

                          return (
                            <tr
                              key={st.studentId}
                              className={`hover:bg-slate-50 transition-colors print:border-b print:border-slate-300 ${
                                hasHighAbsence
                                  ? "bg-rose-50/30"
                                  : hasWarning
                                  ? "bg-amber-50/20"
                                  : ""
                              }`}
                            >
                              {/* Row Index */}
                              <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-[11px] print:text-black print:text-[8pt] print:py-1 print:px-0.5">
                                {idx + 1}
                              </td>

                              {/* Pinned Sticky Name Column */}
                              <td
                                className={`py-2.5 px-3 font-bold sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.02)] print:static print:shadow-none print:py-1 print:px-1 ${
                                  hasHighAbsence
                                    ? "bg-rose-50/80 text-rose-900 print:bg-transparent print:text-black"
                                    : hasWarning
                                    ? "bg-amber-50/80 text-amber-900 print:bg-transparent print:text-black"
                                    : "bg-white text-slate-900 print:bg-transparent print:text-black"
                                }`}
                              >
                                <div className="truncate max-w-[130px] print:max-w-none print:text-[8pt] print:whitespace-nowrap" title={st.studentName}>
                                  {st.studentName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono font-normal print:hidden">
                                  {st.studentId}
                                </div>
                              </td>

                              {/* Gender */}
                              <td className="py-2.5 px-2 text-center print:py-1 print:px-0.5">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium print:text-[8pt] print:p-0 print:bg-transparent ${
                                    st.gender === "ស្រី"
                                      ? "bg-pink-50 text-pink-700 print:text-black"
                                      : "bg-blue-50 text-blue-700 print:text-black"
                                  }`}
                                >
                                  {st.gender}
                                </span>
                              </td>

                              {/* Class */}
                              <td className="py-2.5 px-2 text-center font-medium text-slate-600 text-[11px] print:text-black print:text-[8pt] print:py-1 print:px-0.5">
                                {st.className}
                              </td>

                              {/* Dynamic Subjects Absence Badges */}
                              {summaryData.subjects.map((sub) => {
                                const rec = st.subjects[sub];
                                if (!rec || (rec.permission === 0 && rec.absent === 0)) {
                                  return (
                                    <td
                                      key={sub}
                                      className="py-2.5 px-2 text-center text-slate-300 font-mono border-r border-slate-100 print:py-1 print:px-0.5 print:text-[8pt] print:text-slate-400"
                                    >
                                      -
                                    </td>
                                  );
                                }

                                return (
                                  <td
                                    key={sub}
                                    className="py-2.5 px-2 text-center border-r border-slate-100 print:py-1 print:px-0.5"
                                  >
                                    <div className="flex items-center justify-center gap-1 print:gap-0.5">
                                      {rec.permission > 0 && (
                                        <span
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 print:bg-transparent print:border-none print:text-black print:text-[7.5pt] print:p-0"
                                          title={`សុំច្បាប់៖ ${rec.permission} ម៉ោង`}
                                        >
                                          ច:{rec.permission}
                                        </span>
                                      )}
                                      {rec.absent > 0 && (
                                        <span
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 print:bg-transparent print:border-none print:text-black print:text-[7.5pt] print:p-0"
                                          title={`អវត្តមានឥតច្បាប់៖ ${rec.absent} ម៉ោង`}
                                        >
                                          អ:{rec.absent}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Total Permission */}
                              <td className="py-2.5 px-2 text-center font-bold text-amber-700 bg-amber-50/30 border-r border-slate-100 print:bg-transparent print:text-black print:py-1 print:px-0.5 print:text-[8pt]">
                                {st.totalPermission > 0 ? st.totalPermission : "-"}
                              </td>

                              {/* Total Absent */}
                              <td className="py-2.5 px-2 text-center font-bold text-rose-700 bg-rose-50/30 border-r border-slate-100 print:bg-transparent print:text-black print:py-1 print:px-0.5 print:text-[8pt]">
                                {st.totalAbsent > 0 ? st.totalAbsent : "-"}
                              </td>

                              {/* Grand Total Missed */}
                              <td className="py-2.5 px-2 text-center bg-purple-50/40 print:bg-transparent print:py-1 print:px-0.5">
                                {st.totalMissed === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 print:bg-transparent print:border-none print:text-black print:text-[8pt]">
                                    <Check className="w-3 h-3 print:hidden" /> ពេញ
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black print:bg-transparent print:text-black print:text-[8pt] print:p-0 ${
                                      hasHighAbsence
                                        ? "bg-rose-600 text-white shadow-sm"
                                        : hasWarning
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-200 text-slate-800"
                                    }`}
                                  >
                                    {st.totalMissed}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. MOBILE CARDS ALTERNATIVE VIEW (For vertical scrolling on phones) */}
                <div
                  className={`space-y-3 sm:hidden print:hidden ${
                    mobileView === "table" ? "hidden" : "block"
                  }`}
                >
                  {filteredSummaryStudents.map((st, idx) => {
                    const hasHighAbsence = st.totalMissed >= 5;
                    const hasWarning = st.totalMissed >= 3;
                    const subjectEntries = Object.entries(st.subjects).filter(
                      ([, val]) => val.permission > 0 || val.absent > 0
                    );

                    return (
                      <div
                        key={st.studentId}
                        className={`bg-white p-4 rounded-2xl border shadow-sm space-y-3 ${
                          hasHighAbsence
                            ? "border-rose-300 ring-1 ring-rose-200"
                            : hasWarning
                            ? "border-amber-300"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 font-mono">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">
                                  {st.studentName}
                                </h4>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                    st.gender === "ស្រី"
                                      ? "bg-pink-50 text-pink-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {st.gender}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {st.studentId} • ថ្នាក់ {st.className}
                              </span>
                            </div>
                          </div>

                          {/* Badge */}
                          <div>
                            {st.totalMissed === 0 ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> វត្តមានពេញ
                              </span>
                            ) : (
                              <span
                                className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-xs ${
                                  hasHighAbsence
                                    ? "bg-rose-600 text-white"
                                    : hasWarning
                                    ? "bg-amber-500 text-white"
                                    : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                ខកខាន៖ {st.totalMissed} ម៉ោង
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subject Breakdown Badges */}
                        {subjectEntries.length > 0 ? (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                              មុខវិជ្ជាដែលមានការខកខាន៖
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {subjectEntries.map(([subName, rec]) => (
                                <div
                                  key={subName}
                                  className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5"
                                >
                                  <span className="font-bold text-slate-800">
                                    {subName}:
                                  </span>
                                  {rec.permission > 0 && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">
                                      ច:{rec.permission}
                                    </span>
                                  )}
                                  {rec.absent > 0 && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 rounded">
                                      អ:{rec.absent}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                            គ្មានការខកខានមុខវិជ្ជាណាមួយឡើយ
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Printable Signature Section (Only in print view) */}
                <div className="hidden print:grid grid-cols-2 pt-10 text-center text-xs">
                  <div>
                    <p className="font-bold">បានឃើញ និងអនុម័ត</p>
                    <p className="font-semibold text-slate-600">នាយក/នាយិកាសាលា</p>
                    <div className="h-20"></div>
                    <p className="font-bold text-slate-400">ហត្ថលេខា & ត្រា</p>
                  </div>
                  <div>
                    <p className="font-bold">
                      រាជធានី/ខេត្ត, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...
                    </p>
                    <p className="font-semibold text-slate-600">គ្រូបន្ទុកថ្នាក់</p>
                    <div className="h-20"></div>
                    <p className="font-bold text-slate-400">ហត្ថលេខា</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
