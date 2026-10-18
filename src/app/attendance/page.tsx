"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

type AttendanceStatus = "present" | "permission" | "absent";

interface StudentAttendanceState {
  status: AttendanceStatus;
  note: string;
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const paramSheetId = searchParams.get("sheetId");
  const paramClass = searchParams.get("class");

  const [sheetId, setSheetId] = useState<string>("");
  const [sheetTitle, setSheetTitle] = useState<string>("");

  // Default to today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState(paramClass || "all");
  const [attendanceData, setAttendanceData] = useState<
    Record<string, StudentAttendanceState>
  >({});

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
      loadData(id, selectedDate);
    } else {
      setLoading(false);
    }
  }, [paramSheetId]);

  // Load students and existing attendance for the date
  const loadData = async (targetSheetId: string, targetDate: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch student list
      const stuRes = await fetch(`/api/students?sheetId=${encodeURIComponent(targetSheetId)}`);
      const stuData = await stuRes.json();
      if (!stuRes.ok || !stuData.success) {
        throw new Error(stuData.error || "បរាជ័យក្នុងការទាញយកបញ្ជីសិស្ស");
      }

      const fetchedStudents: Student[] = stuData.students || [];
      setStudents(fetchedStudents);

      // 2. Fetch attendance for this date
      const attRes = await fetch(
        `/api/attendance?sheetId=${encodeURIComponent(targetSheetId)}&date=${encodeURIComponent(
          targetDate
        )}`
      );
      const attData = await attRes.json();
      const existingRecords = attData.records || {};

      // Initialize state for each student: use existing or default to "present"
      const initialMap: Record<string, StudentAttendanceState> = {};
      fetchedStudents.forEach((stu) => {
        if (existingRecords[stu.id]) {
          initialMap[stu.id] = {
            status: existingRecords[stu.id].status || "present",
            note: existingRecords[stu.id].note || "",
          };
        } else {
          initialMap[stu.id] = {
            status: "present", // default to present
            note: "",
          };
        }
      });

      setAttendanceData(initialMap);
    } catch (err: any) {
      setErrorMessage(err.message || "មានបញ្ហាក្នុងការទាញទិន្នន័យ");
    } finally {
      setLoading(false);
    }
  };

  // When date changes, re-fetch attendance for that date
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (sheetId) {
      loadData(sheetId, newDate);
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

  // Mark all filtered students as present/absent/permission
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

  // Save attendance to Google Sheet
  const handleSaveAttendance = async () => {
    if (!sheetId) return;

    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      // Prepare records array
      const records = filteredStudents.map((stu) => {
        const item = attendanceData[stu.id] || { status: "present", note: "" };
        return {
          studentId: stu.id,
          studentName: stu.name,
          className: stu.className,
          status: item.status,
          note: item.note,
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
    } catch (err: any) {
      setErrorMessage(err.message || "មានបញ្ហាក្នុងការរក្សាទុក");
    } finally {
      setSaving(false);
    }
  };

  const classes = Array.from(new Set(students.map((s) => s.className).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    if (selectedClass === "all") return true;
    return s.className === selectedClass;
  });

  // Calculate statistics
  const countPresent = filteredStudents.filter(
    (s) => (attendanceData[s.id]?.status || "present") === "present"
  ).length;
  const countPermission = filteredStudents.filter(
    (s) => attendanceData[s.id]?.status === "permission"
  ).length;
  const countAbsent = filteredStudents.filter(
    (s) => attendanceData[s.id]?.status === "absent"
  ).length;

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
    <div className="min-h-screen flex flex-col bg-slate-100/60 pb-28" suppressHydrationWarning>
      <Navbar sheetId={sheetId} sheetTitle={sheetTitle} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Top Control Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
                <h1 className="text-xl font-bold text-slate-900">
                  កត់វត្តមានសិស្ស
                </h1>
                <p className="text-xs text-slate-500">
                  {sheetTitle || "Google Sheet"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>មើលក្នុង Sheet</span>
              </a>
              <button
                onClick={() => loadData(sheetId, selectedDate)}
                disabled={loading}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Date Picker & Filter Row */}
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
            </div>

            {/* Quick Bulk Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAllAs("present")}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                ✓ វត្តមានទាំងអស់
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">
                សិស្សសរុប
              </span>
              <span className="text-lg font-bold text-slate-800">
                {filteredStudents.length}
              </span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-700 font-medium block">
                វត្តមាន
              </span>
              <span className="text-lg font-bold text-emerald-800">
                {countPresent}
              </span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[11px] text-amber-700 font-medium block">
                ច្បាប់
              </span>
              <span className="text-lg font-bold text-amber-800">
                {countPermission}
              </span>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <span className="text-[11px] text-rose-700 font-medium block">
                អវត្តមាន
              </span>
              <span className="text-lg font-bold text-rose-800">
                {countAbsent}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Student Attendance List */}
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
                    <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 font-mono">
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
                    {/* Present Button */}
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

                    {/* Permission Button */}
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

                    {/* Absent Button */}
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

                    {/* Optional Note input */}
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
      </main>

      {/* Fixed Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 hidden sm:block">
            កាលបរិច្ឆេទ៖ <span className="font-bold text-slate-900">{selectedDate}</span> (
            <span className="text-emerald-700 font-semibold">{countPresent} វត្តមាន</span>,{" "}
            <span className="text-amber-700 font-semibold">{countPermission} ច្បាប់</span>,{" "}
            <span className="text-rose-700 font-semibold">{countAbsent} អវត្តមាន</span>)
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
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
