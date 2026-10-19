"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  User,
  Phone,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  UserPlus,
  Lock,
  ArrowLeft,
  Home,
  UserCheck,
} from "lucide-react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const sheetId = searchParams.get("sheetId");
  const presetClass = searchParams.get("class");

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"ប្រុស" | "ស្រី">("ប្រុស");
  const [phone, setPhone] = useState("");
  const [className, setClassName] = useState(presetClass || "");
  const [note, setNote] = useState("");

  // Sync presetClass if URL changes
  useEffect(() => {
    if (presetClass) {
      setClassName(presetClass);
    }
  }, [presetClass]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredStudent, setRegisteredStudent] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetId) {
      setError("មិនមានព័ត៌មាន Sheet ID ទេ។ សូមទាក់ទងលោកគ្រូអ្នកគ្រូដើម្បីសុំ Link ត្រឹមត្រូវ។");
      return;
    }

    if (!name.trim() || !phone.trim() || !className.trim()) {
      setError("សូមបំពេញព័ត៌មានដែលចាំបាច់ទាំងអស់ (ឈ្មោះ, លេខទូរស័ព្ទ, ថ្នាក់)!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          name: name.trim(),
          gender,
          phone: phone.trim(),
          className: className.trim(),
          note: note.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "បរាជ័យក្នុងការចុះឈ្មោះ");
      }

      setRegisteredStudent(data.student);
      // Reset form
      setName("");
      setPhone("");
      setNote("");
    } catch (err: any) {
      setError(err.message || "មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត");
    } finally {
      setLoading(false);
    }
  };

  if (!sheetId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            មិនទាន់មាន Link ត្រឹមត្រូវ
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            តំណភ្ជាប់នេះមិនមានលេខសម្គាល់ Sheet ID ទេ។ សូមទាក់ទងលោកគ្រូ ឬអ្នកគ្រូរបស់អ្នកដើម្បីសុំ Link ឬ Scan QR Code ម្ដងទៀត។
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 py-4 sm:py-8 px-4 pb-20 flex flex-col items-center justify-center" suppressHydrationWarning>
      <div className="max-w-md w-full space-y-4 sm:space-y-6">
        {/* Top Back Action Bar (Image 1 fix) */}
        <div className="flex items-center justify-between w-full">
          <Link
            href={
              className
                ? `/grades?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(className)}`
                : `/?sheetId=${encodeURIComponent(sheetId)}`
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs font-semibold text-xs transition-all active:scale-95"
            title="ត្រឡប់ក្រោយ"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>ត្រឡប់ក្រោយ</span>
          </Link>

          <Link
            href={`/?sheetId=${encodeURIComponent(sheetId)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 shadow-xs font-semibold text-xs transition-all active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600" />
            <span>ទំព័រដើម</span>
          </Link>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden shadow-xl shadow-emerald-600/25 relative border border-slate-200/80 bg-white">
            <Image
              src="/images/app-logo.png"
              alt="Logo"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            ទម្រង់ចុះឈ្មោះសិស្ស
          </h1>
          <p className="text-xs text-slate-500">
            សូមបំពេញព័ត៌មានខាងក្រោមដើម្បីចុះឈ្មោះចូលរៀន
          </p>
        </div>

        {/* Success Card */}
        {registeredStudent ? (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                ជោគជ័យ
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                ចុះឈ្មោះបានជោគជ័យ!
              </h2>
              <p className="text-xs text-slate-500">
                ព័ត៌មានរបស់អ្នកត្រូវបានកត់ត្រាចូលក្នុងប្រព័ន្ធរួចរាល់ហើយ
              </p>
            </div>

            {/* Student ID Badge */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2 text-left">
              <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                <span className="text-xs text-emerald-800 font-medium">លេខសម្គាល់ ID៖</span>
                <span className="text-sm font-mono font-bold text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  {registeredStudent.id}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">ឈ្មោះសិស្ស៖</span>
                <span className="font-semibold text-slate-900">{registeredStudent.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">ភេទ៖</span>
                <span className="font-semibold text-slate-900">{registeredStudent.gender}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">ថ្នាក់រៀន៖</span>
                <span className="font-semibold text-slate-900">{registeredStudent.className}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setRegisteredStudent(null)}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-98 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>ចុះឈ្មោះសិស្សម្នាក់ទៀត</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href={`/grades?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
                    registeredStudent.className || className
                  )}`}
                  className="py-2.5 px-2 sm:px-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 text-[11px] sm:text-xs active:scale-98 truncate"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">តារាងពិន្ទុ</span>
                </Link>

                <Link
                  href={`/attendance?sheetId=${encodeURIComponent(sheetId)}&class=${encodeURIComponent(
                    registeredStudent.className || className
                  )}`}
                  className="py-2.5 px-2 sm:px-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 text-[11px] sm:text-xs active:scale-98 truncate"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">តារាងវត្តមាន</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Input Form Card */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ឈ្មោះពេញ (សិស្ស) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. សុខ សំណាង"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm placeholder:text-slate-400"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ភេទ *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("ប្រុស")}
                    className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                      gender === "ប្រុស"
                        ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span>ប្រុស (Male)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("ស្រី")}
                    className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                      gender === "ស្រី"
                        ? "bg-pink-50 border-pink-500 text-pink-700 font-bold shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <User className="w-4 h-4 text-pink-600" />
                    <span>ស្រី (Female)</span>
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>លេខទូរស័ព្ទ (សិស្ស ឬអាណាព្យាបាល) *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ឧ. 012 345 678"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono placeholder:text-slate-400"
                />
              </div>

              {/* Class / Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ថ្នាក់រៀន / មុខវិជ្ជា *</span>
                  </span>
                  {presetClass && (
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span>ថ្នាក់ {presetClass}</span>
                    </span>
                  )}
                </label>
                {presetClass ? (
                  <div className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-emerald-300 text-sm font-bold text-emerald-900 flex items-center justify-between">
                    <span>ថ្នាក់៖ {presetClass}</span>
                    <span className="text-xs text-emerald-600 font-normal">បានកំណត់ដោយស្វ័យប្រវត្តិ</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="ឧ. 12A, 12B ឬ ភាសាអង់គ្លេស"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm placeholder:text-slate-400"
                  />
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ចំណាំបន្ថែម (បើមាន)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ព័ត៌មានបន្ថែមផ្សេងៗ..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm placeholder:text-slate-400 resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 transition-colors shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>កំពុងរក្សាទុក...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ចុះឈ្មោះចូលរៀន</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400">
          ប្រព័ន្ធកត់វត្តមានសិស្សដោយស្វ័យប្រវត្តិ • ភ្ជាប់ជាមួយ Google Sheet
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
