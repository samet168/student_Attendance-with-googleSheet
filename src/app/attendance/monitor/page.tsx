"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Save,
  ArrowLeft,
  Users,
  RefreshCw,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Filter,
  BarChart3,
  Search,
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  QrCode,
} from "lucide-react";
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

interface AttendanceItem {
  status: AttendanceStatus;
  note: string;
}

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

function ClassMonitorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramSheetId = searchParams.get("sheetId") || "";
  const paramClass = searchParams.get("class") || "";
  const paramSubject = searchParams.get("subject") || "គណិតវិទ្យា";
  const paramMonth = searchParams.get("month") || "តុលា";

  const todayStr = new Date().toISOString().split("T")[0];

  const [sheetId, setSheetId] = useState<string>(paramSheetId);
  const [className, setClassName] = useState<string>(paramClass);
  const [subject, setSubject] = useState<string>(paramSubject);
  const [month, setMonth] = useState<string>(paramMonth);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceItem>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successTabName, setSuccessTabName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(
    DEFAULT_GRADE_SUBJECTS.map((s) => s.name)
  );

  // Discover all classes and subjects dynamically from Google Sheet
  useEffect(() => {
    let currentId = sheetId;
    try {
      const saved = localStorage.getItem("connected_sheet");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id && !currentId) {
          currentId = parsed.id;
          setSheetId(parsed.id);
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (currentId) {
      // 1. Fetch monitor info to get all sheet-discovered classes & custom subjects
      fetch(`/api/attendance/monitor?sheetId=${encodeURIComponent(currentId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            if (Array.isArray(data.availableClasses) && data.availableClasses.length > 0) {
              setAvailableClasses((prev) =>
                Array.from(new Set([...prev, ...data.availableClasses])).filter(Boolean)
              );
              if (!className) {
                setClassName(data.availableClasses[0]);
              }
            }
            if (Array.isArray(data.availableSubjects) && data.availableSubjects.length > 0) {
              setAvailableSubjects((prev) =>
                Array.from(new Set([...prev, ...data.availableSubjects])).filter(Boolean)
              );
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          // 2. Also fetch students as supplementary detection
          fetch(`/api/students?sheetId=${encodeURIComponent(currentId)}`)
            .then((r) => r.json())
            .then((stData) => {
              if (stData.success && Array.isArray(stData.students)) {
                const detected: string[] = Array.from(
                  new Set(stData.students.map((s: any) => String(s.className || "").trim()))
                ).filter((c): c is string => Boolean(c));
                if (detected.length > 0) {
                  setAvailableClasses((prev) =>
                    Array.from(new Set([...prev, ...detected])).filter(Boolean)
                  );
                }
              }
            })
            .catch(() => {});
        });
    } else {
      setLoading(false);
    }
  }, [sheetId]);

  // Fetch students and existing attendance for selected date & subject
  const loadMonitorData = async () => {
    if (!sheetId || !className) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const url = `/api/attendance/monitor?sheetId=${encodeURIComponent(
        sheetId
      )}&class=${encodeURIComponent(className)}&subject=${encodeURIComponent(
        subject
      )}&date=${encodeURIComponent(selectedDate)}&month=${encodeURIComponent(month)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "មិនអាចទាញយកទិន្នន័យបានឡើយ");
      }

      if (data.availableClasses && Array.isArray(data.availableClasses)) {
        setAvailableClasses((prev) =>
          Array.from(new Set([...prev, ...data.availableClasses])).filter(Boolean)
        );
      }
      if (data.availableSubjects && Array.isArray(data.availableSubjects)) {
        setAvailableSubjects((prev) =>
          Array.from(new Set([...prev, ...data.availableSubjects])).filter(Boolean)
        );
      }

      const stList: Student[] = data.students || [];
      setStudents(stList);

      // Populate attendance map
      const attMap: Record<string, AttendanceItem> = {};
      const existingMap = data.attendanceMap || {};

      stList.forEach((st) => {
        if (existingMap[st.id]) {
          attMap[st.id] = {
            status: existingMap[st.id].status || "present",
            note: existingMap[st.id].note || "",
          };
        } else {
          attMap[st.id] = {
            status: "present",
            note: "",
          };
        }
      });

      setAttendanceData(attMap);
    } catch (err: any) {
      setErrorMessage(err.message || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ");
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (newClass: string) => {
    setClassName(newClass);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("class", newClass);
      if (sheetId) params.set("sheetId", sheetId);
      if (subject) params.set("subject", subject);
      if (month) params.set("month", month);
      router.replace(`/attendance/monitor?${params.toString()}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubjectChange = (newSub: string) => {
    setSubject(newSub);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("subject", newSub);
      if (sheetId) params.set("sheetId", sheetId);
      if (className) params.set("class", className);
      if (month) params.set("month", month);
      router.replace(`/attendance/monitor?${params.toString()}`);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (sheetId) {
      loadMonitorData();
    }
  }, [sheetId, className, subject, selectedDate, month]);

  // Status updates
  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const setNote = (studentId: string, note: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceItem> = {};
    students.forEach((st) => {
      updated[st.id] = {
        status: "present",
        note: attendanceData[st.id]?.note || "",
      };
    });
    setAttendanceData(updated);
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!sheetId || students.length === 0) return;

    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const records = students.map((st) => {
        const item = attendanceData[st.id] || { status: "present", note: "" };
        return {
          studentId: st.id,
          studentName: st.name,
          className: st.className,
          status: item.status,
          note: item.note,
          subject: subject,
        };
      });

      const res = await fetch("/api/attendance/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          className,
          subject,
          month,
          date: selectedDate,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "បរាជ័យក្នុងការរក្សាទុកវត្តមាន");
      }

      setSaveSuccess(true);
      setSuccessTabName(data.tabName || `${subject}_${className}_${month}`);
      setTimeout(() => setSaveSuccess(false), 8000);
    } catch (err: any) {
      setErrorMessage(err.message || "មានបញ្ហាក្នុងការរក្សាទុក");
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    let present = 0;
    let permission = 0;
    let absent = 0;

    students.forEach((st) => {
      const stStatus = attendanceData[st.id]?.status || "present";
      if (stStatus === "present") present++;
      else if (stStatus === "permission") permission++;
      else if (stStatus === "absent") absent++;
    });

    return {
      total: students.length,
      present,
      permission,
      absent,
    };
  }, [students, attendanceData]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [students, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/attendance?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
                className
              )}`}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="ត្រឡប់ទៅទំព័រវត្តមានទូទៅ"
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
                  <span>ច្រកកត់វត្តមានប្រធានថ្នាក់</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    Class Monitor
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500">
                  កត់វត្តមានតាមម៉ោងមុខវិជ្ជា និង Sync ចូល Google Sheet ស្វ័យប្រវត្តិ
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/attendance/qr?sheetId=${encodeURIComponent(
                sheetId
              )}&class=${encodeURIComponent(className)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="សន្លឹក QR Code តាមមុខវិជ្ជា"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">សន្លឹក QR</span>
            </Link>

            {sheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">មើលក្នុង Sheet</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-5 w-full flex-1">
        {/* Banner Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ថ្នាក់: {className}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md">
                  <BookOpen className="w-3.5 h-3.5" />
                  មុខវិជ្ជា: {subject}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  ខែ: {month}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-2">
                តារាងកត់វត្តមានម៉ោងសិក្សា {subject}
              </h2>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>វត្តមានទាំងអស់</span>
              </button>

              <button
                type="button"
                onClick={loadMonitorData}
                disabled={loading}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="ទាញយកឡើងវិញ"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Controls Bar (Date, Class, Subject, Month) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
            {/* Date Picker */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                កាលបរិច្ឆេទ
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Class Display (Locked for Class Monitor) */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                ថ្នាក់
              </label>
              <div className="w-full text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 flex items-center justify-between shadow-2xs">
                <span>{className ? `ថ្នាក់ ${className}` : "-- គ្មានថ្នាក់ --"}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                  ជាប់ថ្នាក់
                </span>
              </div>
            </div>

            {/* Subject Switcher */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                មុខវិជ្ជា
              </label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                {Array.from(
                  new Set([
                    ...DEFAULT_GRADE_SUBJECTS.map((s) => s.name),
                    ...availableSubjects,
                    ...(subject ? [subject] : []),
                  ])
                )
                  .filter((s) => s && s !== "វត្តមានទូទៅ")
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>

            {/* Month Switcher */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                ខែសិក្សា
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m} value={m}>
                    ខែ {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4 Stat Boxes (Matching Image 1) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
          {/* Total */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 text-center shadow-xs">
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">សិស្សសរុប</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5">
              {stats.total}
            </p>
          </div>

          {/* Present */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
            <p className="text-[11px] sm:text-xs text-emerald-800 font-medium">វត្តមាន</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-700 mt-0.5">
              {stats.present}
            </p>
          </div>

          {/* Permission */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
            <p className="text-[11px] sm:text-xs text-amber-800 font-medium">ច្បាប់</p>
            <p className="text-lg sm:text-2xl font-bold text-amber-700 mt-0.5">
              {stats.permission}
            </p>
          </div>

          {/* Absent */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
            <p className="text-[11px] sm:text-xs text-rose-800 font-medium">អវត្តមាន</p>
            <p className="text-lg sm:text-2xl font-bold text-rose-700 mt-0.5">
              {stats.absent}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខសិស្ស..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
          />
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">រក្សាទុកវត្តមាន និងធ្វើបច្ចុប្បន្នភាពបានជោគជ័យ!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                ទិន្នន័យត្រូវបានកត់ចូលសន្លឹកមេ «Attendance» និងសន្លឹកមុខវិជ្ជាដាច់ដោយឡែក «{successTabName}» រួចរាល់។
              </p>
            </div>
            {sheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 shrink-0 self-center"
              >
                មើល Sheet
              </a>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Students Attendance List (Matching Image 1) */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">កំពុងទាញយកបញ្ជីសិស្ស និងវត្តមាន...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">មិនមានសិស្សក្នុងថ្នាក់ {className} ឡើយ</p>
            <p className="text-xs text-slate-400 mt-1">
              សូមពិនិត្យមើលថ្នាក់ ឬចុះឈ្មោះសិស្សថ្មីក្នុងប្រព័ន្ធ
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredStudents.map((st, index) => {
              const currentStatus = attendanceData[st.id]?.status || "present";
              const currentNote = attendanceData[st.id]?.note || "";

              return (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Student Identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">
                            {st.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              st.gender === "ស្រី"
                                ? "bg-pink-100 text-pink-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {st.gender}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {st.id} • {st.className}
                        </p>
                      </div>
                    </div>

                    {/* Right: 3 Status Buttons (Matching Image 1) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto justify-end">
                      {/* Present Button */}
                      <button
                        type="button"
                        onClick={() => setStatus(st.id, "present")}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          currentStatus === "present"
                            ? "bg-emerald-600 text-white shadow-xs scale-102"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>វត្តមាន</span>
                      </button>

                      {/* Permission Button */}
                      <button
                        type="button"
                        onClick={() => setStatus(st.id, "permission")}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          currentStatus === "permission"
                            ? "bg-amber-500 text-white shadow-xs scale-102"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>ច្បាប់</span>
                      </button>

                      {/* Absent Button */}
                      <button
                        type="button"
                        onClick={() => setStatus(st.id, "absent")}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          currentStatus === "absent"
                            ? "bg-rose-600 text-white shadow-xs scale-102"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>អវត្តមាន</span>
                      </button>

                      {/* Note Input */}
                      <div className="w-24 sm:w-36">
                        <input
                          type="text"
                          placeholder={
                            currentStatus === "absent"
                              ? "មូលហេតុអវត្តមាន..."
                              : currentStatus === "permission"
                              ? "មូលហេតុសុំច្បាប់..."
                              : "មូលហេតុ..."
                          }
                          title={
                            currentStatus === "absent"
                              ? "មូលហេតុអវត្តមាន"
                              : currentStatus === "permission"
                              ? "មូលហេតុសុំច្បាប់"
                              : "មូលហេតុ"
                          }
                          value={currentNote}
                          onChange={(e) => setNote(st.id, e.target.value)}
                          className={`w-full text-xs rounded-xl px-2.5 py-1.5 transition-all text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                            currentStatus === "absent"
                              ? "border border-rose-300 bg-rose-50/50 focus:ring-rose-500 focus:border-rose-500 placeholder:text-rose-400"
                              : currentStatus === "permission"
                              ? "border border-amber-300 bg-amber-50/50 focus:ring-amber-500 focus:border-amber-500 placeholder:text-amber-400"
                              : "border border-slate-200 bg-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar (Matching Image 1) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Summary Text */}
          <div className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
            <span className="hidden sm:inline text-slate-500">កាលបរិច្ឆេទ: {selectedDate}</span>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                {stats.present} វត្តមាន
              </span>
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                {stats.permission} ច្បាប់
              </span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                {stats.absent} អវត្តមាន
              </span>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || loading || students.length === 0}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 shadow-md shadow-emerald-600/20 active:scale-98 transition-all shrink-0 cursor-pointer"
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
  );
}

export default function ClassMonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-xs">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">កំពុងដំណើរការ...</p>
          </div>
        </div>
      }
    >
      <ClassMonitorContent />
    </Suspense>
  );
}
