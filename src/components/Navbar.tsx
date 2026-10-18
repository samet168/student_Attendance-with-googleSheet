"use client";

import Link from "next/link";
import { BookOpen, UserCheck, Settings, FileSpreadsheet } from "lucide-react";

interface NavbarProps {
  sheetId?: string;
  sheetTitle?: string;
}

export default function Navbar({ sheetId, sheetTitle }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200" suppressHydrationWarning>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span>វត្តមានសិស្ស</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Google Sheet
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              ប្រព័ន្ធកត់វត្តមាន និងចុះឈ្មោះសិស្ស
            </p>
          </div>
        </Link>

        {sheetId && (
          <nav className="flex items-center gap-2">
            <Link
              href={`/attendance?sheetId=${encodeURIComponent(sheetId)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>កត់វត្តមាន</span>
            </Link>

            <Link
              href={`/register?sheetId=${encodeURIComponent(sheetId)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <span>ទំព័រសិស្ស</span>
            </Link>

            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors title='បើក Google Sheet'"
              title="បើក Google Sheet"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
