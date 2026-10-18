"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  UserCheck,
  FileSpreadsheet,
  GraduationCap,
  Home,
  UserPlus,
} from "lucide-react";

interface NavbarProps {
  sheetId?: string;
  sheetTitle?: string;
}

export default function Navbar({ sheetId }: NavbarProps) {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isAttendance = pathname.startsWith("/attendance");
  const isGrades = pathname.startsWith("/grades");
  const isRegister = pathname.startsWith("/register");

  return (
    <>
      {/* Top Header */}
      <header
        className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200"
        suppressHydrationWarning
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform flex-shrink-0 relative border border-slate-200/60 bg-white">
              <Image
                src="/images/app-logo.png"
                alt="វត្តមាន & ពិន្ទុ Logo"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight flex items-center gap-2 text-sm sm:text-base">
                <span>វត្តមាន & ពិន្ទុ</span>
                <span className="text-[10px] sm:text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Google Sheet
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                ប្រព័ន្ធគ្រប់គ្រងសិស្ស វត្តមាន និងពិន្ទុ
              </p>
            </div>
          </Link>

          {sheetId && (
            <div className="flex items-center gap-2">
              {/* Desktop Nav Items */}
              <nav className="hidden md:flex items-center gap-2">
                <Link
                  href={`/attendance?sheetId=${encodeURIComponent(sheetId)}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors shadow-xs ${
                    isAttendance
                      ? "bg-emerald-600 text-white"
                      : "text-slate-700 bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>កត់វត្តមាន</span>
                </Link>

                <Link
                  href={`/grades?sheetId=${encodeURIComponent(sheetId)}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border shadow-xs ${
                    isGrades
                      ? "bg-purple-600 text-white border-purple-600"
                      : "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>ពិន្ទុ & ចំណាត់ថ្នាក់</span>
                </Link>

                <Link
                  href={`/register?sheetId=${encodeURIComponent(sheetId)}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ទំព័រសិស្ស</span>
                </Link>
              </nav>

              {/* Sheet Link */}
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-slate-200 md:border-transparent"
                title="បើក Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Bottom App Navigation Bar (Native App Style) */}
      {sheetId && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1 px-3 flex items-center justify-around md:hidden shadow-lg">
          {/* Tab 1: Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isHome
                ? "text-emerald-600 font-bold"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <div className={`p-1 rounded-lg ${isHome ? "bg-emerald-50" : ""}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">ផ្ទាំងដើម</span>
          </Link>

          {/* Tab 2: Attendance */}
          <Link
            href={`/attendance?sheetId=${encodeURIComponent(sheetId)}`}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isAttendance
                ? "text-emerald-600 font-bold"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <div className={`p-1 rounded-lg ${isAttendance ? "bg-emerald-50" : ""}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">វត្តមាន</span>
          </Link>

          {/* Tab 3: Grades & Ranking */}
          <Link
            href={`/grades?sheetId=${encodeURIComponent(sheetId)}`}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isGrades
                ? "text-purple-600 font-bold"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <div className={`p-1 rounded-lg ${isGrades ? "bg-purple-50" : ""}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">ពិន្ទុ</span>
          </Link>

          {/* Tab 4: Register Portal */}
          <Link
            href={`/register?sheetId=${encodeURIComponent(sheetId)}`}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isRegister
                ? "text-emerald-600 font-bold"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <div className={`p-1 rounded-lg ${isRegister ? "bg-emerald-50" : ""}`}>
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">ចុះឈ្មោះ</span>
          </Link>
        </nav>
      )}
    </>
  );
}
