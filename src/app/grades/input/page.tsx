"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface StudentScoreItem {
  id: string;
  name: string;
  gender: string;
  score: string;
}

function SubjectInputContent() {
  const searchParams = useSearchParams();
  const sheetId = searchParams.get("sheetId") || "";
  const className = searchParams.get("class") || "12A";
  const month = searchParams.get("month") || "តុលា";
  const subject = searchParams.get("subject") || "គណិតវិទ្យា";

  const [students, setStudents] = useState<StudentScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        const studentItems: StudentScoreItem[] = matrix.students.map((st: any) => ({
          id: st.studentId,
          name: st.studentName,
          gender: st.gender,
          score:
            st.scores && st.scores[subject] !== undefined && st.scores[subject] !== ""
              ? String(st.scores[subject])
              : "",
        }));

        setStudents(studentItems);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sheetId, className, month, subject]);

  const handleScoreChange = (id: string, value: string) => {
    // Only allow numbers and decimal point
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    const num = parseFloat(value);
    if (!isNaN(num) && (num < 0 || num > 100)) return;

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, score: value } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  const enteredCount = students.filter((s) => s.score.trim() !== "").length;
  const percentage = students.length > 0 ? Math.round((enteredCount / students.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">
                បញ្ចូលពិន្ទុមុខវិជ្ជា
              </h1>
              <p className="text-xs text-slate-500">
                សម្រាប់គ្រូប្រចាំមុខវិជ្ជា
              </p>
            </div>
          </div>

          <Link
            href={`/grades?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
              className
            )}&month=${encodeURIComponent(month)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>តារាងរួម</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        {/* Subject & Class Information Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-emerald-600 tracking-wide uppercase">
                មុខវិជ្ជា
              </span>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-emerald-600" />
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

          {/* Progress Bar */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
              <span>ស្ថានភាពបញ្ចូលពិន្ទុ៖</span>
              <span className="font-bold text-slate-800">
                {enteredCount} / {students.length} នាក់ ({percentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
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
        ) : (
          /* Students Roster with Score Inputs */
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
                      <span className={st.gender === "ស្រី" ? "text-pink-600 font-medium" : "text-blue-600 font-medium"}>
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
        )}
      </main>

      {/* Floating Save Bar */}
      {!loading && students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 shadow-lg z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-slate-600 hidden sm:block">
              <span>បានបំពេញ៖ </span>
              <strong className="text-slate-900">{enteredCount}</strong> លើ{" "}
              <strong className="text-slate-900">{students.length}</strong> នាក់
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              {saving ? (
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
