"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  BookOpen,
  User,
  CheckCircle2,
  Save,
  AlertCircle,
  Calendar,
  GraduationCap,
  RotateCcw,
  Layers,
  ArrowLeft,
  UserCheck,
  Check,
  X,
  FileText,
  Clock,
  Sparkles,
  CheckCheck,
} from "lucide-react";

interface StudentItem {
  id: string;
  name: string;
  gender: string;
  score: string;
}

interface AttendanceState {
  status: "present" | "permission" | "absent";
  note: string;
}

function SubjectInputContent() {
  const searchParams = useSearchParams();
  const sheetId = searchParams.get("sheetId") || "";
  const className = searchParams.get("class") || "12A";
  const month = searchParams.get("month") || "តុលា";
  const subject = searchParams.get("subject") || "គណិតវិទ្យា";

  // Tab mode: "scores" or "attendance"
  const [activeTab, setActiveTab] = useState<"scores" | "attendance">("scores");

  // Students list
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingScores, setSavingScores] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Attendance state
  const getTodayDate = () => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Phnom_Penh" });
  };
  const [attendanceDate, setAttendanceDate] = useState(getTodayDate());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceState>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Load students and scores
  useEffect(() => {
    if (!sheetId) {
      setError("មិនមាន Google Sheet ID ក្នុងតំណភ្ជាប់នេះទេ។ សូមទាក់ទងលោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់។");
      setLoading(false);
      return;
    }

    const loadData = async () => {
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
          throw new Error(json.error || "មិនអាចទាញយកទិន្នន័យបានទេ");
        }

        const matrix = json.data;
        const studentItems: StudentItem[] = matrix.students.map((st: any) => ({
          id: st.studentId,
          name: st.studentName,
          gender: st.gender,
          score:
            st.scores && st.scores[subject] !== undefined && st.scores[subject] !== ""
              ? String(st.scores[subject])
              : "",
        }));

        setStudents(studentItems);

        // Initialize attendance default map
        const initialAtt: Record<string, AttendanceState> = {};
        studentItems.forEach((st) => {
          initialAtt[st.id] = { status: "present", note: "" };
        });
        setAttendanceMap(initialAtt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sheetId, className, month, subject]);

  // Load attendance for the selected date & subject
  useEffect(() => {
    if (!sheetId || !attendanceDate || students.length === 0) return;

    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const res = await fetch(
          `/api/attendance?sheetId=${encodeURIComponent(sheetId)}&date=${encodeURIComponent(
            attendanceDate
          )}&subject=${encodeURIComponent(subject)}`
        );
        const json = await res.json();
        if (json.success && json.records) {
          setAttendanceMap((prev) => {
            const next = { ...prev };
            students.forEach((st) => {
              if (json.records[st.id]) {
                next[st.id] = {
                  status: json.records[st.id].status || "present",
                  note: json.records[st.id].note || "",
                };
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to load attendance records:", err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [sheetId, attendanceDate, subject, students.length]);

  // Handle Score Change
  const handleScoreChange = (id: string, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    const num = parseFloat(value);
    if (!isNaN(num) && (num < 0 || num > 100)) return;

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, score: value } : s))
    );
  };

  // Save Scores
  const handleSaveScores = async () => {
    setSavingScores(true);
    setError(null);
    setSuccessMsg(null);

    const scoresMap: Record<string, number | ""> = {};
    for (const s of students) {
      if (s.score.trim() === "") {
        scoresMap[s.id] = "";
      } else {
        const val = parseFloat(s.score.trim());
        scoresMap[s.id] = isNaN(val) ? "" : val;
      }
    }

    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_subject",
          sheetId,
          className,
          month,
          subject,
          scores: scoresMap,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "បរាជ័យក្នុងការរក្សាទុកពិន្ទុ");
      }

      setSuccessMsg(`បានរក្សាទុកពិន្ទុមុខវិជ្ជា «${subject}» ដោយជោគជ័យ!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSavingScores(false);
    }
  };

  // Toggle Attendance Status
  const handleStatusChange = (studentId: string, status: "present" | "permission" | "absent") => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { note: "" }),
        status,
      },
    }));
  };

  // Change Attendance Note
  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "present" }),
        note,
      },
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      students.forEach((st) => {
        next[st.id] = {
          ...(next[st.id] || { note: "" }),
          status: "present",
        };
      });
      return next;
    });
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setError(null);
    setSuccessMsg(null);

    const records = students.map((st) => ({
      studentId: st.id,
      studentName: st.name,
      className,
      status: attendanceMap[st.id]?.status || "present",
      note: attendanceMap[st.id]?.note || "",
      subject,
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          date: attendanceDate,
          records,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "បរាជ័យក្នុងការរក្សាទុកវត្តមាន");
      }

      setSuccessMsg(
        `បានរក្សាទុកវត្តមានមុខវិជ្ជា «${subject}» ថ្ងៃទី ${attendanceDate} ដោយជោគជ័យ!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Scores stats
  const enteredScoresCount = students.filter((s) => s.score.trim() !== "").length;
  const scorePercentage =
    students.length > 0 ? Math.round((enteredScoresCount / students.length) * 100) : 0;

  // Attendance stats
  let presentCount = 0;
  let permissionCount = 0;
  let absentCount = 0;
  students.forEach((st) => {
    const s = attendanceMap[st.id]?.status;
    if (s === "present") presentCount++;
    else if (s === "permission") permissionCount++;
    else if (s === "absent") absentCount++;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-xs relative border border-slate-200/60 bg-white flex-shrink-0">
              <Image
                src="/images/app-logo.png"
                alt="Logo"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">
                គ្រូប្រចាំមុខវិជ្ជា «{subject}»
              </h1>
              <p className="text-xs text-slate-500">
                ថ្នាក់ {className} • ខែ {month}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ច្រកគ្រូមុខវិជ្ជា</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        {/* Navigation Tabs: Scores vs Attendance */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("scores")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "scores"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>បញ្ចូលពិន្ទុមុខវិជ្ជា</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>កត់វត្តមានមុខវិជ្ជា</span>
          </button>
        </div>

        {/* Info & Progress Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-emerald-600 tracking-wide uppercase">
                {activeTab === "scores" ? "ការបញ្ចូលពិន្ទុ" : "ការកត់វត្តមានម៉ោងសិក្សា"}
              </span>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                {activeTab === "scores" ? (
                  <GraduationCap className="w-6 h-6 text-emerald-600" />
                ) : (
                  <UserCheck className="w-6 h-6 text-blue-600" />
                )}
                <span>{subject}</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Layers className="w-3.5 h-3.5" />
                <span>ថ្នាក់ {className}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Calendar className="w-3.5 h-3.5" />
                <span>ខែ {month}</span>
              </span>
            </div>
          </div>

          {/* Conditional Sub-bar */}
          {activeTab === "scores" ? (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
                <span>ស្ថានភាពបញ្ចូលពិន្ទុ៖</span>
                <span className="font-bold text-slate-800">
                  {enteredScoresCount} / {students.length} នាក់ ({scorePercentage}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${scorePercentage}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              {/* Date selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">កាលបរិច្ឆេទ៖</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                />
              </div>

              {/* Status Counters & Quick Action */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold">
                  <span>វត្តមាន: {presentCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold">
                  <span>ច្បាប់: {permissionCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold">
                  <span>អវត្តមាន: {absentCount}</span>
                </span>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                  title="កត់មានវត្តមានទាំងអស់"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>វត្តមានទាំងអស់</span>
                </button>
              </div>
            </div>
          )}
        </div>

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

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <p className="text-sm text-slate-500 font-medium">កំពុងទាញយកបញ្ជីឈ្មោះសិស្ស...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-2">
            <User className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700">មិនទាន់មានសិស្សក្នុងថ្នាក់ {className} នៅឡើយទេ</h3>
            <p className="text-xs text-slate-500">
              សូមឱ្យសិស្សចុះឈ្មោះតាមរយៈតំណភ្ជាប់ ឬ QR Code ជាមុនសិន។
            </p>
          </div>
        ) : activeTab === "scores" ? (
          /* TAB 1: Scores Input Roster */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>សិស្សានុសិស្ស ({students.length})</span>
              <span>ពិន្ទុ (០ - ១០០)</span>
            </div>

            {students.map((st, index) => (
              <div
                key={st.id}
                className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {st.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{st.id}</span>
                      <span>•</span>
                      <span
                        className={
                          st.gender === "ស្រី"
                            ? "text-pink-600 font-medium"
                            : "text-blue-600 font-medium"
                        }
                      >
                        {st.gender || "មិនបានបញ្ជាក់"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    placeholder="-"
                    value={st.score}
                    onChange={(e) => handleScoreChange(st.id, e.target.value)}
                    className="w-20 sm:w-24 px-3 py-2 text-center text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  />
                  {st.score.trim() !== "" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-200" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TAB 2: Attendance Tracking Roster */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>សិស្ស ({students.length})</span>
              <span>ស្ថានភាពវត្តមាន</span>
            </div>

            {loadingAttendance ? (
              <div className="p-8 text-center space-y-2">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                <p className="text-xs text-slate-500">កំពុងពិនិត្យទិន្នន័យវត្តមាន...</p>
              </div>
            ) : (
              students.map((st, index) => {
                const currentStatus = attendanceMap[st.id]?.status || "present";
                const currentNote = attendanceMap[st.id]?.note || "";

                return (
                  <div
                    key={st.id}
                    className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {st.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{st.id}</span>
                          <span>•</span>
                          <span
                            className={
                              st.gender === "ស្រី"
                                ? "text-pink-600 font-medium"
                                : "text-blue-600 font-medium"
                            }
                          >
                            {st.gender || "មិនបានបញ្ជាក់"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Controls */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {/* 3 Status Buttons */}
                      <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "present")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            currentStatus === "present"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>វត្តមាន</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "permission")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            currentStatus === "permission"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ច្បាប់</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "absent")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            currentStatus === "absent"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>អវត្តមាន</span>
                        </button>
                      </div>

                      {/* Optional Note */}
                      <input
                        type="text"
                        placeholder="ចំណាំ..."
                        value={currentNote}
                        onChange={(e) => handleNoteChange(st.id, e.target.value)}
                        className="w-24 sm:w-32 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar */}
      {!loading && students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 shadow-lg z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-slate-600 hidden sm:block">
              {activeTab === "scores" ? (
                <>
                  <span>បានបំពេញពិន្ទុ៖ </span>
                  <strong className="text-slate-900">{enteredScoresCount}</strong> លើ{" "}
                  <strong className="text-slate-900">{students.length}</strong> នាក់
                </>
              ) : (
                <>
                  <span>វត្តមានថ្ងៃទី </span>
                  <strong className="text-slate-900">{attendanceDate}</strong>៖{" "}
                  <span className="text-emerald-700 font-bold">{presentCount} មាន</span> •{" "}
                  <span className="text-amber-700 font-bold">{permissionCount} ច្បាប់</span> •{" "}
                  <span className="text-rose-700 font-bold">{absentCount} អវត្តមាន</span>
                </>
              )}
            </div>

            {activeTab === "scores" ? (
              <button
                onClick={handleSaveScores}
                disabled={savingScores}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              >
                {savingScores ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>កំពុងរក្សាទុក...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>រក្សាទុកពិន្ទុ</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              >
                {savingAttendance ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>កំពុងរក្សាទុកវត្តមាន...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>រក្សាទុកវត្តមាន</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubjectInputPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SubjectInputContent />
    </Suspense>
  );
}
